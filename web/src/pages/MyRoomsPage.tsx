import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useRooms } from '../context/RoomContext'

export default function MyRoomsPage() {
  const { user, isAuthenticated } = useAuth()
  const { getRoomsByOwner, toggleRoomStatus, deleteRoom } = useRooms()

  if (!isAuthenticated || !user) {
    return (
      <div className="auth-required-box">
        <div className="auth-required-content">
          <div className="icon">🔒</div>
          <h2>Yêu cầu Đăng nhập Chủ trọ</h2>
          <p>Vui lòng đăng nhập để xem danh sách phòng và quản lý bài đăng của bạn.</p>
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

  const myRooms = getRoomsByOwner(user.email)

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
              <span>📧 {user.email}</span>
              <span>📞 {user.phone}</span>
            </div>
          </div>
        </div>

        <div className="landlord-stats-actions">
          <div className="stat-pill">
            <span className="stat-number">{myRooms.length}</span>
            <span className="stat-text">Bài đăng</span>
          </div>
          <Link to="/create-room" className="btn-primary btn-post-new">
            ➕ Đăng phòng mới
          </Link>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="my-rooms-content-header">
        <div className="header-left">
          <h3>Danh sách phòng của bạn ({myRooms.length})</h3>
          <p>Quản lý trạng thái còn/hết phòng và chỉnh sửa bài đăng</p>
        </div>
      </div>

      {myRooms.length === 0 ? (
        <div className="my-rooms-empty-state">
          <div className="empty-icon">🏡</div>
          <h3>Bạn chưa có bài đăng phòng nào</h3>
          <p>Hãy bắt đầu tạo bài đăng phòng đầu tiên để người thuê có thể liên hệ với bạn ngay!</p>
          <Link to="/create-room" className="btn-primary">
            🚀 Đăng phòng trọ ngay
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
                            👁️ Xem
                          </Link>
                          <button
                            type="button"
                            className="btn-action delete"
                            onClick={() => handleDelete(room.id, room.title)}
                            title="Xóa bài đăng"
                          >
                            🗑️ Xóa
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
    </div>
  )
}
