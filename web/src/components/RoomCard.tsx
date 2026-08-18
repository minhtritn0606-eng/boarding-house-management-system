import { Link } from 'react-router-dom'
import type { Room } from '../data/sampleRooms'

interface RoomCardProps {
  room: Room
}

export default function RoomCard({ room }: RoomCardProps) {
  // Format posted date (YYYY-MM-DD -> DD/MM/YYYY)
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Mới đăng'
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

  const isAvailable = room.status !== 'rented'
  const displayedAmenities = room.amenities?.slice(0, 3) || []
  const remainingCount = (room.amenities?.length || 0) - displayedAmenities.length

  const getRoomTypeLabel = (type: string) => {
    switch (type) {
      case 'private':
        return 'Phòng đơn'
      case 'shared':
        return 'Phòng đôi'
      case 'studio':
        return 'Studio'
      default:
        return type
    }
  }

  const thumbnail =
    room.images?.[0] ||
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80'

  return (
    <article className="room-card-item">
      {/* 1. Ảnh đại diện & 7. Trạng thái phòng */}
      <div className="room-card-thumb">
        <Link to={`/rooms/${room.id}`} className="room-card-image-link" tabIndex={-1}>
          <img src={thumbnail} alt={room.title} loading="lazy" />
        </Link>
        <div className="room-badge-group">
          <span className={`room-status-badge ${isAvailable ? 'available' : 'rented'}`}>
            <span className="status-dot"></span>
            {isAvailable ? 'Còn phòng' : 'Đã thuê'}
          </span>
          {room.roomType && (
            <span className="room-type-badge">{getRoomTypeLabel(room.roomType)}</span>
          )}
        </div>
      </div>

      <div className="room-card-content">
        {/* 2. Tên phòng */}
        <h3 className="room-card-title" title={room.title}>
          <Link to={`/rooms/${room.id}`}>{room.title}</Link>
        </h3>

        {/* 3. Giá thuê & 4. Diện tích */}
        <div className="room-card-pricing-row">
          <div className="room-card-price">
            <span className="price-amount">{room.price.toLocaleString('vi-VN')}₫</span>
            <span className="price-period">/tháng</span>
          </div>
          {room.area ? (
            <div className="room-card-area">
              <span className="area-icon">📐</span>
              <span>{room.area} m²</span>
            </div>
          ) : null}
        </div>

        {/* 5. Địa chỉ */}
        <div className="room-card-address" title={room.address}>
          <span className="address-icon">📍</span>
          <span className="address-text">{room.address}</span>
        </div>

        {/* 6. Một số tiện nghi */}
        {displayedAmenities.length > 0 && (
          <div className="room-card-amenities">
            {displayedAmenities.map((amenity, idx) => (
              <span key={idx} className="amenity-chip">
                {amenity}
              </span>
            ))}
            {remainingCount > 0 && (
              <span className="amenity-chip more">+{remainingCount}</span>
            )}
          </div>
        )}

        {/* 8. Thời gian đăng & 9. Nút xem chi tiết */}
        <div className="room-card-footer">
          <div className="room-card-date" title="Thời gian đăng">
            <span className="date-icon">🕒</span>
            <span>{formatDate(room.postedDate)}</span>
          </div>
          <Link to={`/rooms/${room.id}`} className="room-card-btn">
            Xem chi tiết <span className="btn-arrow">→</span>
          </Link>
        </div>
      </div>
    </article>
  )
}
