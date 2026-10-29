import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { appointmentApi, type ViewingAppointment } from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function NotificationBell() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState<ViewingAppointment[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchAppointments = async () => {
    if (!isAuthenticated) return
    try {
      setLoading(true)
      const data = await appointmentApi.getAppointments()
      setAppointments(data.appointments || [])
    } catch (err) {
      console.error('Không thể lấy danh sách lịch hẹn cho thông báo:', err)
    } finally {
      setLoading(false)
    }
  }

  // Load appointments on mount and listen to custom event
  useEffect(() => {
    if (isAuthenticated) {
      fetchAppointments()

      const handleUpdate = () => {
        fetchAppointments()
      }

      window.addEventListener('appointment-updated', handleUpdate)

      // Polling every 45s for fresh appointments
      const interval = setInterval(fetchAppointments, 45000)

      return () => {
        window.removeEventListener('appointment-updated', handleUpdate)
        clearInterval(interval)
      }
    }
  }, [isAuthenticated])

  // Close dropdown on click outside
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

  // Count pending appointments as new notifications
  const pendingCount = appointments.filter((app) => app.status === 'pending').length
  const totalCount = appointments.length

  const handleOpenAllAppointments = () => {
    setIsOpen(false)
    navigate('/my-rooms', { state: { tab: 'appointments' } })
  }

  const getStatusBadge = (status: ViewingAppointment['status']) => {
    switch (status) {
      case 'confirmed':
        return { text: 'Đã xác nhận', bg: '#ecfdf5', color: '#065f46', dot: '#10b981' }
      case 'completed':
        return { text: 'Đã xem phòng', bg: '#eff6ff', color: '#1e40af', dot: '#3b82f6' }
      case 'cancelled':
        return { text: 'Đã hủy', bg: '#fef2f2', color: '#991b1b', dot: '#ef4444' }
      case 'pending':
      default:
        return { text: 'Chờ xác nhận', bg: '#fffbeb', color: '#92400e', dot: '#f59e0b' }
    }
  }

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button
        type="button"
        className={`notification-bell-btn ${pendingCount > 0 ? 'has-unread' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        title="Thông báo lịch xem phòng"
        aria-label="Thông báo lịch hẹn xem phòng"
      >
        <svg
          className="bell-icon"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {pendingCount > 0 && (
          <span className="notification-badge">
            {pendingCount > 9 ? '9+' : pendingCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <div className="header-title-box">
              <span className="header-icon">📅</span>
              <span className="header-title">Lịch hẹn xem phòng</span>
              {pendingCount > 0 ? (
                <span className="pending-pill">{pendingCount} mới</span>
              ) : (
                <span className="total-pill">{totalCount} lịch hẹn</span>
              )}
            </div>
            <button
              type="button"
              className="btn-refresh-notif"
              onClick={fetchAppointments}
              disabled={loading}
              title="Làm mới thông báo"
            >
              <span className={loading ? 'spinning' : ''}>🔄</span>
            </button>
          </div>

          <div className="notification-dropdown-body">
            {appointments.length === 0 ? (
              <div className="notification-empty">
                <span className="empty-icon">📭</span>
                <p className="empty-title">Chưa có lịch hẹn xem phòng nào</p>
                <p className="empty-sub">
                  Khi khách đặt lịch xem phòng trọ của bạn, thông báo sẽ hiển thị ở đây.
                </p>
              </div>
            ) : (
              <div className="notification-list">
                {appointments.slice(0, 6).map((app) => {
                  const badge = getStatusBadge(app.status)
                  const isPending = app.status === 'pending'
                  return (
                    <div
                      key={app.id}
                      className={`notification-item ${isPending ? 'is-pending' : ''}`}
                      onClick={handleOpenAllAppointments}
                      title="Bấm để mở danh sách quản lý lịch hẹn"
                    >
                      <div className="item-avatar">
                        {app.visitorName ? app.visitorName.charAt(0).toUpperCase() : 'K'}
                      </div>
                      <div className="item-content">
                        <div className="item-header-line">
                          <strong className="visitor-name">{app.visitorName}</strong>
                          <span
                            className="item-status-tag"
                            style={{ background: badge.bg, color: badge.color }}
                          >
                            <span className="status-dot" style={{ background: badge.dot }}></span>
                            {badge.text}
                          </span>
                        </div>

                        <div className="item-room-title">
                          🏠 {app.roomTitle || `Phòng #${app.roomId}`}
                        </div>

                        <div className="item-schedule-line">
                          <span className="schedule-date">📅 {app.viewingDate}</span>
                          <span className="schedule-time">⏰ {app.viewingTime}</span>
                        </div>

                        {app.phone && (
                          <div className="item-phone-line">
                            📞 SĐT: <strong>{app.phone}</strong>
                          </div>
                        )}

                        {app.note && (
                          <div className="item-note-line">
                            💬 "{app.note}"
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="notification-dropdown-footer">
            <button
              type="button"
              className="btn-view-all-appointments"
              onClick={handleOpenAllAppointments}
            >
              Quản lý lịch hẹn xem phòng ({totalCount}) &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
