import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useRooms } from '../context/RoomContext'

const DEFAULT_AMENITIES = [
  'Wifi tốc độ cao',
  'Điều hòa',
  'Máy giặt',
  'Bình nóng lạnh',
  'Nhà vệ sinh riêng',
  'Tủ lạnh',
  'Gác lửng',
  'Chỗ để xe',
  'Ban công',
  'Thang máy',
  'Giờ giấc tự do',
  'Bếp nấu ăn',
  'Camera an ninh',
  'Bảo vệ 24/7',
]

const SAMPLE_IMAGE_PRESETS = [
  {
    name: 'Phòng hiện đại & Giường ấm',
    url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Studio đầy đủ ánh sáng',
    url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Phòng tối giản Bắc Âu',
    url: 'https://images.unsplash.com/photo-1493666438817-866a91353ca9?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Căn hộ mini ban công view đẹp',
    url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Phòng duplex có gác sang trọng',
    url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80',
  },
]

export default function EditRoomPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const { rooms, updateRoom } = useRooms()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const room = rooms.find((r) => String(r.id) === String(id))

  const [title, setTitle] = useState('')
  const [city, setCity] = useState('Đà Nẵng')
  const [district, setDistrict] = useState('')
  const [address, setAddress] = useState('')
  const [price, setPrice] = useState('')
  const [area, setArea] = useState('')
  const [roomType, setRoomType] = useState<'private' | 'shared' | 'studio'>('private')
  const [status, setStatus] = useState<'available' | 'rented'>('available')
  const [amenities, setAmenities] = useState<string[]>([])
  const [images, setImages] = useState<string[]>([])
  const [customUrl, setCustomUrl] = useState('')
  const [description, setDescription] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  // Điền dữ liệu ban đầu từ phòng cần chỉnh sửa
  useEffect(() => {
    if (room) {
      setTitle(room.title || '')
      setCity(room.city || 'Đà Nẵng')
      setDistrict(room.district || '')
      setAddress(room.address || '')
      setPrice(String(room.price || ''))
      setArea(String(room.area || ''))
      setRoomType((room.roomType as any) || 'private')
      setStatus(room.status === 'rented' ? 'rented' : 'available')
      setAmenities(room.amenities || [])
      setImages(room.images && room.images.length > 0 ? room.images : [])
      setDescription(room.description || '')
      setOwnerName(room.ownerName || user?.name || '')
      setContactPhone(room.contact || user?.phone || '')
    }
  }, [room, user])

  if (!isAuthenticated) {
    return (
      <div className="auth-required-box">
        <div className="auth-required-content">
          <div className="icon">🔒</div>
          <h2>Yêu cầu Đăng nhập</h2>
          <p>Bạn cần đăng nhập tài khoản chủ trọ để thực hiện chỉnh sửa bài đăng.</p>
          <div className="auth-required-actions">
            <Link
              to="/login"
              state={{ from: { pathname: `/rooms/${id}/edit` } }}
              className="btn-primary"
            >
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

  if (!room) {
    return (
      <div className="empty-state">
        <h3>Không tìm thấy bài đăng phòng trọ</h3>
        <p>Phòng này có thể đã bị xóa hoặc đường dẫn không chính xác.</p>
        <Link to="/my-rooms" className="btn-primary" style={{ display: 'inline-block', marginTop: '12px' }}>
          ← Về danh sách phòng của tôi
        </Link>
      </div>
    )
  }

  const handleToggleAmenity = (item: string) => {
    setAmenities((prev) =>
      prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item]
    )
  }

  // Handle file uploads from device
  const processFiles = (files: FileList | File[]) => {
    setError('')
    const fileArray = Array.from(files)
    const validImageFiles = fileArray.filter((file) => file.type.startsWith('image/'))

    if (validImageFiles.length === 0) {
      setError('Vui lòng chọn tệp định dạng hình ảnh (JPG, PNG, WEBP...)')
      return
    }

    if (images.length + validImageFiles.length > 10) {
      setError('Tối đa 10 ảnh cho mỗi phòng')
      return
    }

    validImageFiles.forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        setError(`Ảnh "${file.name}" vượt quá kích thước 5MB. Vui lòng chọn ảnh nhỏ hơn.`)
        return
      }

      const reader = new FileReader()
      reader.onload = (event) => {
        const result = event.target?.result as string
        if (result) {
          setImages((prev) => [...prev, result])
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files)
      e.target.value = ''
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files)
    }
  }

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove))
  }

  const handleSetPrimaryImage = (index: number) => {
    if (index === 0) return
    setImages((prev) => {
      const selected = prev[index]
      const rest = prev.filter((_, idx) => idx !== index)
      return [selected, ...rest]
    })
  }

  const handleAddUrl = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customUrl.trim()) return
    setImages((prev) => [...prev, customUrl.trim()])
    setCustomUrl('')
  }

  const handleAddPreset = (url: string) => {
    if (!images.includes(url)) {
      setImages((prev) => [...prev, url])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    if (!title.trim() || !address.trim() || !price || !area) {
      setError('Vui lòng điền đầy đủ các thông tin bắt buộc (*)')
      return
    }

    const numPrice = Number(price)
    const numArea = Number(area)

    if (isNaN(numPrice) || numPrice <= 0) {
      setError('Giá thuê phải là một số hợp lệ lớn hơn 0')
      return
    }

    if (isNaN(numArea) || numArea <= 0) {
      setError('Diện tích phải là một số hợp lệ lớn hơn 0')
      return
    }

    if (images.length === 0) {
      setError('Vui lòng tải lên ít nhất 1 hình ảnh cho phòng trọ')
      return
    }

    setIsSubmitting(true)

    try {
      await updateRoom(room.id, {
        title: title.trim(),
        city,
        district: district.trim() || undefined,
        address: address.trim(),
        price: numPrice,
        area: numArea,
        roomType,
        status,
        amenities,
        images,
        description: description.trim() || 'Phòng sạch đẹp, thoáng mát, khu vực an ninh tốt.',
        contact: contactPhone.trim() || user?.phone || '0900 123 456',
        ownerName: ownerName.trim() || user?.name || 'Chủ trọ',
      })

      setSuccessMsg('✅ Đã cập nhật bài đăng thành công!')
      setTimeout(() => {
        navigate(`/rooms/${room.id}`)
      }, 1000)
    } catch (err: any) {
      setError('Có lỗi xảy ra khi cập nhật bài đăng. Vui lòng thử lại.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="create-room-container">
      <div className="create-room-header">
        <Link to="/my-rooms" className="back-link">
          ← Danh sách bài đăng của tôi
        </Link>
        <h1>✏️ Chỉnh Sửa Bài Đăng Phòng Trọ</h1>
        <p>Cập nhật lại giá thuê, hình ảnh, tiện ích hoặc thông tin mô tả cho phòng trọ #{room.id}</p>
      </div>

      {error && <div className="auth-alert error">{error}</div>}
      {successMsg && <div className="auth-alert success" style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>{successMsg}</div>}

      <form onSubmit={handleSubmit} className="create-room-form">
        {/* Section 1: Thông tin cơ bản */}
        <section className="form-section">
          <h3 className="section-title">
            <span className="step-num">1</span> Thông tin cơ bản
          </h3>

          <div className="form-group">
            <label htmlFor="room-title">
              Tiêu đề bài đăng <span className="req">*</span>
            </label>
            <input
              id="room-title"
              type="text"
              required
              placeholder="ví dụ: Studio cao cấp full nội thất gần Cầu Rồng, giờ giấc tự do"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-row-3">
            <div className="form-group">
              <label htmlFor="room-type">
                Loại phòng <span className="req">*</span>
              </label>
              <select
                id="room-type"
                value={roomType}
                onChange={(e) => setRoomType(e.target.value as any)}
              >
                <option value="private">Phòng đơn (Khép kín)</option>
                <option value="shared">Phòng đôi / Ở ghép</option>
                <option value="studio">Căn hộ mini / Studio</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="room-status">
                Trạng thái phòng <span className="req">*</span>
              </label>
              <select
                id="room-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                style={{ fontWeight: 600, color: status === 'available' ? '#059669' : '#dc2626' }}
              >
                <option value="available">🟢 Còn phòng (Đang nhận khách)</option>
                <option value="rented">🔴 Đã cho thuê (Hết phòng)</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="room-city">
                Thành phố <span className="req">*</span>
              </label>
              <input
                id="room-city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="room-district">Quận / Huyện</label>
              <select
                id="room-district"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
              >
                <option value="">-- Chọn Quận/Huyện --</option>
                <option value="Hải Châu">Quận Hải Châu</option>
                <option value="Thanh Khê">Quận Thanh Khê</option>
                <option value="Sơn Trà">Quận Sơn Trà</option>
                <option value="Ngũ Hành Sơn">Quận Ngũ Hành Sơn</option>
                <option value="Liên Chiểu">Quận Liên Chiểu</option>
                <option value="Cẩm Lệ">Quận Cẩm Lệ</option>
                <option value="Hòa Vang">Huyện Hòa Vang</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="room-address">
                Địa chỉ chi tiết (Số nhà, tên đường, phường/xã) <span className="req">*</span>
              </label>
              <input
                id="room-address"
                type="text"
                required
                placeholder="ví dụ: 123 Tôn Đức Thắng, Phường Hòa Khánh Bắc"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="room-price">
                Giá thuê (VNĐ / Tháng) <span className="req">*</span>
              </label>
              <div className="input-with-suffix">
                <input
                  id="room-price"
                  type="number"
                  required
                  min="100000"
                  step="50000"
                  placeholder="ví dụ: 2500000"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
                <span className="suffix">₫/tháng</span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="room-area">
                Diện tích (m²) <span className="req">*</span>
              </label>
              <div className="input-with-suffix">
                <input
                  id="room-area"
                  type="number"
                  required
                  min="5"
                  max="300"
                  placeholder="ví dụ: 25"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                />
                <span className="suffix">m²</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Tiện ích phòng */}
        <section className="form-section">
          <h3 className="section-title">
            <span className="step-num">2</span> Tiện nghi & Cơ sở vật chất
          </h3>
          <p className="section-desc">Chọn các tiện ích đang có sẵn tại phòng trọ:</p>

          <div className="amenities-grid">
            {DEFAULT_AMENITIES.map((item) => {
              const isChecked = amenities.includes(item)
              return (
                <label
                  key={item}
                  className={`amenity-chip ${isChecked ? 'checked' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleAmenity(item)}
                  />
                  <span>{item}</span>
                </label>
              )
            })}
          </div>
        </section>

        {/* Section 3: Hình ảnh phòng */}
        <section className="form-section">
          <div className="section-title-row">
            <h3 className="section-title">
              <span className="step-num">3</span> Hình ảnh thực tế ({images.length}/10)
            </h3>
            <span className="help-badge">Ảnh đầu tiên sẽ là Ảnh Đại Diện</span>
          </div>

          <div
            className={`upload-dropzone ${isDragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept="image/*"
              style={{ display: 'none' }}
            />
            <div className="upload-icon">📸</div>
            <div className="upload-text">
              <strong>Nhấn để chọn ảnh từ máy tính / điện thoại</strong> hoặc kéo thả ảnh vào đây
            </div>
            <span className="upload-hint">Hỗ trợ JPG, PNG, WEBP (tối đa 5MB mỗi ảnh, tối đa 10 ảnh)</span>
          </div>

          {/* Grid Preview Images */}
          {images.length > 0 && (
            <div className="image-previews-grid">
              {images.map((img, index) => (
                <div key={index} className={`preview-item ${index === 0 ? 'is-primary' : ''}`}>
                  <img src={img} alt={`Phòng ${index + 1}`} />
                  <div className="preview-overlay">
                    {index === 0 ? (
                      <span className="primary-tag">⭐ Ảnh đại diện</span>
                    ) : (
                      <button
                        type="button"
                        className="btn-set-primary"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSetPrimaryImage(index)
                        }}
                        title="Đặt làm ảnh đại diện"
                      >
                        Đặt làm ảnh chính
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-remove-img"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveImage(index)
                      }}
                      title="Xóa ảnh này"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Presets & URL link */}
          <div className="preset-gallery-box">
            <div className="preset-title">💡 Hoặc chọn nhanh ảnh mẫu chất lượng cao:</div>
            <div className="preset-chips">
              {SAMPLE_IMAGE_PRESETS.map((preset) => (
                <button
                  type="button"
                  key={preset.url}
                  className="preset-btn"
                  onClick={() => handleAddPreset(preset.url)}
                >
                  ➕ {preset.name}
                </button>
              ))}
            </div>

            <div className="custom-url-row">
              <input
                type="url"
                placeholder="Hoặc dán liên kết URL ảnh trực tiếp từ internet..."
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
              />
              <button type="button" onClick={handleAddUrl} className="btn-secondary">
                Thêm URL
              </button>
            </div>
          </div>
        </section>

        {/* Section 4: Mô tả & Thông tin liên hệ */}
        <section className="form-section">
          <h3 className="section-title">
            <span className="step-num">4</span> Mô tả & Thông tin liên hệ
          </h3>

          <div className="form-group">
            <label htmlFor="room-desc">Mô tả chi tiết phòng trọ</label>
            <textarea
              id="room-desc"
              rows={4}
              placeholder="Mô tả về không gian, an ninh, quy định, môi trường xung quanh, giờ giấc..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="owner-name">Tên chủ trọ / Người đăng</label>
              <input
                id="owner-name"
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Cô Lan, Anh Tuấn..."
              />
            </div>

            <div className="form-group">
              <label htmlFor="contact-phone">Số điện thoại liên hệ (Zalo)</label>
              <input
                id="contact-phone"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="0905 123 456"
              />
            </div>
          </div>
        </section>

        {/* Form Actions */}
        <div className="form-submit-row">
          <Link to={`/rooms/${room.id}`} className="btn-cancel">
            Hủy bỏ
          </Link>
          <button
            type="submit"
            className="btn-submit-room"
            disabled={isSubmitting}
          >
            {isSubmitting ? '⏳ Đang lưu thay đổi...' : '💾 Lưu cập nhật bài đăng'}
          </button>
        </div>
      </form>
    </div>
  )
}
