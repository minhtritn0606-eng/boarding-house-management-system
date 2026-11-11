import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useRooms } from '../context/RoomContext'
import { roomApi, postApi } from '../services/api'
import type { Room } from '../data/sampleRooms'
import Carousel from '../components/Carousel'
import AppointmentBookingForm from '../components/AppointmentBookingForm'

export default function DetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { rooms, isLoading: isContextLoading } = useRooms()

  const [directRoom, setDirectRoom] = useState<Room | null>(null)
  const [isDirectLoading, setIsDirectLoading] = useState(false)
  const [mapMode, setMapMode] = useState<'location' | 'directions'>('location')
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [customOrigin, setCustomOrigin] = useState('')
  const [activeOriginText, setActiveOriginText] = useState('')
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState('')

  const contextRoom = rooms.find((r) => String(r.id) === String(id))
  const room = contextRoom || directRoom

  useEffect(() => {
    if (!contextRoom && id) {
      setIsDirectLoading(true)
      roomApi
        .getRoomDetails(id)
        .then((res) => {
          const item = res?.room || res?.post
          if (item) {
            setDirectRoom(item)
          }
        })
        .catch((err) => {
          console.warn('Lỗi tải chi tiết phòng từ CSDL:', err.message)
        })
        .finally(() => {
          setIsDirectLoading(false)
        })
    }
  }, [id, contextRoom])

  // Ghi nhận lượt xem (tránh tăng liên tục khi refresh trong cùng phiên)
  useEffect(() => {
    if (room?.id) {
      const storageKey = `viewed_post_${room.id}`
      if (!sessionStorage.getItem(storageKey)) {
        sessionStorage.setItem(storageKey, '1')
        postApi.trackView(room.id).catch(() => { })
      }
    }
  }, [room?.id])

  if (isContextLoading || isDirectLoading) {
    return (
      <div className="empty-state" style={{ minHeight: '350px' }}>
        <h3>Đang tải thông tin phòng từ CSDL...</h3>
        <p>Vui lòng chờ trong giây lát.</p>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="empty-state">
        <h3>Không tìm thấy phòng</h3>
        <p>Phòng này có thể đã bị xóa hoặc không tồn tại trong CSDL.</p>
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

  const roomDestTarget = (room.latitude && room.longitude)
    ? `${room.latitude},${room.longitude}`
    : encodeURIComponent(room.address)

  // Compute map embed URL
  let mapEmbedUrl = `https://maps.google.com/maps?q=${roomDestTarget}&output=embed`
  if (mapMode === 'directions') {
    if (originCoords) {
      mapEmbedUrl = `https://maps.google.com/maps?saddr=${originCoords.lat},${originCoords.lng}&daddr=${roomDestTarget}&output=embed`
    } else if (activeOriginText) {
      mapEmbedUrl = `https://maps.google.com/maps?saddr=${encodeURIComponent(activeOriginText)}&daddr=${roomDestTarget}&output=embed`
    }
  }

  // External Google Maps directions URL for opening in native tab/app
  const googleMapsExternalUrl = originCoords
    ? `https://www.google.com/maps/dir/?api=1&origin=${originCoords.lat},${originCoords.lng}&destination=${roomDestTarget}`
    : activeOriginText
      ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(activeOriginText)}&destination=${roomDestTarget}`
      : `https://www.google.com/maps/dir/?api=1&destination=${roomDestTarget}`

  const isOwner = Boolean(user && (user.email === room.ownerEmail || user.role === 'admin'))

  const contactPhone =
    (room as any).contactPhone ||
    room.contact ||
    (room as any).contact_phone ||
    (room as any).ownerPhone ||
    (room as any).owner_phone ||
    ''

  const cleanPhone = contactPhone ? String(contactPhone).trim().replace(/\s+/g, '') : ''
  const ownerDisplayName =
    (room as any).contactName ||
    room.ownerName ||
    (room as any).contact_name ||
    (room as any).owner_name ||
    'Chủ trọ'

  return (
    <div className="detail-page-container">
      <div className="detail-top-nav">
        <button className="back-button" onClick={() => navigate(-1)}>
          Quay lại
        </button>
        {isOwner && (
          <Link to={`/rooms/${room.id}/edit`} className="btn-edit-post-top">
            Chỉnh sửa bài đăng
          </Link>
        )}
      </div>

      {(room.status === 'pending' || (room as any).aiReviewStatus === 'pending_review') && (
        <div
          style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            color: '#92400e',
            padding: '12px 18px',
            borderRadius: '10px',
            marginBottom: '20px',
            fontSize: '0.92rem',
            lineHeight: '1.5',
          }}
        >
          <strong>Thông báo kiểm duyệt:</strong> Bài đăng này đang ở chế độ xem trước (Chờ duyệt). Khách tìm trọ bên ngoài sẽ không thấy bài viết này cho đến khi được Quản trị viên phê duyệt chính thức.
        </div>
      )}
      {room.status === 'rejected' && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            padding: '12px 18px',
            borderRadius: '10px',
            marginBottom: '20px',
            fontSize: '0.92rem',
            lineHeight: '1.5',
          }}
        >
          <strong>Bài đăng bị tạm dừng:</strong> Hệ thống AI phát hiện nghi vấn vi phạm (phá giá hoặc trùng lặp dữ liệu). Bài viết hiện đã bị tạm dừng xuất bản.
        </div>
      )}

      {/* 1. HERO TOP SECTION: Carousel & Room Overview + Contact */}
      <div className="room-detail-hero">
        <Carousel images={room.images} />

        <div className="room-detail-overview">
          <div className="overview-header-group">
            <div className="detail-header-badges">
              <span className="room-type-badge">{getRoomTypeLabel(room.roomType)}</span>
              {room.status === 'pending' || (room as any).aiReviewStatus === 'pending_review' ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    background: '#fef3c7',
                    color: '#b45309',
                    border: '1px solid #fde68a',
                  }}
                >
                  Chờ duyệt
                </span>
              ) : room.status === 'rejected' ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    background: '#fee2e2',
                    color: '#b91c1c',
                    border: '1px solid #fecaca',
                  }}
                >
                  Tạm dừng xuất bản
                </span>
              ) : (
                <span className={`room-status-badge ${isAvailable ? 'available' : 'rented'}`}>
                  <span className="status-dot"></span>
                  {isAvailable ? 'Còn phòng' : 'Đã thuê'}
                </span>
              )}
            </div>

            <h1 className="room-detail-title">{room.title}</h1>
            <p className="room-address-line">Địa chỉ: {room.address}</p>
          </div>

          <div className="detail-price-card">
            <span className="detail-price-label">Giá thuê niêm yết</span>
            <span className="detail-price-val">
              {room.price.toLocaleString('vi-VN')}₫ / tháng
            </span>
          </div>

          {/* Thống kê lượt quan tâm của bài đăng */}
          <div className="detail-engagement-bar">
            <div className="engagement-item" title="Số lượt xem bài đăng">
              <strong>{room.viewCount || 0}</strong> lượt xem
            </div>
            <div className="engagement-item" title="Số lượt bấm gọi hoặc nhắn Zalo">
              <strong>{(room.contactClicks || 0) + (room.zaloClicks || 0)}</strong> lượt liên hệ
            </div>
            <div className="engagement-item" title="Số yêu cầu xem phòng đã gửi">
              <strong>{room.appointmentCount || 0}</strong> lịch hẹn
            </div>
          </div>

          <div className="detail-specs-grid">
            <div className="detail-spec-item">
              <span className="detail-spec-label">Diện tích</span>
              <span className="detail-spec-val">{room.area} m²</span>
            </div>
            <div className="detail-spec-item">
              <span className="detail-spec-label">Loại phòng</span>
              <span className="detail-spec-val">{getRoomTypeLabel(room.roomType)}</span>
            </div>
            <div className="detail-spec-item">
              <span className="detail-spec-label">Ngày đăng</span>
              <span className="detail-spec-val">{room.postedDate || 'Mới cập nhật'}</span>
            </div>
          </div>

          <div className="detail-contact-card">
            <h4 className="contact-card-title">Thông tin liên hệ người cho thuê</h4>
            <div className="contact-person-info">
              <span className="contact-person-name">{ownerDisplayName}</span>
              {contactPhone ? (
                <span className="contact-person-phone">{contactPhone}</span>
              ) : (
                <span className="contact-person-phone" style={{ color: '#64748b', fontSize: '0.9rem' }}>
                  Chưa cập nhật SĐT
                </span>
              )}
            </div>

            {cleanPhone && (
              <div className="contact-actions-row">
                <a
                  href={`tel:${cleanPhone}`}
                  className="btn-call-landlord"
                  onClick={() => postApi.trackContact(room.id, 'call').catch(() => { })}
                >
                  Gọi điện: {contactPhone}
                </a>
                <a
                  href={`https://zalo.me/${cleanPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-zalo-landlord"
                  onClick={() => postApi.trackContact(room.id, 'zalo').catch(() => { })}
                >
                  Nhắn Zalo
                </a>
              </div>
            )}

            {room.ownerEmail && (
              <div className="contact-email-line">Email: {room.ownerEmail}</div>
            )}
          </div>
        </div>
      </div>

      {/* 2. LOWER SECTION: 2-Column Balanced Content */}
      <div className="detail-content-grid">
        {/* Left Column: Description, Amenities, Map */}
        <div className="detail-main-column">
          <div className="detail-section-card">
            <h3>Mô tả chi tiết phòng trọ</h3>
            <p className="detail-description-content">{room.description}</p>
          </div>

          <div className="detail-section-card">
            <h3>Tiện nghi & Tiện ích</h3>
            <div className="detail-amenities-tags">
              {(room.amenities && room.amenities.length > 0) ? (
                room.amenities.map((a: string) => (
                  <span key={a} className="amenity-chip">
                    {a}
                  </span>
                ))
              ) : (
                <span style={{ color: '#64748b', fontSize: '0.9rem' }}>
                  Tiện ích cơ bản theo thỏa thuận với chủ trọ
                </span>
              )}
            </div>
          </div>

          <div className="map-section">
            <div className="map-header-row">
              <h3>Vị trí & Chỉ đường</h3>

              <div className="map-actions">
                <button
                  type="button"
                  className="btn-directions"
                  onClick={handleGetDirectionsFromMyLocation}
                  disabled={geoLoading}
                >
                  {geoLoading ? 'Đang định vị...' : 'Chỉ đường từ vị trí của tôi'}
                </button>

                <a
                  href={googleMapsExternalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-open-gmaps"
                >
                  Mở trên Google Maps
                </a>

                {mapMode === 'directions' && (
                  <button
                    type="button"
                    className="btn-reset-map"
                    onClick={handleResetToRoomLocation}
                  >
                    Xem vị trí phòng
                  </button>
                )}
              </div>
            </div>

            {/* Directions Banner / Info */}
            {mapMode === 'directions' && activeOriginText && (
              <div className="route-info-card">
                <div className="route-text">
                  Tuyến đường từ: <strong>{activeOriginText}</strong> đến <strong>{room.address}</strong>
                </div>

                <form onSubmit={handleCustomOriginSubmit} className="custom-origin-form">
                  <input
                    type="text"
                    value={customOrigin}
                    onChange={(e) => setCustomOrigin(e.target.value)}
                  />
                  <button type="submit">
                    Tìm đường
                  </button>
                </form>
              </div>
            )}

            {geoError && <div className="map-status-msg error">{geoError}</div>}

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

        {/* Right Column: Sticky Appointment Booking Form */}
        <div className="detail-side-column">
          <AppointmentBookingForm room={room} />
          <div className="detail-notice-card">
            <h4>Lưu ý khi xem phòng</h4>
            <ul>
              <li>Nên đến xem phòng vào ban ngày để kiểm tra ánh sáng tự nhiên và độ thông thoáng.</li>
              <li>Kiểm tra đồng hồ điện, nước và xác nhận rõ các chi phí dịch vụ trước khi đặt cọc.</li>
              <li>Ký kết hợp đồng thuê và biên bản bàn giao phòng rõ ràng.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
