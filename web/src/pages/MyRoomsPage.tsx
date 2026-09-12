import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useRooms } from '../context/RoomContext'
import { appointmentApi, type ViewingAppointment } from '../services/api'

export default function MyRoomsPage() {
  const { user, isAuthenticated } = useAuth()
  const { getRoomsByOwner, toggleRoomStatus, deleteRoom } = useRooms()
  const [activeTab, setActiveTab] = useState<'rooms' | 'appointments'>('rooms')
  const [appointments, setAppointments] = useState<ViewingAppointment[]>([])
  const [loadingAppointments, setLoadingAppointments] = useState(false)
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  const myRooms = user ? getRoomsByOwner(user.email) : []

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
    } catch (err) {
      console.error('Không thể cập nhật trạng thái:', err)
      alert('Có lỗi xảy ra khi cập nhật trạng thái lịch hẹn.')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleDeleteAppointment = async (id: number) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa lịch hẹn này không?')) {
      try {
        await appointmentApi.deleteAppointment(id)
        setAppointments((prev) => prev.filter((app) => app.id !== id))
      } catch (err) {
        console.error('Không thể xóa lịch hẹn:', err)
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
    }
  }

  return (
    <div className="my-rooms-container">
      {/* Landlord Profile Banner */}
      <div className="landlord-profile-card">
        <div className="landlord-profile-info">
          <img
            src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`}
            alt={user.name}
            className="landlord-avatar"
          />
          <div className="landlord-details">
            <div className="landlord-badge">Chủ trọ</div>
            <h2>{user.name}</h2>
            <div className="landlord-contact-line">
              <span>Email: {user.email}</span>
              {user.phone && <span>Số điện thoại: {user.phone}</span>}
            </div>
          </div>
        </div>

        <div className="landlord-stats-actions">
          <div className="stat-pill">
            <span className="stat-number">{myRooms.length}</span>
            <span className="stat-text">Bài đăng</span>
          </div>
          <Link to="/create-room" className="btn-primary btn-post-new">
            Đăng phòng mới
          </Link>
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
          Danh sách phòng đăng ({myRooms.length})
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
          <div className="my-rooms-content-header">
            <div className="header-left">
              <h3>Danh sách phòng của bạn ({myRooms.length})</h3>
              <p>Quản lý trạng thái còn/hết phòng và chỉnh sửa bài đăng</p>
            </div>
          </div>

          {myRooms.length === 0 ? (
            <div className="my-rooms-empty-state">
              <h3>Bạn chưa có bài đăng phòng nào</h3>
              <p>Hãy bắt đầu tạo bài đăng phòng đầu tiên để người thuê có thể liên hệ với bạn ngay!</p>
              <Link to="/create-room" className="btn-primary">
                Đăng phòng trọ ngay
              </Link>
            </div>
          ) : (
            <div className="my-rooms-table-card">
              <div className="table-responsive">
                <table className="my-rooms-table">
                  <thead>
                    <tr>
                      <th>Phòng</th>
                      <th>Khu vực</th>
                      <th>Giá thuê</th>
                      <th>Diện tích</th>
                      <th>Trạng thái</th>
                      <th>Ngày đăng</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myRooms.map((room) => {
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
                              <div>
                                <Link to={`/rooms/${room.id}`} className="room-cell-title">
                                  {room.title}
                                </Link>
                                <div className="room-cell-type">{room.roomType}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="location-text">
                              {room.district ? `${room.district}, ` : ''}
                              {room.city}
                            </span>
                          </td>
                          <td>
                            <strong className="price-text">
                              {room.price.toLocaleString('vi-VN')}₫
                            </strong>
                          </td>
                          <td>{room.area} m²</td>
                          <td>
                            <button
                              type="button"
                              className={`status-toggle-btn ${isAvailable ? 'available' : 'rented'}`}
                              onClick={() => toggleRoomStatus(room.id)}
                              title="Nhấn để đổi trạng thái"
                            >
                              <span className="dot"></span>
                              {isAvailable ? 'Còn phòng' : 'Đã thuê'}
                            </button>
                          </td>
                          <td>{room.postedDate || '—'}</td>
                          <td>
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
          <div className="my-rooms-content-header">
            <div className="header-left">
              <h3>Khách đặt lịch hẹn xem phòng</h3>
              <p>Danh sách thông tin người xem phòng muốn liên hệ và hẹn lịch trực tiếp với bạn</p>
            </div>
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
                <table className="my-rooms-table">
                  <thead>
                    <tr>
                      <th>Khách xem phòng</th>
                      <th>Số điện thoại / Zalo</th>
                      <th>Phòng quan tâm</th>
                      <th>Lịch hẹn</th>
                      <th>Ghi chú</th>
                      <th>Trạng thái</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((app) => {
                      return (
                        <tr key={app.id}>
                          <td>
                            <strong>{app.visitorName}</strong>
                          </td>
                          <td>
                            <a
                              href={`tel:${app.phone}`}
                              style={{ color: 'var(--primary-color)', fontWeight: 600 }}
                            >
                              {app.phone}
                            </a>
                          </td>
                          <td>
                            <Link to={`/rooms/${app.roomId}`} className="room-cell-title">
                              {app.roomTitle || `Phòng #${app.roomId}`}
                            </Link>
                          </td>
                          <td>
                            <div>
                              <strong>{app.viewingDate}</strong>
                            </div>
                            <span style={{ fontSize: '12px', color: '#64748b' }}>
                              {app.viewingTime}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '13px', color: '#475569' }}>
                              {app.note || '—'}
                            </span>
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
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontSize: '13px',
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
                                fontWeight: 500,
                              }}
                            >
                              <option value="pending">Chờ xác nhận</option>
                              <option value="confirmed">Đã liên hệ / Đã hẹn</option>
                              <option value="completed">Đã xem phòng xong</option>
                              <option value="cancelled">Đã hủy</option>
                            </select>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn-action delete"
                              onClick={() => handleDeleteAppointment(app.id)}
                              title="Xóa lịch hẹn"
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
