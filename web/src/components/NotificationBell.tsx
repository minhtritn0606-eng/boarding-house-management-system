import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { notificationApi, type AppNotification } from '../services/api'
import { useAuth } from '../context/AuthContext'

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    if (diffMs < 0) return 'Vừa xong'
    const diffMin = Math.floor(diffMs / (1000 * 60))
    if (diffMin < 1) return 'Vừa xong'
    if (diffMin < 60) return `${diffMin} phút trước`
    const diffHours = Math.floor(diffMin / 60)
    if (diffHours < 24) return `${diffHours} giờ trước`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays === 1) return 'Hôm qua'
    if (diffDays < 7) return `${diffDays} ngày trước`
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
  } catch {
    return dateStr
  }
}

type NotificationCategory = 'appointment' | 'rejected' | 'approved' | 'pending' | 'system'

function NotificationTypeIcon({ type }: { type: NotificationCategory }) {
  if (type === 'appointment') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    )
  }
  if (type === 'rejected') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    )
  }
  if (type === 'approved') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    )
  }
  if (type === 'pending') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    )
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

export default function NotificationBell() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeFilter, setActiveFilter] = useState<'all' | 'appointment' | 'rejected' | 'approved'>('all')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = async () => {
    if (!isAuthenticated) return
    try {
      setLoading(true)
      const data = await notificationApi.getNotifications(30)
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch (err) {
      console.error('Không thể tải thông báo:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications()

      const handleUpdate = () => {
        fetchNotifications()
      }

      window.addEventListener('notification-updated', handleUpdate)
      window.addEventListener('appointment-updated', handleUpdate)

      // Cập nhật ngầm mỗi 45 giây
      const interval = setInterval(fetchNotifications, 45000)

      return () => {
        window.removeEventListener('notification-updated', handleUpdate)
        window.removeEventListener('appointment-updated', handleUpdate)
        clearInterval(interval)
      }
    }
  }, [isAuthenticated])

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleMarkAsRead = async (item: AppNotification) => {
    const isUnread = !item.is_read || item.is_read === 0
    if (isUnread) {
      try {
        await notificationApi.markAsRead(item.id)
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      } catch (err) {
        console.error('Lỗi đánh dấu đã đọc:', err)
      }
    }

    setIsOpen(false)
    navigate(`/notifications?id=${item.id}`)
  }

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Lỗi đánh dấu tất cả đã đọc:', err)
    }
  }

  const counts = useMemo(() => {
    let appointment = 0
    let rejected = 0
    let approved = 0
    for (const n of notifications) {
      const t = (n.title || '').toLowerCase()
      if (n.type === 'appointment' || t.includes('lịch hẹn') || t.includes('xem phòng')) {
        appointment++
      } else if (n.type === 'rejected' || t.includes('từ chối') || t.includes('tạm dừng')) {
        rejected++
      } else if (n.type === 'approved' || t.includes('duyệt')) {
        approved++
      }
    }
    return { all: notifications.length, appointment, rejected, approved }
  }, [notifications])

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'appointment') {
      return notifications.filter(
        (n) => n.type === 'appointment' || n.title.toLowerCase().includes('lịch hẹn') || n.title.toLowerCase().includes('xem phòng')
      )
    }
    if (activeFilter === 'rejected') {
      return notifications.filter(
        (n) => n.type === 'rejected' || n.title.toLowerCase().includes('từ chối') || n.title.toLowerCase().includes('tạm dừng')
      )
    }
    if (activeFilter === 'approved') {
      return notifications.filter(
        (n) => n.type === 'approved' || n.title.toLowerCase().includes('duyệt')
      )
    }
    return notifications
  }, [notifications, activeFilter])

  const getNotificationMeta = (type?: string, title?: string): {
    iconType: NotificationCategory
    iconBg: string
    iconColor: string
  } => {
    const lowerTitle = (title || '').toLowerCase()
    if (type === 'appointment' || lowerTitle.includes('lịch hẹn') || lowerTitle.includes('xem phòng')) {
      return {
        iconType: 'appointment',
        iconBg: '#eff6ff',
        iconColor: '#2563eb',
      }
    }
    if (type === 'rejected' || lowerTitle.includes('từ chối') || lowerTitle.includes('tạm dừng')) {
      return {
        iconType: 'rejected',
        iconBg: '#fff1f2',
        iconColor: '#e11d48',
      }
    }
    if (type === 'approved' || lowerTitle.includes('đã duyệt') || lowerTitle.includes('thành công')) {
      return {
        iconType: 'approved',
        iconBg: '#ecfdf5',
        iconColor: '#059669',
      }
    }
    if (type === 'pending' || lowerTitle.includes('chờ duyệt') || lowerTitle.includes('xác minh')) {
      return {
        iconType: 'pending',
        iconBg: '#fffbeb',
        iconColor: '#d97706',
      }
    }
    return {
      iconType: 'system',
      iconBg: '#f8fafc',
      iconColor: '#64748b',
    }
  }

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button
        type="button"
        className={`notification-bell-btn ${unreadCount > 0 ? 'has-unread' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        title="Thông báo tài khoản"
        aria-label="Thông báo tài khoản"
      >
        <svg
          className="bell-icon"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          {/* Header */}
          <div className="notification-dropdown-header">
            <div className="header-title-box">
              <span className="header-title">Thông báo</span>
              {unreadCount > 0 && (
                <span className="pending-pill">{unreadCount} mới</span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                className="btn-mark-all-read"
                onClick={handleMarkAllAsRead}
                title="Đánh dấu tất cả là đã đọc"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Đánh dấu đã đọc</span>
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="notification-filter-tabs">
            <button
              type="button"
              className={`notif-tab ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              Tất cả ({counts.all})
            </button>
            <button
              type="button"
              className={`notif-tab ${activeFilter === 'appointment' ? 'active' : ''}`}
              onClick={() => setActiveFilter('appointment')}
            >
              Lịch hẹn {counts.appointment > 0 ? `(${counts.appointment})` : ''}
            </button>
            <button
              type="button"
              className={`notif-tab ${activeFilter === 'rejected' ? 'active' : ''}`}
              onClick={() => setActiveFilter('rejected')}
            >
              Bị từ chối {counts.rejected > 0 ? `(${counts.rejected})` : ''}
            </button>
            <button
              type="button"
              className={`notif-tab ${activeFilter === 'approved' ? 'active' : ''}`}
              onClick={() => setActiveFilter('approved')}
            >
              Đã duyệt {counts.approved > 0 ? `(${counts.approved})` : ''}
            </button>
          </div>

          {/* Body List */}
          <div className="notification-dropdown-body">
            {loading && notifications.length === 0 ? (
              <div className="notification-empty">
                <p className="empty-sub">Đang tải thông báo...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="notification-empty">
                <div className="empty-bell-icon">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </div>
                <p className="empty-title">Không có thông báo nào</p>
                <p className="empty-sub">
                  Bạn chưa có thông báo mới trong danh mục này.
                </p>
              </div>
            ) : (
              <div className="notification-list">
                {filteredNotifications.map((item) => {
                  const meta = getNotificationMeta(item.type, item.title)
                  const isUnread = !item.is_read || item.is_read === 0

                  return (
                    <div
                      key={item.id}
                      className={`notification-item ${isUnread ? 'is-unread' : ''}`}
                      onClick={() => handleMarkAsRead(item)}
                    >
                      <div
                        className="item-icon-wrapper"
                        style={{ background: meta.iconBg, color: meta.iconColor }}
                      >
                        <NotificationTypeIcon type={meta.iconType} />
                      </div>

                      <div className="item-content">
                        <div className="item-top-row">
                          <span className="item-title">{item.title}</span>
                          <span className="item-time">
                            {formatRelativeTime(item.created_at)}
                          </span>
                        </div>

                        <p className="item-message">{item.message}</p>
                      </div>

                      {isUnread && <span className="unread-dot" title="Chưa đọc" />}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="notification-dropdown-footer">
            <button
              type="button"
              className="btn-view-all-appointments"
              onClick={() => {
                setIsOpen(false)
                navigate('/notifications')
              }}
            >
              <span>Mở trang thông báo chi tiết</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
