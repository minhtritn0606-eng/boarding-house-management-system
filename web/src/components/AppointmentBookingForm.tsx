import { useState } from 'react'
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

export default function AppointmentBookingForm({ room }: AppointmentBookingFormProps) {
  // Tomorrow as default date (YYYY-MM-DD)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const defaultDateStr = tomorrow.toISOString().split('T')[0]

  const [visitorName, setVisitorName] = useState('')
  const [phone, setPhone] = useState('')
  const [viewingDate, setViewingDate] = useState(defaultDateStr)
  const [viewingTime, setViewingTime] = useState(TIME_SLOTS[0])
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  const isAvailable = room.status !== 'rented'

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

    // Phone format check (Vietnamese phone standard 10 digits)
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
            <span>Ngày hẹn:</span> <strong>{viewingDate}</strong>
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
            <label htmlFor="vis-name">
              Họ và tên <span className="req">*</span>
            </label>
            <input
              id="vis-name"
              type="text"
              required
              placeholder="ví dụ: Nguyễn Văn An"
              value={visitorName}
              onChange={(e) => setVisitorName(e.target.value)}
            />
          </div>

          <div className="appointment-form-group">
            <label htmlFor="vis-phone">
              Số điện thoại / Zalo <span className="req">*</span>
            </label>
            <input
              id="vis-phone"
              type="tel"
              required
              placeholder="ví dụ: 0905 123 456"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>

        <div className="appointment-form-row">
          <div className="appointment-form-group">
            <label htmlFor="vis-date">
              Ngày muốn đến xem <span className="req">*</span>
            </label>
            <input
              id="vis-date"
              type="date"
              required
              min={new Date().toISOString().split('T')[0]}
              value={viewingDate}
              onChange={(e) => setViewingDate(e.target.value)}
            />
          </div>

          <div className="appointment-form-group">
            <label htmlFor="vis-time">
              Khung giờ hẹn <span className="req">*</span>
            </label>
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
          <label htmlFor="vis-note">Lời nhắn cho chủ trọ (Tùy chọn)</label>
          <input
            id="vis-note"
            type="text"
            placeholder="ví dụ: Tôi muốn hỏi thêm về chỗ để xe máy..."
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
