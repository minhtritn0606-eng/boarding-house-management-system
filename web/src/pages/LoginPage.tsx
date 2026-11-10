import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, register } = useAuth()

  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<'landlord' | 'poster'>('landlord')

  // Thông tin bổ sung cho Chủ trọ
  const [propertyName, setPropertyName] = useState('')
  const [propertyAddress, setPropertyAddress] = useState('')
  const [propertyImage, setPropertyImage] = useState('')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [registerSuccess, setRegisterSuccess] = useState<{ email: string; role: string; message: string } | null>(null)

  const from = (location.state as any)?.from?.pathname || '/my-rooms'
  const message = (location.state as any)?.message

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await login(email, password)
    setLoading(false)

    if (res.success) {
      if (res.user?.role === 'admin') {
        navigate('/admin', { replace: true })
      } else {
        navigate(from, { replace: true })
      }
    } else {
      setError(res.error || 'Đăng nhập thất bại')
    }
  }

  // Xử lý chọn file ảnh từ máy tính (chuyển đổi Base64)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn file hình ảnh hợp lệ (JPG, PNG, WebP)')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Kích thước ảnh không được vượt quá 5MB')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPropertyImage(reader.result)
        setError('')
      }
    }
    reader.readAsDataURL(file)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (role === 'landlord') {
      if (!propertyName.trim()) {
        setError('Vui lòng nhập tên nhà trọ của bạn')
        return
      }
      if (!propertyAddress.trim()) {
        setError('Vui lòng nhập địa chỉ nhà trọ của bạn')
        return
      }
    }

    setLoading(true)

    const res = await register({
      name,
      email,
      phone,
      password,
      role,
      propertyName: role === 'landlord' ? propertyName.trim() : undefined,
      propertyAddress: role === 'landlord' ? propertyAddress.trim() : undefined,
      propertyImage: role === 'landlord' && propertyImage ? propertyImage : undefined,
    })
    setLoading(false)

    if (res.success) {
      if (res.requiresApproval) {
        setRegisterSuccess({
          email,
          role: role === 'landlord' ? 'Chủ nhà trọ' : 'Người đăng bài',
          message: res.message || 'Hồ sơ tài khoản của bạn đang chờ Quản trị viên xét duyệt.',
        })
      } else {
        navigate(from, { replace: true })
      }
    } else {
      setError(res.error || 'Đăng ký thất bại')
    }
  }

  return (
    <div className="auth-page-container">
      <div className="auth-card" style={{ maxWidth: '520px' }}>
        <div className="auth-header">
          <h2>Cổng Đăng Nhập & Đăng Ký</h2>
          <p>Dành cho Chủ nhà trọ và Người đăng tin cho thuê phòng</p>
        </div>

        {message && <div className="auth-alert info">{message}</div>}

        {error && (
          <div
            className="auth-alert error"
            style={{
              background: error.includes('chờ') ? '#fffbeb' : '#fef2f2',
              borderColor: error.includes('chờ') ? '#f59e0b' : '#ef4444',
              color: error.includes('chờ') ? '#b45309' : '#b91c1c',
            }}
          >
            <div style={{ fontWeight: '700', marginBottom: '2px' }}>
              {error.includes('chờ') ? 'Thông Báo Xét Duyệt' : 'Lỗi'}
            </div>
            {error}
          </div>
        )}

        {/* Màn hình thông báo đăng ký thành công chờ duyệt */}
        {registerSuccess ? (
          <div
            style={{
              padding: '28px 20px',
              textAlign: 'center',
              background: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              margin: '12px 0 24px',
            }}
          >
            <h3 style={{ margin: '0 0 8px', color: '#0f172a', fontSize: '1.2rem', fontWeight: '800' }}>
              Đăng Ký Thành Công
            </h3>
            <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: '1.5', margin: '0 0 16px' }}>
              Tài khoản vai trò <strong>{registerSuccess.role}</strong> của bạn đã được ghi nhận vào hệ thống.
            </p>

            <div
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '14px 16px',
                textAlign: 'left',
                fontSize: '0.85rem',
                color: '#334155',
                marginBottom: '20px',
              }}
            >
              <div style={{ marginBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Email đăng ký:</span> <strong>{registerSuccess.email}</strong>
              </div>
              <div style={{ color: '#b45309', fontWeight: '600' }}>
                Trạng thái: Đang chờ Quản trị viên xét duyệt
              </div>
              <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: '#64748b', lineHeight: '1.4' }}>
                Sau khi Quản trị viên đối chiếu thông tin và phê duyệt, hệ thống sẽ tự động gửi email thông báo kích hoạt đến hòm thư của bạn. Bạn chỉ có thể đăng nhập sau khi tài khoản được duyệt.
              </p>
            </div>

            <button
              type="button"
              className="btn-primary"
              style={{ width: '100%', padding: '10px 16px', fontWeight: '700' }}
              onClick={() => {
                setRegisterSuccess(null)
                setTab('login')
                setError('')
              }}
            >
              Quay lại Đăng nhập
            </button>
          </div>
        ) : (
          <>
            <div className="auth-tabs">
              <button
                type="button"
                className={`auth-tab-btn ${tab === 'login' ? 'active' : ''}`}
                onClick={() => {
                  setTab('login')
                  setError('')
                }}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                className={`auth-tab-btn ${tab === 'register' ? 'active' : ''}`}
                onClick={() => {
                  setTab('register')
                  setError('')
                }}
              >
                Đăng ký tài khoản
              </button>
            </div>

            {tab === 'login' ? (
              <form onSubmit={handleLogin} className="auth-form">
                <div className="form-group">
                  <label htmlFor="login-email">Email đăng nhập</label>
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="login-password">Mật khẩu</label>
                  <input
                    id="login-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn-primary auth-submit-btn" disabled={loading}>
                  {loading ? 'Đang xác thực...' : 'Đăng nhập'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="auth-form">
                {/* Lựa chọn vai trò khi đăng ký */}
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700' }}>
                    Chọn vai trò tài khoản:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div
                      onClick={() => setRole('landlord')}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: role === 'landlord' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        background: role === 'landlord' ? '#eff6ff' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ fontWeight: '700', color: role === 'landlord' ? '#1d4ed8' : '#1e293b', fontSize: '0.9rem' }}>
                        Chủ nhà trọ
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                        Quản lý cơ sở trọ, phòng, khách thuê và hóa đơn
                      </div>
                    </div>

                    <div
                      onClick={() => setRole('poster')}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: role === 'poster' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        background: role === 'poster' ? '#eff6ff' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ fontWeight: '700', color: role === 'poster' ? '#1d4ed8' : '#1e293b', fontSize: '0.9rem' }}>
                        Người đăng bài
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                        Đăng tin tìm khách, nhận lịch hẹn xem phòng
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="reg-name">Họ và tên</label>
                  <input
                    id="reg-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="reg-email">Email</label>
                  <input
                    id="reg-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="reg-phone">Số điện thoại</label>
                  <input
                    id="reg-phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="reg-password">Mật khẩu</label>
                  <input
                    id="reg-password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                {/* Phần thông tin bổ sung dành riêng cho Chủ trọ */}
                {role === 'landlord' && (
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '16px',
                      marginBottom: '16px',
                    }}
                  >
                    <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '12px', fontSize: '0.9rem' }}>
                      Thông tin cơ sở nhà trọ
                    </div>

                    <div className="form-group" style={{ marginBottom: '12px' }}>
                      <label htmlFor="reg-property-name" style={{ fontSize: '0.85rem' }}>
                        Tên nhà trọ <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <input
                        id="reg-property-name"
                        type="text"
                        required
                        value={propertyName}
                        onChange={(e) => setPropertyName(e.target.value)}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: '12px' }}>
                      <label htmlFor="reg-property-address" style={{ fontSize: '0.85rem' }}>
                        Địa chỉ nhà trọ <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <input
                        id="reg-property-address"
                        type="text"
                        required
                        value={propertyAddress}
                        onChange={(e) => setPropertyAddress(e.target.value)}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="reg-property-image" style={{ fontSize: '0.85rem' }}>
                        Hình ảnh nhà trọ
                      </label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                        <input
                          id="reg-property-image-file"
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          style={{ fontSize: '0.82rem' }}
                        />
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          Hoặc dán liên kết URL hình ảnh:
                        </div>
                        <input
                          id="reg-property-image"
                          type="url"
                          value={propertyImage.startsWith('data:image') ? '' : propertyImage}
                          onChange={(e) => setPropertyImage(e.target.value)}
                        />
                      </div>

                      {propertyImage && (
                        <div style={{ marginTop: '10px' }}>
                          <div style={{ fontSize: '0.78rem', color: '#475569', marginBottom: '4px' }}>
                            Xem trước hình ảnh:
                          </div>
                          <div style={{ position: 'relative', display: 'inline-block' }}>
                            <img
                              src={propertyImage}
                              alt="Xem trước nhà trọ"
                              style={{
                                width: '120px',
                                height: '80px',
                                objectFit: 'cover',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => setPropertyImage('')}
                              style={{
                                position: 'absolute',
                                top: '-6px',
                                right: '-6px',
                                background: '#dc2626',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '50%',
                                width: '20px',
                                height: '20px',
                                fontSize: '11px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title="Xóa ảnh"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    fontSize: '0.78rem',
                    color: '#64748b',
                    lineHeight: '1.4',
                    marginBottom: '14px',
                  }}
                >
                  <strong>Quy định xét duyệt:</strong> Tài khoản mới sẽ được Quản trị viên đối chiếu thông tin trước khi kích hoạt.
                </div>

                <button type="submit" className="btn-primary auth-submit-btn" disabled={loading}>
                  {loading ? 'Đang gửi thông tin...' : 'Đăng Ký Tài Khoản'}
                </button>
              </form>
            )}
          </>
        )}

        <div className="auth-back-link">
          <Link to="/">Quay về Trang chủ</Link>
        </div>
      </div>
    </div>
  )
}
