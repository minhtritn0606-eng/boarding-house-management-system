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

  const getNotificationStyle = (type?: string, title?: string) => {
    const lowerTitle = (title || '').toLowerCase()
    if (type === 'appointment' || lowerTitle.includes('lịch hẹn') || lowerTitle.includes('xem phòng')) {
      return {
        tagText: 'Lịch hẹn xem',
        tagBg: '#eff6ff',
        tagColor: '#1d4ed8',
        borderLeft: '3px solid #3b82f6',
      }
    }
    if (type === 'rejected' || lowerTitle.includes('từ chối') || lowerTitle.includes('tạm dừng')) {
      return {
        tagText: 'Từ chối duyệt',
        tagBg: '#fee2e2',
        tagColor: '#991b1b',
        borderLeft: '3px solid #ef4444',
      }
    }
    if (type === 'approved' || lowerTitle.includes('đã duyệt') || lowerTitle.includes('thành công')) {
      return {
        tagText: 'Đã duyệt',
        tagBg: '#dcfce7',
        tagColor: '#166534',
        borderLeft: '3px solid #10b981',
      }
    }
    if (type === 'pending' || lowerTitle.includes('chờ duyệt') || lowerTitle.includes('xác minh')) {
      return {
        tagText: 'Chờ duyệt',
        tagBg: '#fef3c7',
        tagColor: '#b45309',
        borderLeft: '3px solid #f59e0b',
      }
    }
    return {
      tagText: 'Thông báo',
      tagBg: '#eff6ff',
      tagColor: '#1d4ed8',
      borderLeft: '3px solid #3b82f6',
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
              >
                Đánh dấu đã đọc
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
              Tất cả ({notifications.length})
            </button>
            <button
              type="button"
              className={`notif-tab ${activeFilter === 'appointment' ? 'active' : ''}`}
              onClick={() => setActiveFilter('appointment')}
            >
              Lịch hẹn
            </button>
            <button
              type="button"
              className={`notif-tab ${activeFilter === 'rejected' ? 'active' : ''}`}
              onClick={() => setActiveFilter('rejected')}
            >
              Bị từ chối
            </button>
            <button
              type="button"
              className={`notif-tab ${activeFilter === 'approved' ? 'active' : ''}`}
              onClick={() => setActiveFilter('approved')}
            >
              Đã duyệt
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
                <p className="empty-title">Không có thông báo nào</p>
                <p className="empty-sub">
                  Kết quả kiểm duyệt bài đăng và cập nhật hệ thống sẽ xuất hiện tại đây.
                </p>
              </div>
            ) : (
              <div className="notification-list">
                {filteredNotifications.map((item) => {
                  const styleConfig = getNotificationStyle(item.type, item.title)
                  const isUnread = !item.is_read || item.is_read === 0

                  return (
                    <div
                      key={item.id}
                      className={`notification-item ${isUnread ? 'is-unread' : ''}`}
                      style={{ borderLeft: styleConfig.borderLeft }}
                      onClick={() => handleMarkAsRead(item)}
                      title="Nhấn để xem chi tiết"
                    >
                      <div className="item-content">
                        <div className="item-header-line">
                          <span
                            className="item-status-tag"
                            style={{ background: styleConfig.tagBg, color: styleConfig.tagColor }}
                          >
                            {styleConfig.tagText}
                          </span>
                          <span className="item-time">
                            {formatRelativeTime(item.created_at)}
                          </span>
                        </div>

                        <strong className="item-title">{item.title}</strong>

                        <p className="item-message">{item.message}</p>

                        <div className="item-action-hint">
                          Bấm để xem nội dung đầy đủ &rarr;
                        </div>
                      </div>

                      {isUnread && <span className="unread-dot" title="Chưa đọc"></span>}
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
              Mở trang thông báo chi tiết &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
