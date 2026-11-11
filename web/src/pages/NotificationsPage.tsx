import { useState, useEffect, useMemo } from 'react'
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

export default function NotificationsPage() {
  const { isAuthenticated, user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'appointment' | 'rejected' | 'approved'>('all')
  const [copiedPhone, setCopiedPhone] = useState(false)

  const fetchNotifications = async () => {
    if (!isAuthenticated) return
    try {
      setLoading(true)
      const data = await notificationApi.getNotifications(50)
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
      notificationApi.markAsRead(selectedNotification.id).catch(() => {})
      setNotifications((prev) =>
        prev.map((n) => (n.id === selectedNotification.id ? { ...n, is_read: true } : n))
      )
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
      } catch (e) {}
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch (err) {
      console.error('Lỗi đánh dấu tất cả đã đọc:', err)
    }
  }

  const handleCopyPhone = (phone: string) => {
    if (!phone) return
    navigator.clipboard.writeText(phone)
    setCopiedPhone(true)
    setTimeout(() => setCopiedPhone(false), 2000)
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

  const getBadgeConfig = (type?: string, title?: string) => {
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
    <div style={{ maxWidth: '1100px', margin: '30px auto', padding: '0 20px', textAlign: 'left' }}>
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', margin: '0 0 6px', textAlign: 'left' }}>
            Hộp Thư Thông Báo
          </h1>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b', textAlign: 'left' }}>
            Cập nhật về lịch hẹn xem phòng từ khách hàng, kiểm duyệt bài đăng và thông báo hệ thống
          </p>
        </div>

        {counts.unread > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Đánh dấu tất cả đã đọc ({counts.unread})
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '12px',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={() => setFilterType('all')}
          style={{
            border: 'none',
            background: filterType === 'all' ? '#0f172a' : '#f1f5f9',
            color: filterType === 'all' ? '#ffffff' : '#475569',
            fontWeight: 600,
            fontSize: '0.82rem',
            padding: '6px 14px',
            borderRadius: '20px',
            cursor: 'pointer',
          }}
        >
          Tất cả ({counts.total})
        </button>

        <button
          type="button"
          onClick={() => setFilterType('appointment')}
          style={{
            border: 'none',
            background: filterType === 'appointment' ? '#0f172a' : '#f1f5f9',
            color: filterType === 'appointment' ? '#ffffff' : '#475569',
            fontWeight: 600,
            fontSize: '0.82rem',
            padding: '6px 14px',
            borderRadius: '20px',
            cursor: 'pointer',
          }}
        >
          Lịch xem phòng ({counts.appointment})
        </button>

        <button
          type="button"
          onClick={() => setFilterType('unread')}
          style={{
            border: 'none',
            background: filterType === 'unread' ? '#0f172a' : '#f1f5f9',
            color: filterType === 'unread' ? '#ffffff' : '#475569',
            fontWeight: 600,
            fontSize: '0.82rem',
            padding: '6px 14px',
            borderRadius: '20px',
            cursor: 'pointer',
          }}
        >
          Chưa đọc ({counts.unread})
        </button>

        <button
          type="button"
          onClick={() => setFilterType('rejected')}
          style={{
            border: 'none',
            background: filterType === 'rejected' ? '#0f172a' : '#f1f5f9',
            color: filterType === 'rejected' ? '#ffffff' : '#475569',
            fontWeight: 600,
            fontSize: '0.82rem',
            padding: '6px 14px',
            borderRadius: '20px',
            cursor: 'pointer',
          }}
        >
          Bị từ chối ({counts.rejected})
        </button>

        <button
          type="button"
          onClick={() => setFilterType('approved')}
          style={{
            border: 'none',
            background: filterType === 'approved' ? '#0f172a' : '#f1f5f9',
            color: filterType === 'approved' ? '#ffffff' : '#475569',
            fontWeight: 600,
            fontSize: '0.82rem',
            padding: '6px 14px',
            borderRadius: '20px',
            cursor: 'pointer',
          }}
        >
          Đã duyệt ({counts.approved})
        </button>
      </div>

      {/* Main 2-Column Split: Master List on left, Full Detail on right */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
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
          }}
        >
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
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(320px, 390px) 1fr',
            gap: '20px',
            alignItems: 'start',
          }}
        >
          {/* LEFT: Notification List */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
              maxHeight: '700px',
              overflowY: 'auto',
            }}
          >
            {filteredList.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '0.88rem' }}>
                Không có thông báo nào phù hợp với bộ lọc.
              </div>
            ) : (
              filteredList.map((item) => {
                const badge = getBadgeConfig(item.type, item.title)
                const isSelected = selectedNotification?.id === item.id
                const isUnread = !item.is_read || item.is_read === 0

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectNotification(item)}
                    style={{
                      padding: '14px 16px',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      background: isSelected ? '#f8fafc' : isUnread ? '#fffdf7' : '#ffffff',
                      borderLeft: isSelected
                        ? '3px solid #0f172a'
                        : isUnread
                        ? '3px solid #f59e0b'
                        : '3px solid transparent',
                      transition: 'all 0.15s ease',
                      textAlign: 'left',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '4px',
                      }}
                    >
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
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        {formatRelativeTime(item.created_at)}
                      </span>
                    </div>

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

                    <div
                      style={{
                        fontSize: '0.78rem',
                        color: '#64748b',
                        lineHeight: 1.4,
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
                )
              })
            )}
          </div>

          {/* RIGHT: Selected Notification Full Detail Pane */}
          {selectedNotification ? (
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '24px 28px',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
                minHeight: '440px',
                textAlign: 'left',
              }}
            >
              {/* Badge & Date Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                  paddingBottom: '14px',
                  borderBottom: '1px solid #f1f5f9',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
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

              {/* Title */}
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

              {/* If Appointment: Render Elegant Structured View */}
              {isSelectedAppointment && appointmentDetails ? (
                <div>
                  {/* Structured Details Card */}
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      marginBottom: '20px',
                    }}
                  >
                    <div
                      style={{
                        background: '#f8fafc',
                        padding: '12px 18px',
                        borderBottom: '1px solid #e2e8f0',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: '#475569',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      Chi tiết lịch hẹn xem phòng
                    </div>

                    <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {/* Row 1: Khách hàng & SĐT */}
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>
                              {appointmentDetails.phone || '—'}
                            </span>
                            {appointmentDetails.phone && (
                              <button
                                type="button"
                                onClick={() => handleCopyPhone(appointmentDetails.phone)}
                                style={{
                                  background: '#f1f5f9',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '4px',
                                  padding: '2px 8px',
                                  fontSize: '0.72rem',
                                  color: '#334155',
                                  cursor: 'pointer',
                                }}
                              >
                                {copiedPhone ? 'Đã chép' : 'Sao chép'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Divider */}
                      <div style={{ height: '1px', background: '#f1f5f9' }} />

                      {/* Row 2: Phòng trọ */}
                      <div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '3px' }}>
                          Phòng hẹn xem
                        </div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>
                          {appointmentDetails.roomTitle || 'Phòng trọ'}
                        </div>
                      </div>

                      {/* Divider */}
                      <div style={{ height: '1px', background: '#f1f5f9' }} />

                      {/* Row 3: Ngày & Giờ hẹn */}
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

                      {/* Divider */}
                      <div style={{ height: '1px', background: '#f1f5f9' }} />

                      {/* Row 4: Ghi chú */}
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

                  {/* Quick Action Navigation */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '10px',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      marginBottom: '20px',
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
                      Mở danh sách quản lý lịch hẹn →
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
                  </div>
                </div>
              ) : (
                /* Default Message Box for Non-Appointment Notifications */
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

              {/* Special Context Guidance for Rejections */}
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
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '40px',
                textAlign: 'center',
                color: '#94a3b8',
              }}
            >
              Chọn một thông báo ở danh sách bên trái để đọc toàn bộ nội dung chi tiết.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
