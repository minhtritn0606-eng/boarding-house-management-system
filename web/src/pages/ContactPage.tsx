import { useState } from 'react'

type Request = {
  id: string
  name: string
  phone: string
  email: string
  date: string
  message: string
}

export default function ContactPage() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [date, setDate] = useState('')
  const [message, setMessage] = useState('')
  const [saved, setSaved] = useState(false)

  const submit = () => {
    if (!name || !phone || !email) return alert('Vui lòng điền Họ tên, SĐT, Email')
    const req: Request = { id: String(Date.now()), name, phone, email, date, message }
    const existing = JSON.parse(localStorage.getItem('requests') || '[]')
    existing.push(req)
    localStorage.setItem('requests', JSON.stringify(existing))
    setSaved(true)
    setName(''); setPhone(''); setEmail(''); setDate(''); setMessage('')
  }

  return (
    <div>
      <h2>Liên hệ / Đặt lịch xem phòng</h2>
      {saved && <div className="saved">Yêu cầu đã được lưu.</div>}
      <div className="contact-form">
        <input placeholder="Họ tên" value={name} onChange={(e)=>setName(e.target.value)} />
        <input placeholder="Số điện thoại" value={phone} onChange={(e)=>setPhone(e.target.value)} />
        <input placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} />
        <textarea placeholder="Nội dung" value={message} onChange={(e)=>setMessage(e.target.value)} />
        <button onClick={submit}>Gửi yêu cầu</button>
      </div>
    </div>
  )
}
