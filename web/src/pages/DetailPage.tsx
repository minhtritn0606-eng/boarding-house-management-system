import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useRooms } from '../context/RoomContext'
import Carousel from '../components/Carousel'

export default function DetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { rooms } = useRooms()

  const [mapMode, setMapMode] = useState<'location' | 'directions'>('location')
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [customOrigin, setCustomOrigin] = useState('')
  const [activeOriginText, setActiveOriginText] = useState('')
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState('')

  const room = rooms.find((r) => String(r.id) === String(id))

  if (!room) {
    return (
      <div className="empty-state">
        <h3>Không tìm thấy phòng</h3>
        <p>Phòng này có thể đã bị xóa hoặc không tồn tại.</p>
        <Link
          to="/rooms"
          className="btn-primary"
          style={{ display: 'inline-block', marginTop: '12px' }}
        >
          Xem danh sách phòng
        </Link>
      </div>
    )
  }

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

  // Handle GPS location to get directions
  const handleGetDirectionsFromMyLocation = () => {
    setGeoLoading(true)
    setGeoError('')

    if (!navigator.geolocation) {
      setGeoLoading(false)
      setGeoError('Trình duyệt không hỗ trợ định vị GPS. Bạn có thể nhập địa chỉ xuất phát bên dưới.')
      setMapMode('directions')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        setOriginCoords({ lat, lng })
        setActiveOriginText('Vị trí hiện tại của bạn (GPS)')
        setGeoLoading(false)
        setMapMode('directions')
      },
      (err) => {
        console.warn('Geolocation error:', err)
        setGeoLoading(false)
        setGeoError(
          'Không thể lấy vị trí hiện tại (vui lòng cho phép quyền truy cập vị trí trên trình duyệt hoặc nhập điểm xuất phát bên dưới).'
        )
        setMapMode('directions')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // Handle manual origin submission
  const handleCustomOriginSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customOrigin.trim()) return
    setOriginCoords(null)
    setActiveOriginText(customOrigin.trim())
    setGeoError('')
    setMapMode('directions')
  }

  // Reset to single room location
  const handleResetToRoomLocation = () => {
    setMapMode('location')
    setOriginCoords(null)
    setActiveOriginText('')
    setGeoError('')
  }

  // Compute map embed URL
  let mapEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(room.address)}&output=embed`
  if (mapMode === 'directions') {
    if (originCoords) {
      mapEmbedUrl = `https://maps.google.com/maps?saddr=${originCoords.lat},${originCoords.lng}&daddr=${encodeURIComponent(room.address)}&output=embed`
    } else if (activeOriginText) {
      mapEmbedUrl = `https://maps.google.com/maps?saddr=${encodeURIComponent(activeOriginText)}&daddr=${encodeURIComponent(room.address)}&output=embed`
    }
  }

  // External Google Maps directions URL for opening in native tab/app
  const googleMapsExternalUrl = originCoords
    ? `https://www.google.com/maps/dir/?api=1&origin=${originCoords.lat},${originCoords.lng}&destination=${encodeURIComponent(room.address)}`
    : activeOriginText
    ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(activeOriginText)}&destination=${encodeURIComponent(room.address)}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(room.address)}`

  return (
    <div className="detail-page-container">
      <button className="back-button" onClick={() => navigate(-1)}>
        ← Quay lại
      </button>

      {/* Main Room Detail Card */}
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

          <div className="detail-meta">
            <div>
              <strong>Giá thuê</strong>
              <p className="detail-price-text">
                {room.price.toLocaleString('vi-VN')}₫ / tháng
              </p>
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

          <div className="room-description-box">
            <strong>Mô tả chi tiết phòng trọ</strong>
            <p className="room-description">{room.description}</p>
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

      {/* Map & Directions Section */}
      <div className="map-section">
        <div className="map-header-row">
          <h3>
            <span>📍</span> Vị trí & Chỉ đường đến phòng trọ
          </h3>

          <div className="map-actions">
            <button
              type="button"
              className="btn-directions"
              onClick={handleGetDirectionsFromMyLocation}
              disabled={geoLoading}
            >
              {geoLoading ? '⏳ Đang định vị...' : '🧭 Chỉ đường từ vị trí của tôi'}
            </button>

            <a
              href={googleMapsExternalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-open-gmaps"
            >
              🗺️ Mở trong Google Maps ↗
            </a>

            {mapMode === 'directions' && (
              <button
                type="button"
                className="btn-reset-map"
                onClick={handleResetToRoomLocation}
              >
                📍 Xem vị trí phòng
              </button>
            )}
          </div>
        </div>

        {/* Directions Banner / Info */}
        {mapMode === 'directions' && activeOriginText && (
          <div className="route-info-card">
            <div className="route-text">
              <span>🚗</span> Tuyến đường từ: <strong>{activeOriginText}</strong> ➔{' '}
              <strong>{room.address}</strong>
            </div>

            <form onSubmit={handleCustomOriginSubmit} className="custom-origin-form">
              <input
                type="text"
                placeholder="Thay đổi điểm xuất phát (ví dụ: Đại học Bách Khoa, Sân bay...)"
                value={customOrigin}
                onChange={(e) => setCustomOrigin(e.target.value)}
              />
              <button type="submit" className="btn-primary">
                Tìm đường
              </button>
            </form>
          </div>
        )}

        {geoError && <div className="map-status-msg error">⚠️ {geoError}</div>}

        <div className="map-iframe-container">
          <iframe
            title={`Bản đồ ${room.title}`}
            src={mapEmbedUrl}
            loading="lazy"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  )
}
