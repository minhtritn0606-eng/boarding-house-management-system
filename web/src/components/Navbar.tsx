import { NavLink } from 'react-router-dom'

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="nav-brand">BoardingHouse</div>
      <ul className="nav-links">
        <li><NavLink to="/" end>Trang chủ</NavLink></li>
        <li><NavLink to="/rooms">Danh sách phòng</NavLink></li>
        <li><NavLink to="/contact">Liên hệ</NavLink></li>
      </ul>
    </nav>
  )
}
