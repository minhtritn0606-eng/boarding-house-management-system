import { useMemo, useState } from 'react'
import { useRooms } from '../context/RoomContext'
import Pagination from '../components/Pagination'
import RoomCard from '../components/RoomCard'

export default function ListingPage() {
  const { rooms } = useRooms()

  const [city, setCity] = useState('')
  const [district, setDistrict] = useState('')
  const [minArea, setMinArea] = useState('')
  const [roomType, setRoomType] = useState('')
  const [sort, setSort] = useState('new')
  const [page, setPage] = useState(1)

  const perPage = 30

  const filtered = useMemo(() => {
    let out = rooms.filter((r) => r.status !== 'rented')
    if (city) out = out.filter((r) => r.city === city)
    if (district) out = out.filter((r) => (r.district || '').toLowerCase().includes(district.toLowerCase()))
    if (minArea) out = out.filter((r) => (r.area || 0) >= Number(minArea))
    if (roomType) out = out.filter((r) => r.roomType === roomType)

    if (sort === 'price-asc') out.sort((a, b) => a.price - b.price)
    if (sort === 'price-desc') out.sort((a, b) => b.price - a.price)
    if (sort === 'new') out.sort((a, b) => (b.postedDate || '').localeCompare(a.postedDate || ''))

    return out
  }, [rooms, city, district, minArea, roomType, sort])

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const shown = filtered.slice((page - 1) * perPage, page * perPage)

  const handleFilterChange = (setter: (v: string) => void, val: string) => {
    setter(val)
    setPage(1)
  }

  const allCities = [...new Set(rooms.map((r) => r.city))]

  return (
    <div>
      <div className="listing-header">
        <h2>Danh sách phòng ({filtered.length} phòng)</h2>
        <p className="listing-subtitle">Tối đa 30 phòng mỗi trang</p>
      </div>

      <section className="filters">
        <select value={city} onChange={(e) => handleFilterChange(setCity, e.target.value)}>
          <option value="">Tất cả thành phố</option>
          {allCities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input
          placeholder="Quận/Huyện"
          value={district}
          onChange={(e) => handleFilterChange(setDistrict, e.target.value)}
        />
        <input
          type="number"
          placeholder="Diện tích tối thiểu (m²)"
          value={minArea}
          onChange={(e) => handleFilterChange(setMinArea, e.target.value)}
        />
        <select value={roomType} onChange={(e) => handleFilterChange(setRoomType, e.target.value)}>
          <option value="">Tất cả loại phòng</option>
          <option value="private">Phòng đơn</option>
          <option value="shared">Phòng đôi</option>
          <option value="studio">Căn hộ mini / Studio</option>
        </select>
        <select value={sort} onChange={(e) => handleFilterChange(setSort, e.target.value)}>
          <option value="new">Mới đăng nhất</option>
          <option value="price-asc">Giá tăng dần</option>
          <option value="price-desc">Giá giảm dần</option>
        </select>
      </section>

      {shown.length > 0 ? (
        <section className="featured-grid">
          {shown.map((r) => (
            <RoomCard key={r.id} room={r} />
          ))}
        </section>
      ) : (
        <div className="empty-state">
          <p>Không tìm thấy phòng trọ nào phù hợp với bộ lọc hiện tại.</p>
        </div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        onChange={(p) => setPage(Math.min(Math.max(1, p), totalPages))}
      />
    </div>
  )
}
