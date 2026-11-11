import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { notificationApi, type AppNotification } from '../services/api'
import { useAuth } from '../context/AuthContext'

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function formatDisplayDate(dateStr?: string): string {
  if (!dateStr) return '—'
  try {
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    return dateStr
  } catch {
    return dateStr
  }
}

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
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function parseAppointmentDetails(message: string) {
  let visitorName = ''
  let phone = ''
  let roomTitle = ''
  let date = ''
  let timeSlot = ''
  let note = ''

  const visitorPhoneMatch = message.match(/Khách hàng\s+([^(]+?)\s*\(SĐT:\s*([0-9\s+]+)\)/i)
  if (visitorPhoneMatch) {
    visitorName = visitorPhoneMatch[1].trim()
    phone = visitorPhoneMatch[2].trim()
  }

  const roomMatch = message.match(/phòng\s*["“]([^"”]+)["”]/i)
  if (roomMatch) {
    roomTitle = roomMatch[1].trim()
  }

  const dateMatch = message.match(/ngày\s+([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{4})/i)
  if (dateMatch) {
    date = dateMatch[1].trim()
    const afterDate = message.slice(message.indexOf(dateMatch[0]) + dateMatch[0].length)
    const openIdx = afterDate.indexOf('(')
    if (openIdx !== -1) {
      const noteIdx = afterDate.indexOf('Ghi chú:')
      const timeSubstring = noteIdx !== -1 ? afterDate.slice(openIdx + 1, noteIdx) : afterDate.slice(openIdx + 1)
      timeSlot = timeSubstring.replace(/\s*\)\.?\s*$/, '').trim()
    }
  }

  const noteMatch = message.match(/Ghi chú:\s*([^\n\r]+)/i)
  if (noteMatch) {
    note = noteMatch[1].trim()
  }

  return { visitorName, phone, roomTitle, date, timeSlot, note }
}

interface BadgeConfig {
  text: string
  bg: string
  color: string
  border: string
}

function getBadgeConfig(type?: string, title?: string): BadgeConfig {
  const lower = (title || '').toLowerCase()
  if (type === 'appointment' || lower.includes('lịch hẹn') || lower.includes('xem phòng')) {
    return {
      text: 'Lịch hẹn xem phòng',
      bg: '#eff6ff',
      color: '#1d4ed8',
      border: '#bfdbfe',
    }
  }
  if (type === 'rejected' || lower.includes('từ chối') || lower.includes('tạm dừng')) {
    return {
      text: 'Bị từ chối duyệt',
      bg: '#fee2e2',
      color: '#991b1b',
      border: '#fecaca',
    }
  }
  if (type === 'approved' || lower.includes('đã duyệt') || lower.includes('thành công')) {
    return {
      text: 'Đã phê duyệt',
      bg: '#dcfce7',
      color: '#166534',
      border: '#bbf7d0',
    }
  }
  if (type === 'pending' || lower.includes('chờ duyệt') || lower.includes('xác minh')) {
    return {
      text: 'Đang chờ duyệt',
      bg: '#fef3c7',
      color: '#b45309',
      border: '#fde68a',
    }
  }
  return {
    text: 'Thông báo hệ thống',
    bg: '#f8fafc',
    color: '#475569',
    border: '#e2e8f0',
  }
}

/**
 * Component hiển thị 1 thẻ thông báo có cử chỉ kéo/vuốt sang trái để xóa
 */
interface SwipeableNotificationItemProps {
  item: AppNotification
  isSelected: boolean
  isDeleting: boolean
  badge: BadgeConfig
  onSelect: () => void
  onDelete: (id: number) => void
}

function SwipeableNotificationItem({
  item,
  isSelected,
  isDeleting,
  badge,
  onSelect,
  onDelete,
}: SwipeableNotificationItemProps) {
  const [translateX, setTranslateX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const isPointerDownRef = useRef(false)
  const startXRef = useRef(0)
  const startYRef = useRef(0)
  const directionRef = useRef<'horizontal' | 'vertical' | null>(null)
  const hasMovedRef = useRef(false)
  const currentTranslateRef = useRef(0)

  // Giữ ref đồng bộ để dùng trong event handlers
  useEffect(() => {
    currentTranslateRef.current = translateX
  }, [translateX])

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Chỉ xử lý chuột trái hoặc chạm cảm ứng
    if (e.button !== 0) return
    isPointerDownRef.current = true
    startXRef.current = e.clientX
    startYRef.current = e.clientY
    directionRef.current = null
    hasMovedRef.current = false
    setIsDragging(false)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current) return
    const diffX = e.clientX - startXRef.current
    const diffY = e.clientY - startYRef.current

    if (directionRef.current === null) {
      // Phân biệt vuốt ngang (kéo xóa) hay cuộn dọc (lướt danh sách)
      if (Math.abs(diffY) > 8 && Math.abs(diffY) > Math.abs(diffX)) {
        directionRef.current = 'vertical'
        isPointerDownRef.current = false
        return
      }
      if (diffX < -6 && Math.abs(diffX) > Math.abs(diffY)) {
        directionRef.current = 'horizontal'
        hasMovedRef.current = true
        setIsDragging(true)
        try {
          e.currentTarget.setPointerCapture(e.pointerId)
        } catch { }
      }
    }

    if (directionRef.current === 'horizontal') {
      e.preventDefault()
      // Chỉ cho kéo sang trái
      let offset = diffX
      if (offset > 0) offset = 0
      if (offset < -120) {
        // Lực cản đàn hồi khi kéo quá xa
        offset = -120 + (offset + 120) * 0.25
      }
      setTranslateX(offset)
    }
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current && directionRef.current !== 'horizontal') return
    isPointerDownRef.current = false

    if (directionRef.current === 'horizontal') {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch { }

      setIsDragging(false)

      // Nếu kéo hết biên độ (> 110px) -> Xóa ngay lập tức!
      if (currentTranslateRef.current < -110) {
        setTranslateX(-360)
        setTimeout(() => onDelete(item.id), 120)
        return
      }

      // Nếu kéo vừa phải (> 45px) -> Giữ mở ở -75px để hiện nút xóa
      if (currentTranslateRef.current < -45) {
        setTranslateX(-75)
        return
      }

      // Kéo quá nhẹ -> Đàn hồi trở lại vị trí ban đầu
      setTranslateX(0)
      return
    }

    // Nhấp chuột / chạm thông thường không kéo
    if (!hasMovedRef.current) {
      if (currentTranslateRef.current !== 0) {
        setTranslateX(0)
      } else {
        onSelect()
      }
    }
  }

  const handlePointerCancel = () => {
    isPointerDownRef.current = false
    setIsDragging(false)
    setTranslateX(0)
  }

  const isUnread = !item.is_read || item.is_read === 0

  return (
    <div className={`swipe-item-wrapper ${isDeleting ? 'is-deleting' : ''}`}>
      {/* Lớp nền đỏ lộ ra khi kéo sang trái */}
      <div
        className="swipe-action-reveal"
        onClick={(e) => {
          e.stopPropagation()
          onDelete(item.id)
        }}
        title="Nhấp để xóa thông báo"
      >
        <button
          type="button"
          className="swipe-delete-trigger-btn"
          aria-label="Xóa thông báo"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
          <span>Xóa</span>
        </button>
      </div>

      {/* Thẻ thông báo phía trước có thể kéo */}
      <div
        className={`swipe-card-front ${isUnread ? 'is-unread' : ''} ${isSelected ? 'is-selected' : ''} ${isDragging ? 'is-dragging' : ''}`}
        style={{
          transform: `translateX(${translateX}px)`,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {/* Nút xóa nhanh khi rê chuột trên desktop */}
        <button
          type="button"
          className="quick-hover-delete-btn"
          title="Xóa thông báo này"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(item.id)
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>

        {/* Dòng tag và thời gian */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.3px',
              padding: '2px 7px',
              borderRadius: '4px',
              background: badge.bg,
              color: badge.color,
              border: `1px solid ${badge.border}`,
            }}
          >
            {badge.text}
          </span>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', paddingRight: '20px' }}>
            {formatRelativeTime(item.created_at)}
          </span>
        </div>

        {/* Tiêu đề thông báo */}
        <div
          style={{
            fontSize: '0.88rem',
            fontWeight: isUnread ? 700 : 600,
            color: '#0f172a',
            marginBottom: '4px',
            lineHeight: 1.35,
            textAlign: 'left',
          }}
        >
          {item.title}
        </div>

        {/* Trích đoạn nội dung */}
        <div
          style={{
            fontSize: '0.78rem',
            color: '#64748b',
            lineHeight: 1.45,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            textAlign: 'left',
          }}
        >
          {item.message}
        </div>
      </div>
    </div>
  )
}

export default function NotificationsPage() {
  const { isAuthenticated, user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'appointment' | 'rejected' | 'approved'>('all')
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const fetchNotifications = async () => {
    if (!isAuthenticated) return
    try {
      setLoading(true)
      const data = await notificationApi.getNotifications(60)
      setNotifications(data.notifications || [])
    } catch (err) {
      console.error('Không thể tải thông báo:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [isAuthenticated])

  // Lấy ID thông báo từ URL query nếu có (ví dụ: /notifications?id=12)
  useEffect(() => {
    const idParam = searchParams.get('id')
    if (idParam) {
      setSelectedId(Number(idParam))
    }
  }, [searchParams])

  // Đặt thông báo đầu tiên làm mặc định khi danh sách tải xong
  useEffect(() => {
    if (!selectedId && notifications.length > 0) {
      setSelectedId(notifications[0].id)
    }
  }, [notifications, selectedId])

  const selectedNotification = useMemo(() => {
    return notifications.find((n) => n.id === selectedId) || notifications[0] || null
  }, [notifications, selectedId])

  // Đánh dấu đã đọc khi xem chi tiết
  useEffect(() => {
    if (selectedNotification && (!selectedNotification.is_read || selectedNotification.is_read === 0)) {
      notificationApi.markAsRead(selectedNotification.id).catch(() => { })
      setNotifications((prev) =>
        prev.map((n) => (n.id === selectedNotification.id ? { ...n, is_read: true } : n))
      )
      window.dispatchEvent(new CustomEvent('notification-updated'))
    }
  }, [selectedNotification])

  const handleSelectNotification = async (item: AppNotification) => {
    setSelectedId(item.id)
    setSearchParams({ id: String(item.id) })

    if (!item.is_read || item.is_read === 0) {
      try {
        await notificationApi.markAsRead(item.id)
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
        )
        window.dispatchEvent(new CustomEvent('notification-updated'))
      } catch (e) { }
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      window.dispatchEvent(new CustomEvent('notification-updated'))
    } catch (err) {
      console.error('Lỗi đánh dấu tất cả đã đọc:', err)
    }
  }

  // Xóa thông báo với hiệu ứng trượt mượt mà
  const handleDeleteNotification = async (id: number) => {
    setDeletingId(id)

    setTimeout(async () => {
      setNotifications((prev) => {
        const remaining = prev.filter((n) => n.id !== id)
        if (selectedId === id) {
          if (remaining.length > 0) {
            setSelectedId(remaining[0].id)
            setSearchParams({ id: String(remaining[0].id) })
          } else {
            setSelectedId(null)
            setSearchParams({})
          }
        }
        return remaining
      })
      setDeletingId(null)

      try {
        await notificationApi.deleteNotification(id)
        window.dispatchEvent(new CustomEvent('notification-updated'))
      } catch (err) {
        console.error('Lỗi khi xóa thông báo trên máy chủ:', err)
      }
    }, 220)
  }

  const counts = useMemo(() => {
    let unread = 0
    let appointment = 0
    let rejected = 0
    let approved = 0

    notifications.forEach((n) => {
      if (!n.is_read || n.is_read === 0) unread++
      const lower = (n.title || '').toLowerCase()
      if (n.type === 'appointment' || lower.includes('lịch hẹn') || lower.includes('xem phòng')) {
        appointment++
      }
      if (n.type === 'rejected' || lower.includes('từ chối') || lower.includes('tạm dừng')) {
        rejected++
      }
      if (n.type === 'approved' || lower.includes('đã duyệt') || lower.includes('thành công')) {
        approved++
      }
    })

    return { unread, appointment, rejected, approved, total: notifications.length }
  }, [notifications])

  const filteredList = useMemo(() => {
    return notifications.filter((n) => {
      const isUnread = !n.is_read || n.is_read === 0
      const lower = (n.title || '').toLowerCase()
      if (filterType === 'unread') return isUnread
      if (filterType === 'appointment') {
        return n.type === 'appointment' || lower.includes('lịch hẹn') || lower.includes('xem phòng')
      }
      if (filterType === 'rejected') {
        return n.type === 'rejected' || lower.includes('từ chối') || lower.includes('tạm dừng')
      }
      if (filterType === 'approved') {
        return n.type === 'approved' || lower.includes('đã duyệt') || lower.includes('thành công')
      }
      return true
    })
  }, [notifications, filterType])

  if (!isAuthenticated || !user) {
    return (
      <div className="auth-required-box" style={{ margin: '60px auto', textAlign: 'left' }}>
        <div className="auth-required-content">
          <h2>Yêu cầu Đăng nhập</h2>
          <p>Vui lòng đăng nhập để xem toàn bộ hộp thư thông báo của bạn.</p>
          <div className="auth-required-actions">
            <Link to="/login" className="btn-primary">
              Đăng nhập ngay
            </Link>
            <Link to="/" className="btn-secondary">
              Về Trang chủ
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const isSelectedAppointment =
    selectedNotification &&
    (selectedNotification.type === 'appointment' ||
      (selectedNotification.title || '').toLowerCase().includes('lịch hẹn') ||
      (selectedNotification.title || '').toLowerCase().includes('xem phòng'))

  const appointmentDetails = isSelectedAppointment && selectedNotification
    ? parseAppointmentDetails(selectedNotification.message)
    : null

  return (
    <div className="notifications-page-root">
      {/* 1. Header cố định: Bộ lọc & Nút Đánh dấu đã đọc */}
      <div className="notifications-page-header">
        <div className="notifications-filter-pills">
          <button
            type="button"
            className={`notifications-filter-btn ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            Tất cả ({counts.total})
          </button>

          <button
            type="button"
            className={`notifications-filter-btn ${filterType === 'appointment' ? 'active' : ''}`}
            onClick={() => setFilterType('appointment')}
          >
            Lịch xem phòng ({counts.appointment})
          </button>

          <button
            type="button"
            className={`notifications-filter-btn ${filterType === 'unread' ? 'active' : ''}`}
            onClick={() => setFilterType('unread')}
          >
            Chưa đọc ({counts.unread})
          </button>

          <button
            type="button"
            className={`notifications-filter-btn ${filterType === 'rejected' ? 'active' : ''}`}
            onClick={() => setFilterType('rejected')}
          >
            Bị từ chối ({counts.rejected})
          </button>

          <button
            type="button"
            className={`notifications-filter-btn ${filterType === 'approved' ? 'active' : ''}`}
            onClick={() => setFilterType('approved')}
          >
            Đã duyệt ({counts.approved})
          </button>
        </div>

        {counts.unread > 0 && (
          <button
            type="button"
            className="notifications-mark-all-btn"
            onClick={handleMarkAllRead}
          >
            Đánh dấu tất cả đã đọc ({counts.unread})
          </button>
        )}
      </div>

      {/* 2. Main 2-Column Split: Trái cuộn độc lập, Phải cố định chi tiết */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b', flex: 1 }}>
          Đang tải danh sách thông báo...
        </div>
      ) : notifications.length === 0 ? (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '60px 20px',
            textAlign: 'center',
            color: '#64748b',
            margin: '20px auto',
            maxWidth: '600px',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📭</div>
          <h3 style={{ margin: '0 0 8px', color: '#1e293b' }}>Hộp thư thông báo đang trống</h3>
          <p style={{ margin: '0 0 16px', fontSize: '0.9rem' }}>
            Mọi thông báo lịch hẹn xem phòng từ khách, kiểm duyệt bài đăng và cập nhật hệ thống sẽ xuất hiện tại đây.
          </p>
          <Link
            to="/my-rooms"
            style={{
              display: 'inline-block',
              background: '#0f172a',
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Quản lý bài đăng của bạn
          </Link>
        </div>
      ) : (
        <div className="notifications-split-view">
          {/* CỘT TRÁI: Danh sách thông báo (Cuộn độc lập, Kéo sang trái để xóa) */}
          <div className="notifications-left-pane">
            <div className="notifications-left-header">
              <span className="notifications-left-header-title">
                Hộp thư ({filteredList.length})
              </span>
              <span className="notifications-left-header-hint" title="Vuốt hoặc kéo thẻ sang trái để xóa thông báo">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
                Kéo sang trái để xóa
              </span>
            </div>

            <div className="notifications-scroll-list">
              {filteredList.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '0.88rem' }}>
                  Không có thông báo nào phù hợp với bộ lọc.
                </div>
              ) : (
                filteredList.map((item) => {
                  const badge = getBadgeConfig(item.type, item.title)
                  const isSelected = selectedNotification?.id === item.id
                  const isDeleting = deletingId === item.id

                  return (
                    <SwipeableNotificationItem
                      key={item.id}
                      item={item}
                      isSelected={isSelected}
                      isDeleting={isDeleting}
                      badge={badge}
                      onSelect={() => handleSelectNotification(item)}
                      onDelete={handleDeleteNotification}
                    />
                  )
                })
              )}
            </div>
          </div>

          {/* CỘT PHẢI: Khung chi tiết cố định (Không cuộn cả trang) */}
          <div className="notifications-right-pane">
            {selectedNotification ? (
              <div>
                {/* Header: Tag + Thời gian + Nút Xóa nhanh */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                    paddingBottom: '14px',
                    borderBottom: '1px solid #f1f5f9',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {(() => {
                      const badge = getBadgeConfig(selectedNotification.type, selectedNotification.title)
                      return (
                        <span
                          style={{
                            display: 'inline-block',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.4px',
                            padding: '3px 10px',
                            borderRadius: '4px',
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                          }}
                        >
                          {badge.text}
                        </span>
                      )
                    })()}

                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      Thời gian: {formatDateTime(selectedNotification.created_at)}
                    </span>
                  </div>

                  {/* Nút xóa ngay tại khung chi tiết */}
                  <button
                    type="button"
                    onClick={() => handleDeleteNotification(selectedNotification.id)}
                    style={{
                      background: 'transparent',
                      border: '1px solid #fecaca',
                      color: '#dc2626',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                    }}
                    title="Xóa thông báo này"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Xóa thông báo
                  </button>
                </div>

                {/* Tiêu đề thông báo */}
                <h2
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    margin: '0 0 16px',
                    lineHeight: 1.4,
                    textAlign: 'left',
                  }}
                >
                  {selectedNotification.title}
                </h2>

                {/* Hiển thị bảng chi tiết nếu là lịch hẹn xem phòng */}
                {isSelectedAppointment && appointmentDetails ? (
                  <div>
                    <div
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        marginBottom: '20px',
                      }}
                    >


                      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {/* Khách hàng & SĐT */}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '12px',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '3px' }}>
                              Khách hàng liên hệ
                            </div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>
                              {appointmentDetails.visitorName || 'Khách liên hệ'}
                            </div>
                          </div>

                          <div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '3px' }}>
                              Số điện thoại
                            </div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>
                              {appointmentDetails.phone || '—'}
                            </div>
                          </div>
                        </div>

                        <div style={{ height: '1px', background: '#f1f5f9' }} />

                        {/* Phòng hẹn xem */}
                        <div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '3px' }}>
                            Phòng hẹn xem
                          </div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>
                            {appointmentDetails.roomTitle || 'Phòng trọ'}
                          </div>
                        </div>

                        <div style={{ height: '1px', background: '#f1f5f9' }} />

                        {/* Ngày & Khung giờ */}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '12px',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '3px' }}>
                              Ngày hẹn xem
                            </div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>
                              {formatDisplayDate(appointmentDetails.date)}
                            </div>
                          </div>

                          <div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '3px' }}>
                              Khung giờ
                            </div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>
                              {appointmentDetails.timeSlot || 'Chưa xác định'}
                            </div>
                          </div>
                        </div>

                        <div style={{ height: '1px', background: '#f1f5f9' }} />

                        {/* Ghi chú */}
                        <div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '3px' }}>
                            Ghi chú của khách hàng
                          </div>
                          <div
                            style={{
                              fontSize: '0.88rem',
                              color: appointmentDetails.note ? '#334155' : '#94a3b8',
                              fontStyle: appointmentDetails.note ? 'normal' : 'italic',
                            }}
                          >
                            {appointmentDetails.note || 'Không có ghi chú thêm.'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Thao tác nhanh */}
                    <div
                      style={{
                        display: 'flex',
                        gap: '10px',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        marginBottom: '10px',
                      }}
                    >
                      <Link
                        to="/my-rooms"
                        state={{ tab: 'appointments' }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: '#0f172a',
                          color: '#ffffff',
                          padding: '9px 18px',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          textDecoration: 'none',
                          transition: 'background 0.15s ease',
                        }}
                      >
                        Mở danh sách lịch hẹn
                      </Link>

                      {appointmentDetails.phone && (
                        <a
                          href={`tel:${appointmentDetails.phone}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#f8fafc',
                            color: '#0f172a',
                            border: '1px solid #cbd5e1',
                            padding: '9px 16px',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            textDecoration: 'none',
                          }}
                        >
                          Gọi điện cho khách
                        </a>
                      )}

                      {appointmentDetails.phone && (
                        <a
                          href={`https://zalo.me/${appointmentDetails.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#0068ff',
                            color: '#ffffff',
                            padding: '9px 16px',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            textDecoration: 'none',
                          }}
                        >
                          Nhắn Zalo cho khách
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Thông báo hệ thống / duyệt bài / từ chối */
                  <div
                    style={{
                      fontSize: '0.92rem',
                      color: '#334155',
                      lineHeight: '1.65',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '18px 20px',
                      marginBottom: '20px',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      textAlign: 'left',
                    }}
                  >
                    {selectedNotification.message}
                  </div>
                )}

                {/* Hướng dẫn khi bị từ chối */}
                {selectedNotification.type === 'rejected' ||
                  (selectedNotification.title || '').toLowerCase().includes('từ chối') ? (
                  <div
                    style={{
                      background: '#fff1f2',
                      border: '1px solid #fecdd3',
                      borderRadius: '8px',
                      padding: '14px 18px',
                      color: '#9f1239',
                      fontSize: '0.85rem',
                      lineHeight: '1.5',
                      textAlign: 'left',
                      marginTop: '16px',
                    }}
                  >
                    <strong>Quy định xét duyệt:</strong> Bài đăng này đã bị Quản trị viên từ chối phê duyệt do vi
                    phạm chính sách niêm yết (giá cả, hình ảnh hoặc thông tin địa chỉ). Bài viết hiện đã bị khóa
                    xuất bản. Bạn có thể kiểm tra danh sách phòng của mình hoặc liên hệ Ban quản trị để biết thêm
                    chi tiết.
                  </div>
                ) : selectedNotification.type === 'approved' && selectedNotification.link ? (
                  <div style={{ marginTop: '16px', textAlign: 'left' }}>
                    <Link
                      to={selectedNotification.link}
                      style={{
                        display: 'inline-block',
                        background: '#0f172a',
                        color: '#ffffff',
                        padding: '10px 18px',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      Xem bài đăng công khai trên sàn →
                    </Link>
                  </div>
                ) : null}
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: '#94a3b8',
                  fontSize: '0.9rem',
                }}
              >
                Chọn một thông báo ở danh sách bên trái để đọc toàn bộ nội dung chi tiết.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
