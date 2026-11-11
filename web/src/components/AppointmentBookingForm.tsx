import { useState, useRef, useMemo } from 'react'
import { appointmentApi } from '../services/api'
import type { Room } from '../data/sampleRooms'

interface AppointmentBookingFormProps {
  room: Room
}

const TIME_SLOTS = [
  'Sáng (08:30 - 11:30)',
  'Chiều (14:00 - 17:00)',
  'Tối (17:30 - 20:00)',
  'Giờ khác (Tự thỏa thuận)',
]

function getIsoDate(offsetDays: number = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatSelectedDateVi(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
      const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
      const dayName = days[d.getDay()]
      return `${dayName}, ${parts[2]}/${parts[1]}/${parts[0]}`
    }
    return dateStr
  } catch {
    return dateStr
  }
}

export default function AppointmentBookingForm({ room }: AppointmentBookingFormProps) {
  const [visitorName, setVisitorName] = useState('')
  const [phone, setPhone] = useState('')
  const [viewingDate, setViewingDate] = useState('')
  const [viewingTime, setViewingTime] = useState(TIME_SLOTS[0])
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  const dateInputRef = useRef<HTMLInputElement>(null)
  const tomorrowStr = useMemo(() => getIsoDate(1), [])
  const dayAfterStr = useMemo(() => getIsoDate(2), [])

  const isAvailable = room.status !== 'rented'

  const handleOpenCalendar = () => {
    try {
      dateInputRef.current?.showPicker?.()
    } catch {
      dateInputRef.current?.focus()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!visitorName.trim()) {
      setError('Vui lòng nhập họ và tên của bạn')
      return
    }

    if (!phone.trim()) {
      setError('Vui lòng nhập số điện thoại hoặc Zalo liên hệ')
      return
    }

    // Phone format check (Vietnamese phone standard 9-11 digits)
    const phoneClean = phone.trim().replace(/\s+/g, '')
    if (!/^[0-9]{9,11}$/.test(phoneClean)) {
      setError('Số điện thoại không hợp lệ (vui lòng nhập 10 chữ số)')
      return
    }

    if (!viewingDate) {
      setError('Vui lòng chọn ngày bạn muốn đến xem phòng')
      return
    }

    setIsSubmitting(true)

    try {
      await appointmentApi.createAppointment({
        roomId: room.id,
        visitorName: visitorName.trim(),
        phone: phoneClean,
        viewingDate,
        viewingTime,
        note: note.trim(),
      })

      setIsSuccess(true)
      window.dispatchEvent(new Event('appointment-updated'))
      window.dispatchEvent(new Event('notification-updated'))
    } catch (err: any) {
      setError(err.message || 'Không thể gửi yêu cầu đặt lịch. Vui lòng thử lại.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setIsSuccess(false)
    setVisitorName('')
    setPhone('')
    setNote('')
    setError('')
  }

  if (!isAvailable) {
    return (
      <div className="appointment-card rented-state">
        <h4 className="appointment-title">Đặt lịch xem phòng</h4>
        <p className="appointment-desc">
          Phòng trọ này hiện đã được cho thuê. Bạn có thể quay lại danh sách để tìm các phòng còn trống khác.
        </p>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="appointment-card success-state">
        <h4 className="appointment-title" style={{ color: '#065f46' }}>
          Đã gửi yêu cầu đặt lịch thành công
        </h4>
        <p className="appointment-desc">
          Thông tin của bạn đã được chuyển đến chủ trọ (<strong>{room.ownerName || 'Chủ trọ'}</strong>).
          Chủ trọ sẽ gọi điện hoặc nhắn tin Zalo qua số <strong>{phone}</strong> để xác nhận lịch hẹn với bạn.
        </p>
        <div className="appointment-summary-box">
          <div>
            <span>Phòng:</span> <strong>{room.title}</strong>
          </div>
          <div>
            <span>Ngày hẹn:</span> <strong>{formatSelectedDateVi(viewingDate) || viewingDate}</strong>
          </div>
          <div>
            <span>Khung giờ:</span> <strong>{viewingTime}</strong>
          </div>
        </div>
        <button type="button" className="btn-secondary" onClick={handleReset} style={{ width: '100%', marginTop: '12px' }}>
          Đặt thêm lịch hẹn khác
        </button>
      </div>
    )
  }

  return (
    <div className="appointment-card">
      <div className="appointment-card-header">
        <h4 className="appointment-title">Đặt lịch hẹn xem phòng</h4>
        <p className="appointment-desc">
          Gửi thông tin liên lạc và thời gian phù hợp, chủ trọ sẽ liên hệ xác nhận trực tiếp với bạn.
        </p>
      </div>

      {error && <div className="appointment-alert error">{error}</div>}

      <form onSubmit={handleSubmit} className="appointment-form">
        <div className="appointment-form-row">
          <div className="appointment-form-group">
            <label htmlFor="vis-name">Họ và tên</label>
            <input
              id="vis-name"
              type="text"
              required
              value={visitorName}
              onChange={(e) => setVisitorName(e.target.value)}
            />
          </div>

          <div className="appointment-form-group">
            <label htmlFor="vis-phone">Số điện thoại / Zalo</label>
            <input
              id="vis-phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>

        <div className="appointment-form-row">
          <div className="appointment-form-group">
            <label htmlFor="vis-date">Ngày muốn đến xem</label>
            <div className="appointment-date-picker-wrap" onClick={handleOpenCalendar}>
              <input
                ref={dateInputRef}
                id="vis-date"
                type="date"
                required
                min={tomorrowStr}
                value={viewingDate}
                onChange={(e) => setViewingDate(e.target.value)}
                className="appointment-date-input"
                title="Bấm để mở lịch chọn ngày"
              />
              <button
                type="button"
                className="calendar-picker-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  handleOpenCalendar()
                }}
                title="Mở lịch chọn ngày"
                aria-label="Mở lịch chọn ngày"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </button>
            </div>

            {/* Quick date picker shortcuts: chỉ có Ngày mai và Ngày kia */}
            <div className="quick-date-pills">
              <button
                type="button"
                className={`quick-date-pill ${viewingDate === tomorrowStr ? 'active' : ''}`}
                onClick={() => setViewingDate(tomorrowStr)}
              >
                Ngày mai
              </button>
              <button
                type="button"
                className={`quick-date-pill ${viewingDate === dayAfterStr ? 'active' : ''}`}
                onClick={() => setViewingDate(dayAfterStr)}
              >
                Ngày kia
              </button>
            </div>

            {viewingDate && (
              <div className="selected-date-preview">
                {formatSelectedDateVi(viewingDate)}
              </div>
            )}
          </div>

          <div className="appointment-form-group">
            <label htmlFor="vis-time">Khung giờ hẹn</label>
            <select
              id="vis-time"
              value={viewingTime}
              onChange={(e) => setViewingTime(e.target.value)}
            >
              {TIME_SLOTS.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="appointment-form-group">
          <label htmlFor="vis-note">Lời nhắn cho chủ trọ</label>
          <input
            id="vis-note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="btn-submit-appointment"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu đặt lịch hẹn'}
        </button>
      </form>
    </div>
  )
}
