import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, register, demoAccounts } = useAuth()

  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const from = (location.state as any)?.from?.pathname || '/my-rooms'
  const message = (location.state as any)?.message

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await login(email, password)
    setLoading(false)

    if (res.success) {
      navigate(from, { replace: true })
    } else {
      setError(res.error || 'Đăng nhập thất bại')
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await register({ name, email, phone, password })
    setLoading(false)

    if (res.success) {
      navigate(from, { replace: true })
    } else {
      setError(res.error || 'Đăng ký thất bại')
    }
  }

  const handleQuickDemoLogin = async (demoEmail: string) => {
    setError('')
    setLoading(true)
    const res = await login(demoEmail, '123456')
    setLoading(false)
    if (res.success) {
      navigate(from, { replace: true })
    }
  }

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-icon-badge">🏠</div>
          <h2>Cổng Thông Tin Chủ Trọ</h2>
          <p>Đăng nhập để đăng tin phòng trọ và quản lý danh sách cho thuê của bạn</p>
        </div>

        {message && <div className="auth-alert info">{message}</div>}
        {error && <div className="auth-alert error">{error}</div>}

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
              <label htmlFor="login-email">Email của bạn</label>
              <input
                id="login-email"
                type="email"
                required
                placeholder="ví dụ: nam.owner@example.com"
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
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-primary auth-submit-btn" disabled={loading}>
              {loading ? 'Đang xử lý...' : 'Đăng nhập'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="auth-form">
            <div className="form-group">
              <label htmlFor="reg-name">Họ và tên chủ trọ</label>
              <input
                id="reg-name"
                type="text"
                required
                placeholder="ví dụ: Nguyễn Văn A"
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
                placeholder="ví dụ: chu.tro@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-phone">Số điện thoại liên hệ</label>
              <input
                id="reg-phone"
                type="tel"
                required
                placeholder="ví dụ: 0912 345 678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-password">Mật khẩu (ít nhất 6 ký tự)</label>
              <input
                id="reg-password"
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-primary auth-submit-btn" disabled={loading}>
              {loading ? 'Đang tạo tài khoản...' : 'Đăng ký ngay'}
            </button>
          </form>
        )}

        {/* Demo Fast Login Section */}
        <div className="demo-accounts-box">
          <div className="demo-title">
            <span>⚡ Thử nghiệm nhanh với tài khoản mẫu:</span>
          </div>
          <div className="demo-list">
            {demoAccounts.map((acc) => (
              <button
                key={acc.email}
                type="button"
                className="demo-account-chip"
                onClick={() => handleQuickDemoLogin(acc.email)}
              >
                <div className="demo-name">{acc.name}</div>
                <div className="demo-label">{acc.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="auth-back-link">
          <Link to="/">← Quay về Trang chủ</Link>
        </div>
      </div>
    </div>
  )
}
