import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useRooms } from '../context/RoomContext'
import { useToast } from '../context/ToastContext'
import { appointmentApi, type ViewingAppointment } from '../services/api'

function formatDisplayDate(dateStr?: string) {
  if (!dateStr) return '—'
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return dateStr
}

export default function MyRoomsPage() {
  const { user, isAuthenticated } = useAuth()
  const { getRoomsByOwner, toggleRoomStatus, deleteRoom } = useRooms()
  const { showToast } = useToast()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState<'rooms' | 'appointments'>(() => {
    return (location.state as any)?.tab === 'appointments' ? 'appointments' : 'rooms'
  })
  const [appointments, setAppointments] = useState<ViewingAppointment[]>([])
  const [loadingAppointments, setLoadingAppointments] = useState(false)
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  // Bộ lọc cho danh sách bài đăng
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'rented'>('all')

  const myRooms = user ? getRoomsByOwner(user.email) : []

  // Danh sách bài đăng sau khi lọc
  const filteredRooms = myRooms.filter((room) => {
    const matchesSearch =
      !searchQuery.trim() ||
      room.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (room.address || '').toLowerCase().includes(searchQuery.toLowerCase())

    const isAvailable = room.status !== 'rented'
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'available' && isAvailable) ||
      (statusFilter === 'rented' && !isAvailable)

    return matchesSearch && matchesStatus
  })

  const availableCount = myRooms.filter((r) => r.status !== 'rented').length
  const rentedCount = myRooms.filter((r) => r.status === 'rented').length

  useEffect(() => {
    if ((location.state as any)?.tab) {
      setActiveTab((location.state as any).tab)
    }
  }, [location.state])

  useEffect(() => {
    if (isAuthenticated && activeTab === 'appointments') {
      loadAppointments()
    }
  }, [isAuthenticated, activeTab])

  const loadAppointments = async () => {
    try {
      setLoadingAppointments(true)
      const data = await appointmentApi.getAppointments()
      setAppointments(data.appointments || [])
    } catch (err) {
      console.error('Lỗi khi tải danh sách lịch hẹn:', err)
    } finally {
      setLoadingAppointments(false)
    }
  }

  const handleStatusChange = async (id: number, newStatus: ViewingAppointment['status']) => {
    try {
      setUpdatingId(id)
      await appointmentApi.updateAppointmentStatus(id, newStatus)
      setAppointments((prev) =>
        prev.map((app) => (app.id === id ? { ...app, status: newStatus } : app))
      )
      window.dispatchEvent(new Event('appointment-updated'))
      showToast({
        type: 'success',
        title: 'Cập nhật thành công',
        message: `Đã cập nhật trạng thái lịch hẹn sang: ${newStatus === 'confirmed' ? 'Đã xác nhận' : newStatus === 'cancelled' ? 'Đã từ chối' : 'Chờ xác nhận'
          }`,
      })
    } catch (err) {
      console.error('Không thể cập nhật trạng thái:', err)
      showToast({
        type: 'error',
        title: 'Cập nhật thất bại',
        message: 'Có lỗi xảy ra khi cập nhật trạng thái lịch hẹn.',
      })
    } finally {
      setUpdatingId(null)
    }
  }

  const handleDeleteAppointment = async (id: number) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa lịch hẹn này không?')) {
      try {
        await appointmentApi.deleteAppointment(id)
        setAppointments((prev) => prev.filter((app) => app.id !== id))
        window.dispatchEvent(new Event('appointment-updated'))
        showToast({
          type: 'info',
          title: 'Đã xóa lịch hẹn',
          message: 'Lịch xem phòng đã được xóa khỏi danh sách.',
        })
      } catch (err) {
        console.error('Không thể xóa lịch hẹn:', err)
        showToast({
          type: 'error',
          title: 'Xóa thất bại',
          message: 'Không thể xóa lịch hẹn lúc này.',
        })
      }
    }
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="auth-required-box">
        <div className="auth-required-content">
          <h2>Yêu cầu Đăng nhập Chủ trọ</h2>
          <p>Vui lòng đăng nhập để xem danh sách phòng và quản lý các lịch hẹn xem phòng của bạn.</p>
          <div className="auth-required-actions">
            <Link to="/login" state={{ from: { pathname: '/my-rooms' } }} className="btn-primary">
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

  const handleDelete = (id: number, title: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa bài đăng "${title}" không?`)) {
      deleteRoom(id)
      showToast({
        type: 'info',
        title: 'Đã xóa bài đăng',
        message: `Đã xóa bài đăng "${title}" thành công.`,
      })
    }
  }

  const handleToggleStatus = (id: number, isCurrentlyAvailable: boolean) => {
    toggleRoomStatus(id)
    showToast({
      type: 'info',
      title: 'Đã cập nhật trạng thái',
      message: isCurrentlyAvailable
        ? 'Phòng đã được chuyển sang trạng thái "Đã thuê".'
        : 'Phòng đã được mở lại sang trạng thái "Còn phòng".',
      duration: 3500,
    })
  }

  return (
    <div className="my-rooms-container">
      {/* Landlord / Poster Profile Banner */}
      <div className="landlord-profile-card">
        <div className="landlord-profile-info">
          <img
            src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`}
            alt={user.name}
            className="landlord-avatar"
          />
          <div className="landlord-details">
            <div className="landlord-badge">
              {user.role === 'poster' ? 'Người đăng bài' : 'Chủ nhà trọ'}
            </div>
            <h2>{user.name}</h2>
            <div className="landlord-contact-line">
              <span>Email: {user.email}</span>
              {user.phone && <span>Số điện thoại: {user.phone}</span>}
            </div>
          </div>
        </div>

        <div className="landlord-stats-actions">
          <Link to="/create-room" className="btn-primary btn-post-new">
            Đăng tin mới
          </Link>
        </div>
      </div>

      {/* Mini Stats Grid - Thống kê nhanh */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Tổng bài đăng</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
            {myRooms.length}
          </div>
        </div>

        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600 }}>Đang nhận khách</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>
            {availableCount}
          </div>
        </div>

        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 600 }}>Đã thuê / Tạm ẩn</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#dc2626', marginTop: '4px' }}>
            {rentedCount}
          </div>
        </div>

        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.8rem', color: '#2563eb', fontWeight: 600 }}>Lịch hẹn từ khách</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#2563eb', marginTop: '4px' }}>
            {appointments.length}
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="management-tabs" style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <button
          type="button"
          className={`btn-filter ${activeTab === 'rooms' ? 'active' : ''}`}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
            border: activeTab === 'rooms' ? '2px solid var(--primary-color)' : '1px solid #e2e8f0',
            background: activeTab === 'rooms' ? 'var(--primary-light, #eff6ff)' : '#fff',
            color: activeTab === 'rooms' ? 'var(--primary-color)' : '#475569',
          }}
          onClick={() => setActiveTab('rooms')}
        >
          Danh sách bài đăng ({myRooms.length})
        </button>
        <button
          type="button"
          className={`btn-filter ${activeTab === 'appointments' ? 'active' : ''}`}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
            border: activeTab === 'appointments' ? '2px solid var(--primary-color)' : '1px solid #e2e8f0',
            background: activeTab === 'appointments' ? 'var(--primary-light, #eff6ff)' : '#fff',
            color: activeTab === 'appointments' ? 'var(--primary-color)' : '#475569',
          }}
          onClick={() => setActiveTab('appointments')}
        >
          Lịch hẹn xem phòng từ khách {appointments.length > 0 ? `(${appointments.length})` : ''}
        </button>
      </div>

      {activeTab === 'rooms' ? (
        <>
          {/* Thống kê tổng quan lượt quan tâm của tất cả bài đăng */}
          <div className="landlord-analytics-cards">
            <div className="analytics-card">
              <span className="analytics-icon">👁️</span>
              <div className="analytics-info">
                <span className="analytics-num">
                  {myRooms.reduce((acc, r) => acc + (r.viewCount || 0), 0)}
                </span>
                <span className="analytics-label">Tổng lượt xem bài</span>
              </div>
            </div>
            <div className="analytics-card">
              <span className="analytics-icon">📞</span>
              <div className="analytics-info">
                <span className="analytics-num">
                  {myRooms.reduce((acc, r) => acc + (r.contactClicks || 0), 0)}
                </span>
                <span className="analytics-label">Lượt bấm gọi điện</span>
              </div>
            </div>
            <div className="analytics-card">
              <span className="analytics-icon">💬</span>
              <div className="analytics-info">
                <span className="analytics-num">
                  {myRooms.reduce((acc, r) => acc + (r.zaloClicks || 0), 0)}
                </span>
                <span className="analytics-label">Lượt bấm nhắn Zalo</span>
              </div>
            </div>
            <div className="analytics-card">
              <span className="analytics-icon">📅</span>
              <div className="analytics-info">
                <span className="analytics-num">
                  {appointments.length}
                </span>
                <span className="analytics-label">Lịch hẹn xem phòng</span>
              </div>
            </div>
          </div>

          <div className="my-rooms-content-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>


            {/* Thanh tìm kiếm và bộ lọc trạng thái */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Tìm bài đăng..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '7px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  minWidth: '180px',
                }}
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                style={{
                  padding: '7px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  background: '#fff',
                }}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="available">Đang nhận khách</option>
                <option value="rented">Đã cho thuê / Tạm ẩn</option>
              </select>
            </div>
          </div>

          {filteredRooms.length === 0 ? (
            <div className="my-rooms-empty-state">
              <h3>{searchQuery || statusFilter !== 'all' ? 'Không tìm thấy bài đăng phù hợp' : 'Bạn chưa có bài đăng nào'}</h3>
              <p>
                {searchQuery || statusFilter !== 'all'
                  ? 'Thử thay đổi từ khóa tìm kiếm hoặc điều kiện lọc.'
                  : 'Hãy tạo bài đăng phòng trọ mới để khách thuê có thể tìm kiếm và liên hệ.'}
              </p>
              <Link to="/create-room" className="btn-primary">
                Đăng tin mới
              </Link>
            </div>
          ) : (
            <div className="my-rooms-table-card">
              <div className="table-responsive">
                <table className="my-rooms-table">
                  <thead>
                    <tr>
                      <th style={{ width: '130px' }}>Phòng</th>
                      <th style={{ width: '110px' }}>Khu vực</th>
                      <th style={{ width: '90px' }}>Giá thuê</th>
                      <th style={{ width: '60px' }}>Diện tích</th>
                      <th style={{ width: '120px' }}>Lượt quan tâm</th>
                      <th style={{ width: '100px' }}>Trạng thái</th>
                      <th style={{ width: '85px' }}>Ngày đăng</th>
                      <th style={{ width: '100px' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRooms.map((room) => {
                      const isAvailable = room.status !== 'rented'
                      return (
                        <tr key={room.id}>
                          <td className="room-col">
                            <div className="room-cell-info">
                              <img
                                src={
                                  room.images?.[0] ||
                                  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80'
                                }
                                alt={room.title}
                                className="room-cell-thumb"
                              />
                              <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                                <Link to={`/rooms/${room.id}`} className="room-cell-title" title={room.title}>
                                  {room.title}
                                </Link>
                                <div className="room-cell-type">{room.roomType}</div>
                                {(room as any).aiFlags && (room as any).aiFlags.length > 0 && (
                                  <div style={{ fontSize: '0.72rem', color: '#b91c1c', marginTop: '2px', lineHeight: 1.3 }}>
                                    Lưu ý: {(room as any).aiFlags[0]}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="location-text">
                              {room.district ? `${room.district}, ` : ''}
                              {room.city}
                            </span>
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <strong className="price-text">
                              {room.price.toLocaleString('vi-VN')}₫
                            </strong>
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>{room.area} m²</td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>
                              <span title="Lượt xem bài đăng" style={{ color: '#0f172a' }}>
                                👁️ <strong>{room.viewCount || 0}</strong> xem
                              </span>
                              <span title="Lượt khách bấm gọi hoặc nhắn Zalo" style={{ color: '#0284c7' }}>
                                💬 <strong>{(room.contactClicks || 0) + (room.zaloClicks || 0)}</strong> liên hệ
                              </span>
                              <span title="Số lịch hẹn xem phòng đã đặt" style={{ color: '#059669' }}>
                                📅 <strong>{room.appointmentCount || 0}</strong> lịch hẹn
                              </span>
                            </div>
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {room.status === 'pending' || (room as any).aiReviewStatus === 'pending_review' ? (
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '0.78rem',
                                  fontWeight: '600',
                                  background: '#fef3c7',
                                  color: '#b45309',
                                }}
                                title={(room as any).aiFlags?.join('; ') || 'Đang chờ Admin duyệt'}
                              >
                                Chờ duyệt
                              </span>
                            ) : room.status === 'rejected' ? (
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '0.78rem',
                                  fontWeight: '600',
                                  background: '#fee2e2',
                                  color: '#b91c1c',
                                }}
                                title={(room as any).aiFlags?.join('; ') || 'Bài đăng bị từ chối'}
                              >
                                Bị từ chối
                              </span>
                            ) : (
                              <button
                                type="button"
                                className={`status-toggle-btn ${isAvailable ? 'available' : 'rented'}`}
                                onClick={() => handleToggleStatus(room.id, isAvailable)}
                                title="Nhấn để đổi trạng thái"
                              >
                                <span className="dot"></span>
                                {isAvailable ? 'Còn phòng' : 'Đã thuê'}
                              </button>
                            )}
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>{room.postedDate || '—'}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <div className="table-actions">
                              <Link
                                to={`/rooms/${room.id}`}
                                className="btn-action view"
                                title="Xem chi tiết"
                              >
                                Xem
                              </Link>
                              <Link
                                to={`/rooms/${room.id}/edit`}
                                className="btn-action edit"
                                title="Chỉnh sửa bài đăng"
                              >
                                Sửa
                              </Link>
                              <button
                                type="button"
                                className="btn-action delete"
                                onClick={() => handleDelete(room.id, room.title)}
                                title="Xóa bài đăng"
                              >
                                Xóa
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="my-rooms-content-header" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '16px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={loadAppointments}
              style={{ fontSize: '13px', padding: '6px 12px' }}
            >
              Làm mới danh sách
            </button>
          </div>

          {loadingAppointments ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              Đang tải danh sách lịch hẹn...
            </div>
          ) : appointments.length === 0 ? (
            <div className="my-rooms-empty-state">
              <h3>Chưa có lịch hẹn xem phòng nào</h3>
              <p>Khi khách bấm "Đặt lịch hẹn xem phòng" trên trang bài đăng, thông tin sẽ hiển thị ở đây.</p>
            </div>
          ) : (
            <div className="my-rooms-table-card">
              <div className="table-responsive">
                <table className="my-rooms-table appointments-table">
                  <thead>
                    <tr>
                      <th style={{ width: '15%' }}>Khách xem</th>
                      <th style={{ width: '14%' }}>SĐT / Zalo</th>
                      <th style={{ width: '21%' }}>Phòng quan tâm</th>
                      <th style={{ width: '17%' }}>Lịch hẹn</th>
                      <th style={{ width: '13%' }}>Ghi chú</th>
                      <th style={{ width: '14%' }}>Trạng thái</th>
                      <th style={{ width: '6%', textAlign: 'center' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((app) => {
                      return (
                        <tr key={app.id}>
                          <td>
                            <strong style={{ color: '#0f172a' }}>{app.visitorName}</strong>
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <a
                                href={`tel:${app.phone}`}
                                style={{ color: 'var(--primary-color)', fontWeight: 600, textDecoration: 'none', fontSize: '0.85rem' }}
                              >
                                {app.phone}
                              </a>
                              <a
                                href={`https://zalo.me/${app.phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-table-zalo"
                                title="Mở chat Zalo với khách hàng"
                              >
                                Nhắn Zalo
                              </a>
                            </div>
                          </td>
                          <td>
                            <Link
                              to={`/rooms/${app.roomId}`}
                              className="room-cell-title"
                              title={app.roomTitle || `Phòng #${app.roomId}`}
                            >
                              {app.roomTitle || `Phòng #${app.roomId}`}
                            </Link>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                              {formatDisplayDate(app.viewingDate)}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap', marginTop: '2px' }}>
                              {app.viewingTime}
                            </div>
                          </td>
                          <td>
                            <div
                              style={{
                                fontSize: '0.8rem',
                                color: '#475569',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                              title={app.note || '—'}
                            >
                              {app.note || '—'}
                            </div>
                          </td>
                          <td>
                            <select
                              value={app.status}
                              disabled={updatingId === app.id}
                              onChange={(e) =>
                                handleStatusChange(
                                  app.id,
                                  e.target.value as ViewingAppointment['status']
                                )
                              }
                              style={{
                                width: '100%',
                                maxWidth: '120px',
                                boxSizing: 'border-box',
                                padding: '4px 6px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.75rem',
                                background:
                                  app.status === 'confirmed'
                                    ? '#ecfdf5'
                                    : app.status === 'cancelled'
                                      ? '#fef2f2'
                                      : app.status === 'completed'
                                        ? '#eff6ff'
                                        : '#fff',
                                color:
                                  app.status === 'confirmed'
                                    ? '#065f46'
                                    : app.status === 'cancelled'
                                      ? '#991b1b'
                                      : app.status === 'completed'
                                        ? '#1e40af'
                                        : '#334155',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              <option value="pending">Chờ xác nhận</option>
                              <option value="confirmed">Đã xác nhận</option>
                              <option value="completed">Đã xem phòng</option>
                              <option value="cancelled">Đã hủy</option>
                            </select>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className="btn-action delete"
                              onClick={() => handleDeleteAppointment(app.id)}
                              title="Xóa lịch hẹn"
                              style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                            >
                              Xóa
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
