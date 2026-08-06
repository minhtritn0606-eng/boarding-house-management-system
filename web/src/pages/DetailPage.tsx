import { useNavigate, useParams } from 'react-router-dom'
import { sampleRooms } from '../data/sampleRooms'
import Carousel from '../components/Carousel'

export default function DetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const room = sampleRooms.find((r) => String(r.id) === String(id))
  if (!room) return <div>Không tìm thấy phòng</div>

  const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(room.address)}&output=embed`

  return (
    <div>
      <button className="back-button" onClick={() => navigate(-1)}>← Quay lại</button>
      <div className="room-detail-card">
        <Carousel images={room.images} />
        <div className="room-detail-info">
          <p className="room-type">{room.roomType}</p>
          <h2>{room.title}</h2>
          <p className="room-description">{room.description}</p>
          <div className="detail-meta">
            <div>
              <strong>Giá thuê</strong>
              <p>{room.price.toLocaleString('vi-VN')}₫ / tháng</p>
            </div>
            <div>
              <strong>Diện tích</strong>
              <p>{room.area} m²</p>
            </div>
            <div>
              <strong>Trạng thái</strong>
              <p>{room.status}</p>
            </div>
          </div>

          <div className="amenities">
            <strong>Tiện nghi</strong>
            <ul>
              {(room.amenities || []).map((a) => <li key={a}>{a}</li>)}
            </ul>
          </div>

          <div className="owner-info">
            <strong>Chủ trọ</strong>
            <p>{room.ownerName}</p>
            <p>{room.contact}</p>
            <p>{room.ownerEmail}</p>
          </div>
        </div>
      </div>

      <div className="map-section">
        <h3>Vị trí phòng</h3>
        <iframe title="map" src={mapUrl} loading="lazy" />
      </div>
    </div>
  )
}
