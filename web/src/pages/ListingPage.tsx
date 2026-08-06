import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { sampleRooms } from '../data/sampleRooms'
import Pagination from '../components/Pagination'

export default function ListingPage() {
  const [city, setCity] = useState('')
  const [district, setDistrict] = useState('')
  const [minArea, setMinArea] = useState('')
  const [roomType, setRoomType] = useState('')
  const [sort, setSort] = useState('new')
  const [page, setPage] = useState(1)

  const perPage = 6

  const filtered = useMemo(() => {
    let out = sampleRooms.filter((r) => r.status !== 'rented')
    if (city) out = out.filter((r) => r.city === city)
    if (district) out = out.filter((r) => r.district === district)
    if (minArea) out = out.filter((r) => (r.area || 0) >= Number(minArea))
    if (roomType) out = out.filter((r) => r.roomType === roomType)

    if (sort === 'price-asc') out.sort((a, b) => a.price - b.price)
    if (sort === 'price-desc') out.sort((a, b) => b.price - a.price)
    if (sort === 'new') out.sort((a, b) => (b.postedDate || '').localeCompare(a.postedDate || ''))

    return out
  }, [city, district, minArea, roomType, sort])

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const shown = filtered.slice((page - 1) * perPage, page * perPage)

  return (
    <div>
      <h2>Danh sách phòng</h2>
      <section className="filters">
        <select value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="">Tất cả thành phố</option>
          {[...new Set(sampleRooms.map((r) => r.city))].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input placeholder="Quận/Huyện" value={district} onChange={(e) => setDistrict(e.target.value)} />
        <input placeholder="Diện tích tối thiểu (m2)" value={minArea} onChange={(e) => setMinArea(e.target.value)} />
        <select value={roomType} onChange={(e) => setRoomType(e.target.value)}>
          <option value="">Tất cả loại</option>
          <option value="private">Phòng đơn</option>
          <option value="shared">Phòng đôi</option>
          <option value="studio">Căn hộ mini</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="new">Mới đăng nhất</option>
          <option value="price-asc">Giá tăng dần</option>
          <option value="price-desc">Giá giảm dần</option>
        </select>
      </section>

      <section className="room-grid">
        {shown.map((r) => (
          <article className="room-card" key={r.id}>
            <Link to={`/rooms/${r.id}`}>
              <img src={r.images?.[0] || ''} alt={r.title} />
              <div className="room-info">
                <p className="room-type">{r.roomType}</p>
                <h3>{r.title}</h3>
                <p>{r.address}</p>
                <div className="room-meta">
                  <span>{r.area} m²</span>
                  <strong>{r.price.toLocaleString('vi-VN')}₫</strong>
                </div>
              </div>
            </Link>
          </article>
        ))}
      </section>

      <Pagination page={page} totalPages={totalPages} onChange={(p) => setPage(Math.min(Math.max(1, p), totalPages))} />
    </div>
  )
}
