import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useRooms } from '../context/RoomContext'
import LocationPicker from '../components/LocationPicker'

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

export default function CreateRoomPage() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const { addRoom } = useRooms()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState('')
  const [city, setCity] = useState('Đà Nẵng')
  const [district, setDistrict] = useState('')
  const [address, setAddress] = useState('')
  const [price, setPrice] = useState('')
  const [area, setArea] = useState('')
  const [roomType, setRoomType] = useState<'private' | 'shared' | 'studio' | ''>('')
  const [latitude, setLatitude] = useState<number | undefined>(undefined)
  const [longitude, setLongitude] = useState<number | undefined>(undefined)
  const [amenities, setAmenities] = useState<string[]>([])
  const [images, setImages] = useState<string[]>([])
  const [description, setDescription] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    if (user) {
      setOwnerName(user.name)
      setContactPhone(user.phone)
    }
  }, [user])

  if (!isAuthenticated) {
    return (
      <div className="auth-required-box">
        <div className="auth-required-content">
          <div className="icon">🔒</div>
          <h2>Yêu cầu Đăng nhập Chủ trọ</h2>
          <p>Bạn cần đăng nhập tài khoản chủ trọ để thực hiện đăng bài cho thuê phòng.</p>
          <div className="auth-required-actions">
            <Link
              to="/login"
              state={{ from: { pathname: '/create-room' } }}
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

    // Limit maximum images
    if (images.length + validImageFiles.length > 10) {
      setError('Tối đa tải lên 10 ảnh cho mỗi phòng')
      return
    }

    validImageFiles.forEach((file) => {
      // Check file size (e.g. 5MB)
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
      // Reset input value so same files can be re-selected if needed
      e.target.value = ''
    }
  }

  // Drag & drop handlers
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

  // Remove image
  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove))
  }

  // Set image as primary thumbnail (move to index 0)
  const handleSetPrimaryImage = (index: number) => {
    if (index === 0) return
    setImages((prev) => {
      const selected = prev[index]
      const rest = prev.filter((_, idx) => idx !== index)
      return [selected, ...rest]
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!title.trim() || !address.trim() || !price || !area) {
      setError('Vui lòng điền đầy đủ các thông tin bắt buộc (*)')
      return
    }

    if (!roomType) {
      setError('Vui lòng chọn loại phòng (Phòng đơn, Phòng đôi hoặc Căn hộ mini / Studio)')
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
      setError('Vui lòng tải lên ít nhất 1 hình ảnh cho phòng trọ từ thiết bị của bạn')
      return
    }

    setIsSubmitting(true)

    const created = await addRoom({
      title: title.trim(),
      city,
      district: district.trim() || undefined,
      address: address.trim(),
      price: numPrice,
      area: numArea,
      roomType: roomType,
      latitude,
      longitude,
      amenities,
      images: images,
      description:
        description.trim() || 'Phòng sạch đẹp, thoáng mát, khu vực an ninh tốt.',
      contact: contactPhone.trim() || user?.phone || '0900 123 456',
      ownerName: ownerName.trim() || user?.name || 'Chủ trọ',
      ownerEmail: user?.email,
      status: 'available',
    })

    setIsSubmitting(false)
    navigate(`/rooms/${created.id}`)
  }

  return (
    <div className="create-room-container">
      <div className="create-room-header">
        <Link to="/my-rooms" className="back-link">
          ← Quản lý phòng của tôi
        </Link>
        <h1>Đăng Tin Cho Thuê Phòng Mới</h1>
        <p>Điền thông tin chi tiết để thu hút người tìm phòng nhanh chóng và hiệu quả nhất</p>
      </div>

      {error && <div className="auth-alert error">{error}</div>}

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

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Loại phòng <span className="req">*</span></span>
              {!roomType && (
                <span style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 500 }}>
                </span>
              )}
            </label>
            <div className="room-type-cards-grid">
              <div
                className={`room-type-card ${roomType === 'private' ? 'selected' : ''}`}
                onClick={() => setRoomType('private')}
                role="button"
                tabIndex={0}
              >
                <div className="room-type-card-header">
                  <span className="room-type-title">Phòng đơn</span>
                  <span className="room-type-radio-circle"></span>
                </div>
                <div className="room-type-desc">Phòng khép kín riêng tư cho 1-2 người, WC riêng</div>
              </div>

              <div
                className={`room-type-card ${roomType === 'shared' ? 'selected' : ''}`}
                onClick={() => setRoomType('shared')}
                role="button"
                tabIndex={0}
              >
                <div className="room-type-card-header">
                  <span className="room-type-title">Phòng đôi / Ở ghép</span>
                  <span className="room-type-radio-circle"></span>
                </div>
                <div className="room-type-desc">Dành cho 2+ người hoặc tìm bạn ở ghép</div>
              </div>

              <div
                className={`room-type-card ${roomType === 'studio' ? 'selected' : ''}`}
                onClick={() => setRoomType('studio')}
                role="button"
                tabIndex={0}
              >
                <div className="room-type-card-header">
                  <span className="room-type-title">Căn hộ / Studio</span>
                  <span className="room-type-radio-circle"></span>
                </div>
                <div className="room-type-desc">Full nội thất, có bếp và không gian riêng</div>
              </div>
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="room-price">
                Giá thuê (VNĐ/tháng) <span className="req">*</span>
              </label>
              <input
                id="room-price"
                type="number"
                required
                min={100000}
                step={50000}
                placeholder="ví dụ: 2500000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="room-area">
                Diện tích (m²) <span className="req">*</span>
              </label>
              <input
                id="room-area"
                type="number"
                required
                min={5}
                step={1}
                placeholder="ví dụ: 25"
                value={area}
                onChange={(e) => setArea(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Section 2: Vị trí & Địa chỉ */}
        <section className="form-section">
          <h3 className="section-title">
            <span className="step-num">2</span> Vị trí & Địa chỉ
          </h3>

          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="room-city">
                Thành phố / Tỉnh <span className="req">*</span>
              </label>
              <select
                id="room-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              >
                <option value="Hà Nội">Hà Nội</option>
                <option value="Đà Nẵng">Đà Nẵng</option>
                <option value="TP.HCM">TP. Hồ Chí Minh</option>
                <option value="Huế">Thừa Thiên Huế</option>
                <option value="Cần Thơ">Cần Thơ</option>
                <option value="Hải Phòng">Hải Phòng</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="room-district">
                Quận / Huyện <span className="req">*</span>
              </label>
              <input
                id="room-district"
                type="text"
                required
                placeholder="ví dụ: Hải Châu, Cầu Giấy, Quận 1..."
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="room-address">
              Địa chỉ chi tiết <span className="req">*</span>
            </label>
            <input
              id="room-address"
              type="text"
              required
              placeholder="ví dụ: 28 Nguyễn Văn Linh, Phường Nam Dương, Đà Nẵng"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <LocationPicker
            address={address}
            district={district}
            city={city}
            latitude={latitude}
            longitude={longitude}
            onChange={(coords) => {
              setLatitude(coords?.latitude)
              setLongitude(coords?.longitude)
            }}
          />
        </section>

        {/* Section 3: Tiện nghi */}
        <section className="form-section">
          <h3 className="section-title">
            <span className="step-num">3</span> Tiện nghi có sẵn trong phòng
          </h3>
          <div className="amenities-checkbox-grid">
            {DEFAULT_AMENITIES.map((item) => {
              const checked = amenities.includes(item)
              return (
                <label
                  key={item}
                  className={`amenity-checkbox-card ${checked ? 'checked' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleToggleAmenity(item)}
                  />
                  <span>{item}</span>
                </label>
              )
            })}
          </div>
        </section>

        {/* Section 4: Tải hình ảnh từ thiết bị & Mô tả */}
        <section className="form-section">
          <h3 className="section-title">
            <span className="step-num">4</span> Hình ảnh đại diện & Mô tả phòng{' '}
            <span className="req">*</span>
          </h3>

          <div className="image-upload-wrapper">
            <label className="field-label">
              Tải ảnh từ thiết bị của bạn <span className="req">*</span>
            </label>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              multiple
              onChange={handleFileChange}
              style={{ display: 'none' }}
              id="device-file-input"
            />

            {/* Drag and Drop Zone */}
            <div
              className={`upload-drop-zone ${isDragging ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="upload-icon-circle">📸</div>
              <div className="upload-instructions">
                Nhấn để chọn ảnh từ máy tính/điện thoại hoặc kéo thả vào đây
              </div>
              <p className="upload-hint">
                Hỗ trợ tệp JPG, PNG, WEBP (Tối đa 10 ảnh, dung lượng ≤ 5MB/ảnh)
              </p>
            </div>

            {/* Uploaded Images Gallery */}
            {images.length > 0 && (
              <div className="uploaded-gallery-box">
                <div className="gallery-header">
                  <span>
                    Đã tải lên <strong>{images.length}</strong> ảnh:
                  </span>
                  <span className="gallery-note">
                    (Ảnh đầu tiên sẽ là <strong>Ảnh đại diện</strong> của bài đăng)
                  </span>
                </div>

                <div className="uploaded-image-grid">
                  {images.map((imgSrc, idx) => (
                    <div
                      key={idx}
                      className={`uploaded-image-card ${idx === 0 ? 'is-primary' : ''}`}
                    >
                      <img src={imgSrc} alt={`Room upload ${idx + 1}`} />

                      {idx === 0 ? (
                        <span className="primary-badge">🌟 Ảnh đại diện</span>
                      ) : (
                        <button
                          type="button"
                          className="btn-make-primary"
                          onClick={() => handleSetPrimaryImage(idx)}
                          title="Đặt làm ảnh đại diện chính"
                        >
                          Đặt làm ảnh chính
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn-remove-image"
                        onClick={() => handleRemoveImage(idx)}
                        title="Xóa ảnh này"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}


          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label htmlFor="room-desc">Mô tả chi tiết phòng trọ</label>
            <textarea
              id="room-desc"
              rows={4}
              placeholder="Mô tả về phòng, nội thất, khu vực xung quanh, tiện ích gần đó, giờ giấc..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </section>

        {/* Section 5: Thông tin người liên hệ */}
        <section className="form-section">
          <h3 className="section-title">
            <span className="step-num">5</span> Thông tin liên hệ chủ trọ
          </h3>

          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="owner-name">Tên chủ trọ / Người liên hệ</label>
              <input
                id="owner-name"
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="owner-phone">Số điện thoại liên hệ</label>
              <input
                id="owner-phone"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>
          </div>
        </section>

        <div className="form-actions">
          <Link to="/my-rooms" className="btn-secondary">
            Hủy bỏ
          </Link>
          <button
            type="submit"
            className="btn-primary submit-create-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Đang đăng tin...' : 'Hoàn tất & Đăng phòng ngay'}
          </button>
        </div>
      </form>
    </div>
  )
}
