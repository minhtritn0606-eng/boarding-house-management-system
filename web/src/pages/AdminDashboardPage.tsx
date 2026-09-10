import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { adminApi, type AdminStats } from '../services/api'

type TabType = 'overview' | 'users' | 'rooms' | 'bills' | 'settings'

export default function AdminDashboardPage() {
  const { user, isAuthenticated, login, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  // Admin Login States
  const [loginEmail, setLoginEmail] = useState('admin@example.com')
  const [loginPassword, setLoginPassword] = useState('password123')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')

  // Data states
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [usersList, setUsersList] = useState<any[]>([])
  const [roomsList, setRoomsList] = useState<any[]>([])
  const [billsList, setBillsList] = useState<any[]>([])

  // Filter states
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('all')

  const [roomSearch, setRoomSearch] = useState('')
  const [roomStatusFilter, setRoomStatusFilter] = useState('all')
  const [roomPublishFilter, setRoomPublishFilter] = useState('all')

  const [billStatusFilter, setBillStatusFilter] = useState('all')

  // Loading & Alert states
  const [loading, setLoading] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<number | string | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, message })
    setTimeout(() => {
      setNotification(null)
    }, 4000)
  }

  const isAdmin = isAuthenticated && user && user.role === 'admin'

  // Handle Admin Direct Login
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)

    const res = await login(loginEmail, loginPassword)
    setLoginLoading(false)

    if (res.success) {
      if (res.user?.role !== 'admin') {
        setLoginError('Tài khoản này không có quyền Quản trị viên (Admin).')
      } else {
        showNotification('Đăng nhập Quản trị thành công')
      }
    } else {
      setLoginError(res.error || 'Sai tài khoản hoặc mật khẩu quản trị.')
    }
  }

  // Fetch Dashboard Stats
  const fetchStats = async () => {
    try {
      const data = await adminApi.getStats()
      setStats(data)
    } catch (err: any) {
      console.error('Error fetching admin stats:', err)
    }
  }

  // Fetch Users
  const fetchUsers = async () => {
    try {
      setLoading(true)
      const res = await adminApi.getUsers({ search: userSearch, role: userRoleFilter })
      setUsersList(res.users || [])
    } catch (err: any) {
      showNotification(err.message || 'Lỗi tải danh sách người dùng', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Fetch Rooms
  const fetchRooms = async () => {
    try {
      setLoading(true)
      const res = await adminApi.getRooms({
        search: roomSearch,
        status: roomStatusFilter,
        isPublished: roomPublishFilter,
      })
      setRoomsList(res.rooms || [])
    } catch (err: any) {
      showNotification(err.message || 'Lỗi tải danh sách phòng', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Fetch Bills
  const fetchBills = async () => {
    try {
      setLoading(true)
      const res = await adminApi.getBills({ status: billStatusFilter })
      setBillsList(res.bills || [])
    } catch (err: any) {
      showNotification(err.message || 'Lỗi tải danh sách hóa đơn', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    if (isAdmin) {
      fetchStats()
    }
  }, [isAdmin])

  useEffect(() => {
    if (!isAdmin) return

    if (activeTab === 'users') {
      fetchUsers()
    } else if (activeTab === 'rooms') {
      fetchRooms()
    } else if (activeTab === 'bills') {
      fetchBills()
    }
  }, [activeTab, userRoleFilter, roomStatusFilter, roomPublishFilter, isAdmin])

  // Handle Update Role
  const handleUpdateRole = async (userId: number, newRole: string) => {
    try {
      setActionLoadingId(userId)
      await adminApi.updateUserRole(userId, newRole)
      showNotification(`Đã cập nhật vai trò thành công cho người dùng #${userId}`)
      fetchUsers()
      fetchStats()
    } catch (err: any) {
      showNotification(err.message || 'Không thể đổi vai trò', 'error')
    } finally {
      setActionLoadingId(null)
    }
  }

  // Handle Delete User
  const handleDeleteUser = async (userId: number, userName: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa tài khoản "${userName}" (ID: ${userId}) không?`)) {
      return
    }

    try {
      setActionLoadingId(userId)
      await adminApi.deleteUser(userId)
      showNotification(`Đã xóa người dùng "${userName}"`)
      fetchUsers()
      fetchStats()
    } catch (err: any) {
      showNotification(err.message || 'Không thể xóa người dùng', 'error')
    } finally {
      setActionLoadingId(null)
    }
  }

  // Handle Toggle Room Publish
  const handleToggleRoomPublish = async (roomId: number) => {
    try {
      setActionLoadingId(roomId)
      const res = await adminApi.toggleRoomPublish(roomId)
      showNotification(res.message || 'Cập nhật trạng thái thành công')
      fetchRooms()
      fetchStats()
    } catch (err: any) {
      showNotification(err.message || 'Không thể đổi trạng thái bài đăng', 'error')
    } finally {
      setActionLoadingId(null)
    }
  }

  // Handle Delete Room
  const handleDeleteRoom = async (roomId: number, roomTitle: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa bài đăng phòng "${roomTitle}" không?`)) {
      return
    }

    try {
      setActionLoadingId(roomId)
      await adminApi.deleteRoom(roomId)
      showNotification(`Đã gỡ bỏ bài đăng "${roomTitle}"`)
      fetchRooms()
      fetchStats()
    } catch (err: any) {
      showNotification(err.message || 'Không thể xóa phòng', 'error')
    } finally {
      setActionLoadingId(null)
    }
  }

  // Format currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0)
  }

  // ================= ADMIN LOGIN SCREEN =================
  if (!isAdmin) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0f172a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        }}
      >
        <div
          style={{
            maxWidth: '440px',
            width: '100%',
            background: '#ffffff',
            borderRadius: '12px',
            padding: '36px 32px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h2 style={{ margin: '0 0 6px 0', fontSize: '1.4rem', color: '#0f172a', fontWeight: '800' }}>
              Đăng Nhập Quản Trị
            </h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
              Vui lòng đăng nhập bằng tài khoản Quản trị viên (Admin)
            </p>
          </div>

          {loginError && (
            <div
              style={{
                background: '#fee2e2',
                color: '#991b1b',
                padding: '10px 14px',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: '600',
                marginBottom: '16px',
                borderLeft: '4px solid #ef4444',
              }}
            >
              {loginError}
            </div>
          )}

          <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Email Quản trị
              </label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="admin@example.com"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Mật khẩu
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              style={{
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                padding: '12px',
                borderRadius: '6px',
                fontWeight: '700',
                fontSize: '0.92rem',
                cursor: 'pointer',
                marginTop: '6px',
                transition: 'background 0.2s',
              }}
            >
              {loginLoading ? 'Đang xác thực...' : 'Đăng Nhập'}
            </button>
          </form>

          <div style={{ marginTop: '24px', textAlign: 'center', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
            <Link
              to="/"
              style={{ color: '#64748b', fontSize: '0.85rem', textDecoration: 'none', fontWeight: '600' }}
            >
              &larr; Quay về Trang chủ Website
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 99999,
            padding: '12px 20px',
            borderRadius: '8px',
            backgroundColor: notification.type === 'success' ? '#0f172a' : '#b91c1c',
            color: '#ffffff',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            fontWeight: '600',
            fontSize: '0.88rem',
            borderLeft: notification.type === 'success' ? '4px solid #10b981' : '4px solid #f87171',
          }}
        >
          {notification.message}
        </div>
      )}

      {/* ================= DEDICATED ADMIN SIDEBAR ================= */}
      <aside
        style={{
          width: '250px',
          background: '#0f172a',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderRight: '1px solid #1e293b',
          flexShrink: 0,
        }}
      >
        <div>
          {/* Brand / Logo */}
          <div style={{ padding: '24px 20px', borderBottom: '1px solid #1e293b' }}>
            <div style={{ fontWeight: '800', fontSize: '1.15rem', letterSpacing: '-0.02em', color: '#fff' }}>
              ADMIN PORTAL
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>
              Hệ thống Quản trị Nhà trọ
            </div>
          </div>

          {/* Nav List */}
          <nav style={{ padding: '16px 12px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', padding: '0 10px 8px', letterSpacing: '0.06em' }}>
              Danh mục Quản lý
            </div>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    background: activeTab === 'overview' ? '#2563eb' : 'transparent',
                    color: activeTab === 'overview' ? '#fff' : '#94a3b8',
                    border: 'none',
                    fontWeight: activeTab === 'overview' ? '700' : '500',
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'left',
                  }}
                >
                  <span>Tổng quan KPI</span>
                </button>
              </li>

              <li>
                <button
                  type="button"
                  onClick={() => setActiveTab('users')}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    background: activeTab === 'users' ? '#2563eb' : 'transparent',
                    color: activeTab === 'users' ? '#fff' : '#94a3b8',
                    border: 'none',
                    fontWeight: activeTab === 'users' ? '700' : '500',
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'left',
                  }}
                >
                  <span>Tài khoản & Người dùng</span>
                  <span style={{ background: activeTab === 'users' ? 'rgba(255,255,255,0.2)' : '#1e293b', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600' }}>
                    {stats?.users.total_users || 0}
                  </span>
                </button>
              </li>

              <li>
                <button
                  type="button"
                  onClick={() => setActiveTab('rooms')}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    background: activeTab === 'rooms' ? '#2563eb' : 'transparent',
                    color: activeTab === 'rooms' ? '#fff' : '#94a3b8',
                    border: 'none',
                    fontWeight: activeTab === 'rooms' ? '700' : '500',
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'left',
                  }}
                >
                  <span>Bài đăng & Phòng trọ</span>
                  <span style={{ background: activeTab === 'rooms' ? 'rgba(255,255,255,0.2)' : '#1e293b', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600' }}>
                    {stats?.rooms.total_rooms || 0}
                  </span>
                </button>
              </li>

              <li>
                <button
                  type="button"
                  onClick={() => setActiveTab('bills')}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    background: activeTab === 'bills' ? '#2563eb' : 'transparent',
                    color: activeTab === 'bills' ? '#fff' : '#94a3b8',
                    border: 'none',
                    fontWeight: activeTab === 'bills' ? '700' : '500',
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'left',
                  }}
                >
                  <span>Hóa đơn & Doanh thu</span>
                  <span style={{ background: activeTab === 'bills' ? 'rgba(255,255,255,0.2)' : '#1e293b', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600' }}>
                    {stats?.bills.total_bills || 0}
                  </span>
                </button>
              </li>

              <li>
                <button
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    background: activeTab === 'settings' ? '#2563eb' : 'transparent',
                    color: activeTab === 'settings' ? '#fff' : '#94a3b8',
                    border: 'none',
                    fontWeight: activeTab === 'settings' ? '700' : '500',
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'left',
                  }}
                >
                  <span>Cài đặt & CSDL</span>
                </button>
              </li>
            </ul>
          </nav>
        </div>

        {/* Sidebar Footer Link back to website & Logout */}
        <div style={{ padding: '16px', borderTop: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '9px 14px',
              background: '#1e293b',
              color: '#93c5fd',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '0.82rem',
            }}
          >
            <span>Về Trang Chủ Web</span>
            <span>&rarr;</span>
          </Link>

          <button
            type="button"
            onClick={logout}
            style={{
              padding: '9px 14px',
              background: '#334155',
              color: '#f87171',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* ================= MAIN CONTENT VIEWPORT ================= */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowY: 'auto' }}>
        {/* Top App Bar */}
        <header
          style={{
            background: '#ffffff',
            padding: '16px 32px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: '800' }}>
              {activeTab === 'overview' && 'Bảng Điều Khiển Tổng Quan'}
              {activeTab === 'users' && 'Quản Lý Tài Khoản & Phân Quyền'}
              {activeTab === 'rooms' && 'Kiểm Duyệt & Quản Lý Phòng Trọ'}
              {activeTab === 'bills' && 'Giám Sát Hóa Đơn Toàn Sàn'}
              {activeTab === 'settings' && 'Cấu Hình Hệ Thống & Cơ Sở Dữ Liệu'}
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              Trang quản trị hệ thống
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={() => {
                fetchStats()
                if (activeTab === 'users') fetchUsers()
                if (activeTab === 'rooms') fetchRooms()
                if (activeTab === 'bills') fetchBills()
                showNotification('Đã làm mới dữ liệu')
              }}
              style={{
                padding: '8px 14px',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                color: '#334155',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Làm mới
            </button>

            <Link
              to="/rooms"
              target="_blank"
              style={{
                padding: '8px 14px',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '6px',
                color: '#2563eb',
                fontSize: '0.85rem',
                fontWeight: '600',
                textDecoration: 'none',
              }}
            >
              Xem Website &rarr;
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '8px', borderLeft: '1px solid #e2e8f0' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: '#2563eb',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '0.82rem',
                }}
              >
                AD
              </div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#0f172a' }}>
                  {user?.name || 'Quản trị viên'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Administrator</div>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Tab Body */}
        <div style={{ padding: '28px 32px' }}>
          {/* ================= TAB 1: OVERVIEW (KPI ONLY) ================= */}
          {activeTab === 'overview' && (
            <div>
              {/* 4 KPI Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '18px',
                  marginBottom: '28px',
                }}
              >
                {/* KPI 1: Users */}
                <div style={{ background: '#fff', padding: '22px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                    Tổng Người Dùng
                  </div>
                  <div style={{ fontSize: '2.1rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.1 }}>
                    {stats?.users.total_users || 0}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '0.8rem', color: '#64748b', marginTop: '12px', flexWrap: 'wrap' }}>
                    <span>Chủ trọ: <strong>{stats?.users.total_landlords || 0}</strong></span>
                    <span>|</span>
                    <span>Khách thuê: <strong>{stats?.users.total_tenants || 0}</strong></span>
                    <span>|</span>
                    <span>Admin: <strong>{stats?.users.total_admins || 0}</strong></span>
                  </div>
                </div>

                {/* KPI 2: Rooms */}
                <div style={{ background: '#fff', padding: '22px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                    Bài Đăng Phòng Trọ
                  </div>
                  <div style={{ fontSize: '2.1rem', fontWeight: '800', color: '#2563eb', lineHeight: 1.1 }}>
                    {stats?.rooms.total_rooms || 0}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '0.8rem', color: '#64748b', marginTop: '12px' }}>
                    <span style={{ color: '#15803d' }}>Đã duyệt: <strong>{stats?.rooms.published_rooms || 0}</strong></span>
                    <span>|</span>
                    <span style={{ color: '#b45309' }}>Đang ẩn: <strong>{stats?.rooms.hidden_rooms || 0}</strong></span>
                  </div>
                </div>

                {/* KPI 3: Houses */}
                <div style={{ background: '#fff', padding: '22px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                    Dãy Trọ & Cơ Sở
                  </div>
                  <div style={{ fontSize: '2.1rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.1 }}>
                    {stats?.houses.total_houses || 0}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '12px' }}>
                    Giá phòng trung bình: <strong>{formatPrice(Number(stats?.rooms.average_price || 0))}</strong>
                  </div>
                </div>

                {/* KPI 4: Revenue */}
                <div style={{ background: '#fff', padding: '22px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                    Tổng Doanh Thu Hóa Đơn
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#059669', lineHeight: 1.2 }}>
                    {formatPrice(Number(stats?.bills.total_revenue || 0))}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '0.8rem', color: '#64748b', marginTop: '12px', flexWrap: 'wrap' }}>
                    <span>Tổng hóa đơn: <strong>{stats?.bills.total_bills || 0}</strong></span>
                    <span>|</span>
                    <span style={{ color: '#15803d' }}>Đã thu: <strong>{stats?.bills.paid_bills || 0}</strong></span>
                  </div>
                </div>
              </div>

              {/* Status Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '18px' }}>
                <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '12px', fontSize: '0.95rem' }}>
                    Trạng Thái Phòng Toàn Sàn
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ color: '#64748b' }}>Phòng còn trống</span>
                      <strong style={{ color: '#15803d' }}>{stats?.rooms.available_rooms || 0} phòng</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ color: '#64748b' }}>Phòng đã có khách thuê</span>
                      <strong style={{ color: '#0f172a' }}>{stats?.rooms.rented_rooms || 0} phòng</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                      <span style={{ color: '#64748b' }}>Tỷ lệ lấp đầy</span>
                      <strong style={{ color: '#2563eb' }}>
                        {stats && stats.rooms.total_rooms > 0
                          ? `${Math.round(((stats.rooms.rented_rooms || 0) / stats.rooms.total_rooms) * 100)}%`
                          : '0%'}
                      </strong>
                    </div>
                  </div>
                </div>

                <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '12px', fontSize: '0.95rem' }}>
                    Tình Trạng Hóa Đơn
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ color: '#64748b' }}>Hóa đơn đã thanh toán</span>
                      <strong style={{ color: '#15803d' }}>{stats?.bills.paid_bills || 0} hóa đơn</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ color: '#64748b' }}>Hóa đơn chưa thanh toán</span>
                      <strong style={{ color: '#b91c1c' }}>{stats?.bills.unpaid_bills || 0} hóa đơn</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                      <span style={{ color: '#64748b' }}>Tổng giao dịch ghi nhận</span>
                      <strong style={{ color: '#0f172a' }}>{stats?.bills.total_bills || 0} hóa đơn</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: USERS MANAGEMENT ================= */}
          {activeTab === 'users' && (
            <div style={{ background: '#fff', padding: '24px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              {/* Controls Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '10px', flex: '1', minWidth: '280px' }}>
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo tên, email, sđt..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                    style={{
                      flex: 1,
                      padding: '9px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                    }}
                  />
                  <button
                    type="button"
                    onClick={fetchUsers}
                    style={{
                      padding: '9px 16px',
                      background: '#2563eb',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: '600',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    Tìm kiếm
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Vai trò:</span>
                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    style={{
                      padding: '9px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                      background: '#fff',
                    }}
                  >
                    <option value="all">Tất cả vai trò</option>
                    <option value="admin">Quản trị viên (Admin)</option>
                    <option value="landlord">Chủ nhà trọ (Landlord)</option>
                    <option value="tenant">Khách thuê (Tenant)</option>
                    <option value="visitor">Khách vãng lai (Visitor)</option>
                  </select>
                </div>
              </div>

              {/* Users Table */}
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Đang tải danh sách người dùng...</div>
              ) : usersList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Không tìm thấy người dùng nào phù hợp</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                        <th style={{ padding: '12px 14px' }}>Người dùng</th>
                        <th style={{ padding: '12px 14px' }}>Liên hệ</th>
                        <th style={{ padding: '12px 14px' }}>Dãy / Phòng</th>
                        <th style={{ padding: '12px 14px' }}>Vai trò</th>
                        <th style={{ padding: '12px 14px', textAlign: 'right' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersList.map((u) => (
                        <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <img
                                src={u.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.email}`}
                                alt={u.full_name}
                                style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }}
                              />
                              <div>
                                <div style={{ fontWeight: '700', color: '#0f172a' }}>{u.full_name}</div>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ID: #{u.id}</div>
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ color: '#334155' }}>{u.email}</div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{u.phone || 'Chưa có SĐT'}</div>
                          </td>

                          <td style={{ padding: '12px 14px' }}>
                            <span style={{ fontSize: '0.82rem', color: '#475569' }}>
                              {u.houses_count || 0} Dãy / {u.rooms_count || 0} Phòng
                            </span>
                          </td>

                          <td style={{ padding: '12px 14px' }}>
                            <select
                              value={u.role}
                              disabled={actionLoadingId === u.id}
                              onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                              style={{
                                padding: '5px 8px',
                                borderRadius: '4px',
                                fontSize: '0.82rem',
                                fontWeight: '600',
                                border: '1px solid #cbd5e1',
                                background:
                                  u.role === 'admin'
                                    ? '#fee2e2'
                                    : u.role === 'landlord'
                                    ? '#eff6ff'
                                    : '#f8fafc',
                                color:
                                  u.role === 'admin'
                                    ? '#991b1b'
                                    : u.role === 'landlord'
                                    ? '#1e40af'
                                    : '#334155',
                              }}
                            >
                              <option value="admin">Admin</option>
                              <option value="landlord">Landlord</option>
                              <option value="tenant">Tenant</option>
                              <option value="visitor">Visitor</option>
                            </select>
                          </td>

                          <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                            <button
                              type="button"
                              disabled={actionLoadingId === u.id}
                              onClick={() => handleDeleteUser(u.id, u.full_name)}
                              style={{
                                background: '#fee2e2',
                                color: '#dc2626',
                                border: 'none',
                                padding: '5px 10px',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                              }}
                            >
                              Xóa
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 3: ROOMS MODERATION ================= */}
          {activeTab === 'rooms' && (
            <div style={{ background: '#fff', padding: '24px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              {/* Controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '10px', flex: '1', minWidth: '280px' }}>
                  <input
                    type="text"
                    placeholder="Tìm theo tên phòng, tòa nhà, tên chủ trọ..."
                    value={roomSearch}
                    onChange={(e) => setRoomSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchRooms()}
                    style={{
                      flex: 1,
                      padding: '9px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                    }}
                  />
                  <button
                    type="button"
                    onClick={fetchRooms}
                    style={{
                      padding: '9px 16px',
                      background: '#2563eb',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: '600',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    Tìm kiếm
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <select
                    value={roomPublishFilter}
                    onChange={(e) => setRoomPublishFilter(e.target.value)}
                    style={{
                      padding: '9px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                      background: '#fff',
                    }}
                  >
                    <option value="all">Tất cả trạng thái duyệt</option>
                    <option value="true">Đã xuất bản (Công khai)</option>
                    <option value="false">Đang ẩn / Chờ duyệt</option>
                  </select>

                  <select
                    value={roomStatusFilter}
                    onChange={(e) => setRoomStatusFilter(e.target.value)}
                    style={{
                      padding: '9px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                      background: '#fff',
                    }}
                  >
                    <option value="all">Tất cả trạng thái phòng</option>
                    <option value="available">Phòng còn trống</option>
                    <option value="rented">Đã cho thuê</option>
                  </select>
                </div>
              </div>

              {/* Rooms Table */}
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Đang tải danh sách bài đăng phòng trọ...</div>
              ) : roomsList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Không có bài đăng phòng nào phù hợp</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                        <th style={{ padding: '12px 14px' }}>Thông tin phòng</th>
                        <th style={{ padding: '12px 14px' }}>Chủ nhà trọ</th>
                        <th style={{ padding: '12px 14px' }}>Giá thuê</th>
                        <th style={{ padding: '12px 14px' }}>Hiển thị</th>
                        <th style={{ padding: '12px 14px', textAlign: 'right' }}>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roomsList.map((r) => {
                        const isPublished = Boolean(r.is_published)
                        return (
                          <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <img
                                  src={
                                    r.primary_image ||
                                    'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=150'
                                  }
                                  alt={r.title}
                                  style={{ width: '52px', height: '52px', borderRadius: '6px', objectFit: 'cover' }}
                                />
                                <div>
                                  <Link
                                    to={`/rooms/${r.id}`}
                                    target="_blank"
                                    style={{
                                      fontWeight: '700',
                                      color: '#2563eb',
                                      textDecoration: 'none',
                                      display: 'block',
                                      marginBottom: '2px',
                                    }}
                                  >
                                    {r.title} &rarr;
                                  </Link>
                                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                    {r.house_name} - {r.house_district || r.house_city} ({r.area || 20}m²)
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ fontWeight: '700', color: '#1e293b' }}>{r.landlord_name}</div>
                              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{r.landlord_phone || r.landlord_email}</div>
                            </td>

                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ fontWeight: '800', color: '#0f172a' }}>{formatPrice(r.price)}</div>
                              <div style={{ fontSize: '0.75rem', color: r.status === 'rented' ? '#b91c1c' : '#15803d', fontWeight: '600' }}>
                                {r.status === 'rented' ? 'Đã cho thuê' : 'Còn trống'}
                              </div>
                            </td>

                            <td style={{ padding: '12px 14px' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: '700',
                                  background: isPublished ? '#dcfce7' : '#f1f5f9',
                                  color: isPublished ? '#15803d' : '#64748b',
                                }}
                              >
                                {isPublished ? 'Đang hiển thị' : 'Đang ẩn'}
                              </span>
                            </td>

                            <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                <button
                                  type="button"
                                  disabled={actionLoadingId === r.id}
                                  onClick={() => handleToggleRoomPublish(r.id)}
                                  style={{
                                    background: isPublished ? '#fef3c7' : '#dcfce7',
                                    color: isPublished ? '#92400e' : '#15803d',
                                    border: 'none',
                                    padding: '5px 10px',
                                    borderRadius: '4px',
                                    fontSize: '0.78rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                  }}
                                >
                                  {isPublished ? 'Ẩn tin' : 'Duyệt bài'}
                                </button>

                                <button
                                  type="button"
                                  disabled={actionLoadingId === r.id}
                                  onClick={() => handleDeleteRoom(r.id, r.title)}
                                  style={{
                                    background: '#fee2e2',
                                    color: '#dc2626',
                                    border: 'none',
                                    padding: '5px 10px',
                                    borderRadius: '4px',
                                    fontSize: '0.78rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Xóa
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 4: BILLS ================= */}
          {activeTab === 'bills' && (
            <div style={{ background: '#fff', padding: '24px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a', fontWeight: '700' }}>Toàn bộ Hóa đơn trên Sàn</h3>
                <select
                  value={billStatusFilter}
                  onChange={(e) => setBillStatusFilter(e.target.value)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    background: '#fff',
                  }}
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="paid">Đã thanh toán</option>
                  <option value="pending">Chưa thanh toán</option>
                </select>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Đang tải danh sách hóa đơn...</div>
              ) : billsList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Chưa có hóa đơn nào</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                        <th style={{ padding: '12px 14px' }}>Mã HĐ / Kỳ</th>
                        <th style={{ padding: '12px 14px' }}>Phòng & Khu trọ</th>
                        <th style={{ padding: '12px 14px' }}>Khách thuê</th>
                        <th style={{ padding: '12px 14px' }}>Chủ nhà trọ</th>
                        <th style={{ padding: '12px 14px' }}>Số tiền</th>
                        <th style={{ padding: '12px 14px', textAlign: 'right' }}>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {billsList.map((b) => (
                        <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontWeight: '700', color: '#0f172a' }}>{b.bill_number || `HĐ-${b.id}`}</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                              {b.month ? new Date(b.month).toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' }) : '-'}
                            </div>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontWeight: '600', color: '#1e293b' }}>{b.room_title}</div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{b.house_name}</div>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ color: '#0f172a', fontWeight: '500' }}>{b.tenant_name || 'Khách thuê'}</div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{b.tenant_phone || '-'}</div>
                          </td>
                          <td style={{ padding: '12px 14px', color: '#475569' }}>{b.landlord_name}</td>
                          <td style={{ padding: '12px 14px', fontWeight: '800', color: '#059669' }}>
                            {formatPrice(b.total_amount)}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                background: b.status === 'paid' ? '#dcfce7' : '#fee2e2',
                                color: b.status === 'paid' ? '#15803d' : '#dc2626',
                              }}
                            >
                              {b.status === 'paid' ? 'Đã thu' : 'Chưa thu'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 5: SETTINGS ================= */}
          {activeTab === 'settings' && (
            <div style={{ background: '#fff', padding: '24px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '1rem', color: '#0f172a', fontWeight: '700' }}>Cấu Hình Máy Chủ & Cơ Sở Dữ Liệu</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>MySQL Database</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Tên CSDL: <code>boarding_house_db</code></div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Cổng: <code>3306</code></div>
                </div>

                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>Backend Service</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Express API: <code>http://localhost:5000/api</code></div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Admin Router: <code>/api/admin/*</code></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
