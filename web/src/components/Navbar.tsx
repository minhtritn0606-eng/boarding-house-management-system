import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand">
        <span className="brand-logo">🏠</span>
        <span>BoardingHouse</span>
      </Link>

      <ul className="nav-links">
        <li>
          <NavLink to="/" end>
            Trang chủ
          </NavLink>
        </li>
        <li>
          <NavLink to="/rooms">Danh sách phòng</NavLink>
        </li>
        <li>
          <NavLink to="/contact">Liên hệ</NavLink>
        </li>
      </ul>

      <div className="nav-actions">
        <Link to="/create-room" className="btn-nav-post">
          <span className="plus-icon">+</span> Đăng tin
        </Link>

        {isAuthenticated && user ? (
          <div className="nav-user-menu">
            <Link to="/my-rooms" className="nav-user-profile" title="Quản lý phòng của tôi">
              <img
                src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`}
                alt={user.name}
                className="nav-avatar"
              />
              <span className="nav-user-name">{user.name}</span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="btn-nav-logout"
              title="Đăng xuất"
            >
              Đăng xuất
            </button>
          </div>
        ) : (
          <Link to="/login" className="btn-nav-login">
            Đăng nhập Chủ trọ
          </Link>
        )}
      </div>
    </nav>
  )
}
