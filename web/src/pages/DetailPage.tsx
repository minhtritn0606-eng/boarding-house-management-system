import { useNavigate, useParams, Link } from 'react-router-dom'
import { useRooms } from '../context/RoomContext'
import Carousel from '../components/Carousel'

export default function DetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { rooms } = useRooms()

  const room = rooms.find((r) => String(r.id) === String(id))

  if (!room) {
    return (
      <div className="empty-state">
        <h3>Không tìm thấy phòng</h3>
        <p>Phòng này có thể đã bị xóa hoặc không tồn tại.</p>
        <Link to="/rooms" className="btn-primary" style={{ display: 'inline-block', marginTop: '12px' }}>
          Xem danh sách phòng
        </Link>
      </div>
    )
  }

  const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(room.address)}&output=embed`
  const isAvailable = room.status !== 'rented'

  const getRoomTypeLabel = (type: string) => {
    switch (type) {
      case 'private':
        return 'Phòng đơn'
      case 'shared':
        return 'Phòng đôi'
      case 'studio':
        return 'Studio / Căn hộ mini'
      default:
        return type
    }
  }

  return (
    <div>
      <button className="back-button" onClick={() => navigate(-1)}>
        ← Quay lại
      </button>

      <div className="room-detail-card">
        <Carousel images={room.images} />
        <div className="room-detail-info">
          <div className="detail-header-badges">
            <span className="room-type-badge">{getRoomTypeLabel(room.roomType)}</span>
            <span className={`room-status-badge ${isAvailable ? 'available' : 'rented'}`}>
              <span className="status-dot"></span>
              {isAvailable ? 'Còn phòng' : 'Đã thuê'}
            </span>
          </div>

          <h2>{room.title}</h2>
          <p className="room-address-detail">📍 {room.address}</p>
          <p className="room-description">{room.description}</p>

          <div className="detail-meta">
            <div>
              <strong>Giá thuê</strong>
              <p className="detail-price-text">{room.price.toLocaleString('vi-VN')}₫ / tháng</p>
            </div>
            <div>
              <strong>Diện tích</strong>
              <p>{room.area} m²</p>
            </div>
            <div>
              <strong>Ngày đăng</strong>
              <p>{room.postedDate || 'Mới đăng'}</p>
            </div>
          </div>

          <div className="amenities">
            <strong>Tiện nghi nổi bật</strong>
            <div className="detail-amenities-tags">
              {(room.amenities || []).map((a) => (
                <span key={a} className="amenity-chip">
                  {a}
                </span>
              ))}
            </div>
          </div>

          <div className="owner-info-card">
            <strong>Thông tin chủ trọ liên hệ</strong>
            <div className="owner-row">
              <span className="owner-name">👤 {room.ownerName || 'Chủ trọ'}</span>
              {room.contact && (
                <a href={`tel:${room.contact}`} className="owner-phone-btn">
                  📞 {room.contact}
                </a>
              )}
            </div>
            {room.ownerEmail && (
              <p className="owner-email">✉️ {room.ownerEmail}</p>
            )}
          </div>
        </div>
      </div>

      <div className="map-section">
        <h3>Vị trí phòng trên bản đồ</h3>
        <iframe title="map" src={mapUrl} loading="lazy" />
      </div>
    </div>
  )
}
