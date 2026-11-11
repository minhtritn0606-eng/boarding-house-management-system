import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useRooms } from '../context/RoomContext'
import Pagination from '../components/Pagination'
import RoomCard from '../components/RoomCard'

type PriceRange = 'all' | 'under1.5' | '1.5-2.5' | '2.5-4' | 'above4'

export default function ListingPage() {
  const { rooms } = useRooms()
  const [searchParams] = useSearchParams()

  const initialKeyword = searchParams.get('q') || ''
  const initialPrice = (searchParams.get('price') as PriceRange) || 'all'
  const initialDistrict = searchParams.get('district') || ''

  const [keyword, setKeyword] = useState(initialKeyword)
  const [priceRange, setPriceRange] = useState<PriceRange>(initialPrice)
  const [city, setCity] = useState('')
  const [district, setDistrict] = useState(initialDistrict)
  const [minArea, setMinArea] = useState('')
  const [roomType, setRoomType] = useState('')
  const [sort, setSort] = useState('new')
  const [page, setPage] = useState(1)

  const perPage = 30

  // Danh sách các quận/huyện tự động tổng hợp từ dữ liệu phòng và các quận chuẩn
  const allDistricts = useMemo(() => {
    const set = new Set<string>()
    rooms.forEach((r) => {
      if (r.district && r.district.trim()) {
        set.add(r.district.trim())
      }
    })
    const defaults = ['Hải Châu', 'Thanh Khê', 'Liên Chiểu', 'Ngũ Hành Sơn', 'Sơn Trà', 'Cẩm Lệ', 'Hòa Vang']
    defaults.forEach((d) => set.add(d))
    return Array.from(set).sort()
  }, [rooms])

  const filtered = useMemo(() => {
    let out = rooms.filter((r) => {
      const isNotRented = r.status !== 'rented'
      const isNotUnapproved = r.status !== 'pending' && r.status !== 'rejected'
      const isAiApproved = !r.aiReviewStatus || r.aiReviewStatus === 'approved'
      return isNotRented && isNotUnapproved && isAiApproved
    })

    // 1. Lọc theo từ khóa tự do (Keyword Search)
    if (keyword.trim()) {
      const term = keyword.trim().toLowerCase()
      out = out.filter((r) => {
        const matchTitle = (r.title || '').toLowerCase().includes(term)
        const matchDesc = (r.description || '').toLowerCase().includes(term)
        const matchAddr = (r.address || '').toLowerCase().includes(term)
        const matchDistrict = (r.district || '').toLowerCase().includes(term)
        const matchCity = (r.city || '').toLowerCase().includes(term)
        const matchAmenities = Array.isArray(r.amenities)
          ? r.amenities.some((a) => a.toLowerCase().includes(term))
          : (r.amenities || '').toLowerCase().includes(term)
        return matchTitle || matchDesc || matchAddr || matchDistrict || matchCity || matchAmenities
      })
    }

    // 2. Lọc theo khoảng giá (Price Range Filter)
    if (priceRange === 'under1.5') {
      out = out.filter((r) => r.price < 1500000)
    } else if (priceRange === '1.5-2.5') {
      out = out.filter((r) => r.price >= 1500000 && r.price <= 2500000)
    } else if (priceRange === '2.5-4') {
      out = out.filter((r) => r.price >= 2500000 && r.price <= 4000000)
    } else if (priceRange === 'above4') {
      out = out.filter((r) => r.price > 4000000)
    }

    // 3. Các bộ lọc khác
    if (city) out = out.filter((r) => r.city === city)
    if (district) out = out.filter((r) => (r.district || '').toLowerCase().includes(district.toLowerCase()))
    if (minArea) out = out.filter((r) => (r.area || 0) >= Number(minArea))
    if (roomType) out = out.filter((r) => r.roomType === roomType)

    // 4. Sắp xếp
    if (sort === 'price-asc') out.sort((a, b) => a.price - b.price)
    if (sort === 'price-desc') out.sort((a, b) => b.price - a.price)
    if (sort === 'new') out.sort((a, b) => (b.postedDate || '').localeCompare(a.postedDate || ''))

    return out
  }, [rooms, keyword, priceRange, city, district, minArea, roomType, sort])

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const shown = filtered.slice((page - 1) * perPage, page * perPage)

  const handleFilterChange = (setter: (v: any) => void, val: any) => {
    setter(val)
    setPage(1)
  }

  const hasActiveFilter = Boolean(
    keyword || priceRange !== 'all' || city || district || minArea || roomType
  )

  const handleResetFilters = () => {
    setKeyword('')
    setPriceRange('all')
    setCity('')
    setDistrict('')
    setMinArea('')
    setRoomType('')
    setSort('new')
    setPage(1)
  }

  const allCities = [...new Set(rooms.map((r) => r.city))]

  return (
    <div>
      <div className="listing-header">
        <h2>Danh sách phòng ({filtered.length} phòng)</h2>
      </div>

      {/* Khung tìm kiếm và bộ lọc nâng cao */}
      <div className="listing-search-container">
        {/* Row 1: Ô tìm kiếm từ khóa tự do */}
        <div className="search-keyword-row">
          <div className="search-keyword-box">
            <svg
              className="search-input-icon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="search-keyword-input"
              placeholder="Tìm theo tên đường, trường ĐH, tiện ích (Lê Trung Đình, Bách Khoa, full nội thất, gác lửng...)"
              value={keyword}
              onChange={(e) => handleFilterChange(setKeyword, e.target.value)}
            />
            {keyword && (
              <button
                type="button"
                className="btn-clear-search-keyword"
                onClick={() => handleFilterChange(setKeyword, '')}
                title="Xóa từ khóa"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Bộ lọc mức giá và các tiêu chí */}
        <section className="filters" style={{ marginBottom: 0 }}>
          {/* Bộ lọc mức giá */}
          <select
            value={priceRange}
            onChange={(e) => handleFilterChange(setPriceRange, e.target.value as PriceRange)}
            style={{ fontWeight: priceRange !== 'all' ? 700 : 500, color: priceRange !== 'all' ? '#0f172a' : '#475569' }}
          >
            <option value="all">Tất cả mức giá</option>
            <option value="under1.5">Dưới 1.5 triệu</option>
            <option value="1.5-2.5">1.5 – 2.5 triệu</option>
            <option value="2.5-4">2.5 – 4 triệu</option>
            <option value="above4">Trên 4 triệu</option>
          </select>

          {/* Thành phố */}
          <select value={city} onChange={(e) => handleFilterChange(setCity, e.target.value)}>
            <option value="">Tất cả thành phố</option>
            {allCities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Quận / Huyện */}
          <select value={district} onChange={(e) => handleFilterChange(setDistrict, e.target.value)}>
            <option value="">Tất cả quận/huyện</option>
            {allDistricts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Diện tích */}
          <input
            type="number"
            placeholder="Diện tích tối thiểu (m²)"
            value={minArea}
            onChange={(e) => handleFilterChange(setMinArea, e.target.value)}
          />

          {/* Loại phòng */}
          <select value={roomType} onChange={(e) => handleFilterChange(setRoomType, e.target.value)}>
            <option value="">Tất cả loại phòng</option>
            <option value="private">Phòng đơn</option>
            <option value="shared">Phòng đôi</option>
            <option value="studio">Căn hộ mini / Studio</option>
          </select>

          {/* Sắp xếp */}
          <select value={sort} onChange={(e) => handleFilterChange(setSort, e.target.value)}>
            <option value="new">Mới đăng nhất</option>
            <option value="price-asc">Giá tăng dần</option>
            <option value="price-desc">Giá giảm dần</option>
          </select>
        </section>

        {/* Row 3: Nút chọn khoảng giá nhanh & Đặt lại bộ lọc */}
        <div className="filter-tags-row">
          <div className="filter-price-pills">
            <span className="price-pills-label">Khoảng giá nhanh:</span>
            <button
              type="button"
              className={`price-pill-btn ${priceRange === 'all' ? 'active' : ''}`}
              onClick={() => handleFilterChange(setPriceRange, 'all')}
            >
              Tất cả
            </button>
            <button
              type="button"
              className={`price-pill-btn ${priceRange === 'under1.5' ? 'active' : ''}`}
              onClick={() => handleFilterChange(setPriceRange, 'under1.5')}
            >
              Dưới 1.5 tr
            </button>
            <button
              type="button"
              className={`price-pill-btn ${priceRange === '1.5-2.5' ? 'active' : ''}`}
              onClick={() => handleFilterChange(setPriceRange, '1.5-2.5')}
            >
              1.5 – 2.5 tr
            </button>
            <button
              type="button"
              className={`price-pill-btn ${priceRange === '2.5-4' ? 'active' : ''}`}
              onClick={() => handleFilterChange(setPriceRange, '2.5-4')}
            >
              2.5 – 4 tr
            </button>
            <button
              type="button"
              className={`price-pill-btn ${priceRange === 'above4' ? 'active' : ''}`}
              onClick={() => handleFilterChange(setPriceRange, 'above4')}
            >
              Trên 4 tr
            </button>
          </div>

          {hasActiveFilter && (
            <button type="button" className="btn-reset-all-filters" onClick={handleResetFilters}>
              Đặt lại bộ lọc ✕
            </button>
          )}
        </div>
      </div>

      {shown.length > 0 ? (
        <section className="featured-grid">
          {shown.map((r) => (
            <RoomCard key={r.id} room={r} />
          ))}
        </section>
      ) : (
        <div className="empty-state">
          <p>Không tìm thấy phòng trọ nào phù hợp với bộ lọc hiện tại.</p>
          {hasActiveFilter && (
            <button
              type="button"
              className="btn-secondary"
              onClick={handleResetFilters}
              style={{ marginTop: '12px' }}
            >
              Xóa các bộ lọc để xem toàn bộ phòng
            </button>
          )}
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
