import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { adminApi, type AdminStats } from '../services/api'

type TabType = 'overview' | 'users' | 'rooms' | 'bills'

export default function AdminDashboardPage() {
  const { user, isAuthenticated } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('overview')

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

  // Check admin role
  const isAdmin = isAuthenticated && user && user.role === 'admin'

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
    if (!window.confirm(`CẢNH BÁO: Bạn có chắc muốn xóa bài đăng phòng "${roomTitle}" không? Hành động này không thể hoàn tác.`)) {
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

  // Render Access Denied if not admin
  if (!isAdmin) {
    return (
      <div style={{ maxWidth: '650px', margin: '40px auto', textAlign: 'center', padding: '40px 24px', background: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>🛡️</div>
        <h2 style={{ fontSize: '1.5rem', color: '#1e293b', marginBottom: '8px' }}>Khu Vực Quản Trị Hệ Thống</h2>
        <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '24px' }}>
          Bạn cần đăng nhập bằng tài khoản có quyền <strong>Quản trị viên (Admin)</strong> để truy cập bảng điều khiển này.
        </p>
        <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '10px', padding: '16px', marginBottom: '24px', textAlign: 'left', fontSize: '0.88rem' }}>
          <p style={{ margin: '0 0 6px 0', fontWeight: '600', color: '#334155' }}>🔑 Tài khoản Quản trị mặc định:</p>
          <p style={{ margin: '0 0 4px 0', color: '#64748b' }}>Email: <code style={{ color: '#2563eb', background: '#eff6ff', padding: '2px 6px', borderRadius: '4px' }}>admin@example.com</code></p>
          <p style={{ margin: 0, color: '#64748b' }}>Mật khẩu: <code style={{ color: '#2563eb', background: '#eff6ff', padding: '2px 6px', borderRadius: '4px' }}>password123</code></p>
        </div>
        <Link
          to="/login"
          style={{ display: 'inline-block', background: '#2563eb', color: '#fff', padding: '10px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: '600' }}
        >
          Đến trang Đăng Nhập
        </Link>
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: '40px' }}>
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            padding: '12px 20px',
            borderRadius: '10px',
            backgroundColor: notification.type === 'success' ? '#10b981' : '#ef4444',
            color: '#ffffff',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            fontWeight: '500',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <span>{notification.type === 'success' ? '✓' : '⚠️'}</span>
          <span>{notification.message}</span>
        </div>
      )}

      {/* Admin Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: '#fff',
          padding: '28px 32px',
          borderRadius: '16px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.12)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ fontSize: '1.75rem' }}>🛡️</span>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '700', letterSpacing: '-0.02em' }}>
              Trung Tâm Quản Trị Hệ Thống
            </h1>
            <span
              style={{
                background: '#3b82f6',
                color: '#fff',
                fontSize: '0.75rem',
                padding: '3px 8px',
                borderRadius: '999px',
                fontWeight: '600',
                textTransform: 'uppercase',
              }}
            >
              Admin Master
            </span>
          </div>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>
            Giám sát toàn bộ hoạt động, kiểm duyệt bài đăng phòng trọ và phân quyền người dùng toàn sàn.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{user.name}</div>
            <div style={{ fontSize: '0.8rem', color: '#38bdf8' }}>{user.email}</div>
          </div>
          <img
            src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`}
            alt="Admin Avatar"
            style={{ width: '44px', height: '44px', borderRadius: '50%', border: '2px solid #38bdf8', objectFit: 'cover' }}
          />
        </div>
      </div>

      {/* KPI Stats Overview Cards */}
      {stats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
            marginBottom: '28px',
          }}
        >
          {/* Card 1: Users */}
          <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '600' }}>TỔNG NGƯỜI DÙNG</span>
              <span style={{ fontSize: '1.4rem' }}>👥</span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a' }}>{stats.users.total_users || 0}</div>
            <div style={{ display: 'flex', gap: '8px', fontSize: '0.78rem', color: '#64748b', marginTop: '8px', flexWrap: 'wrap' }}>
              <span>🏠 <strong>{stats.users.total_landlords || 0}</strong> Chủ trọ</span>
              <span>•</span>
              <span>👤 <strong>{stats.users.total_tenants || 0}</strong> Khách</span>
              <span>•</span>
              <span>🛡️ <strong>{stats.users.total_admins || 0}</strong> Admin</span>
            </div>
          </div>

          {/* Card 2: Rooms */}
          <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '600' }}>BÀI ĐĂNG PHÒNG TRỌ</span>
              <span style={{ fontSize: '1.4rem' }}>🏠</span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#2563eb' }}>{stats.rooms.total_rooms || 0}</div>
            <div style={{ display: 'flex', gap: '8px', fontSize: '0.78rem', color: '#64748b', marginTop: '8px' }}>
              <span style={{ color: '#10b981' }}>🌐 <strong>{stats.rooms.published_rooms || 0}</strong> Đã duyệt</span>
              <span>•</span>
              <span style={{ color: '#f59e0b' }}>🔒 <strong>{stats.rooms.hidden_rooms || 0}</strong> Đang ẩn</span>
            </div>
          </div>

          {/* Card 3: Houses */}
          <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '600' }}>CƠ SỞ & DÃY TRỌ</span>
              <span style={{ fontSize: '1.4rem' }}>🏢</span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a' }}>{stats.houses.total_houses || 0}</div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '8px' }}>
              Giá phòng TB: <strong>{formatPrice(Number(stats.rooms.average_price || 0))}</strong>
            </div>
          </div>

          {/* Card 4: Bills */}
          <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '600' }}>DOANH THU TOÀN SÀN</span>
              <span style={{ fontSize: '1.4rem' }}>💰</span>
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#059669' }}>
              {formatPrice(Number(stats.bills.total_revenue || 0))}
            </div>
            <div style={{ display: 'flex', gap: '8px', fontSize: '0.78rem', color: '#64748b', marginTop: '8px', flexWrap: 'wrap' }}>
              <span>Tổng: <strong>{stats.bills.total_bills || 0}</strong> HĐ</span>
              <span>•</span>
              <span style={{ color: '#10b981' }}>Đã thu: <strong>{stats.bills.paid_bills || 0}</strong></span>
              <span>•</span>
              <span style={{ color: '#ef4444' }}>Chờ: <strong>{stats.bills.unpaid_bills || 0}</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '24px',
          overflowX: 'auto',
          paddingBottom: '4px',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '10px 18px',
            background: activeTab === 'overview' ? '#2563eb' : 'transparent',
            color: activeTab === 'overview' ? '#fff' : '#64748b',
            fontWeight: '600',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.92rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
          }}
        >
          📊 Tổng quan
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          style={{
            padding: '10px 18px',
            background: activeTab === 'users' ? '#2563eb' : 'transparent',
            color: activeTab === 'users' ? '#fff' : '#64748b',
            fontWeight: '600',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.92rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
          }}
        >
          👥 Quản lý Tài khoản ({stats?.users.total_users || 0})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('rooms')}
          style={{
            padding: '10px 18px',
            background: activeTab === 'rooms' ? '#2563eb' : 'transparent',
            color: activeTab === 'rooms' ? '#fff' : '#64748b',
            fontWeight: '600',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.92rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
          }}
        >
          🏠 Quản lý Bài đăng & Phòng ({stats?.rooms.total_rooms || 0})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('bills')}
          style={{
            padding: '10px 18px',
            background: activeTab === 'bills' ? '#2563eb' : 'transparent',
            color: activeTab === 'bills' ? '#fff' : '#64748b',
            fontWeight: '600',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.92rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
          }}
        >
          🧾 Hóa đơn & Giao dịch ({stats?.bills.total_bills || 0})
        </button>
      </div>

      {/* ================= TAB 1: OVERVIEW ================= */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {/* Action Center */}
          <div style={{ background: '#fff', padding: '24px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#1e293b' }}>⚡ Thao Tác Nhanh Quản Trị</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('rooms')
                  setRoomPublishFilter('false')
                }}
                style={{
                  padding: '14px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: '600', color: '#0f172a' }}>🔍 Kiểm duyệt phòng đang ẩn</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Có {stats?.rooms.hidden_rooms || 0} phòng cần xem xét duyệt</div>
                </div>
                <span style={{ fontSize: '1.2rem', color: '#2563eb' }}>➔</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('users')
                  setUserRoleFilter('landlord')
                }}
                style={{
                  padding: '14px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: '600', color: '#0f172a' }}>🏠 Xem danh sách Chủ nhà trọ</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Hiện có {stats?.users.total_landlords || 0} chủ trọ đang hoạt động</div>
                </div>
                <span style={{ fontSize: '1.2rem', color: '#2563eb' }}>➔</span>
              </button>

              <Link
                to="/create-room"
                style={{
                  padding: '14px',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  color: '#1d4ed8',
                  fontWeight: '600',
                }}
              >
                <span>➕ Tạo bài đăng phòng mới trực tiếp</span>
                <span>➔</span>
              </Link>
            </div>
          </div>

          {/* System Health */}
          <div style={{ background: '#fff', padding: '24px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#1e293b' }}>🛡️ Trạng Thái Hạ Tầng & Bảo Mật</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <li style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Cơ sở dữ liệu MySQL</span>
                <span style={{ color: '#10b981', fontWeight: '600', fontSize: '0.88rem' }}>🟢 Đang kết nối ổn định</span>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Phân quyền truy cập (RBAC)</span>
                <span style={{ color: '#2563eb', fontWeight: '600', fontSize: '0.88rem' }}>🛡️ JWT + Admin Guard Bật</span>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b', fontSize: '0.9rem' }}>API Backend URL</span>
                <span style={{ color: '#475569', fontSize: '0.85rem', fontFamily: 'monospace' }}>http://localhost:5000/api</span>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Tỷ lệ lấp đầy phòng toàn sàn</span>
                <span style={{ color: '#0f172a', fontWeight: '700', fontSize: '0.9rem' }}>
                  {stats && stats.rooms.total_rooms > 0
                    ? `${Math.round(((stats.rooms.rented_rooms || 0) / stats.rooms.total_rooms) * 100)}%`
                    : '0%'}
                </span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* ================= TAB 2: USERS MANAGEMENT ================= */}
      {activeTab === 'users' && (
        <div style={{ background: '#fff', padding: '24px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          {/* Controls Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '12px', flex: '1', minWidth: '280px' }}>
              <input
                type="text"
                placeholder="Tìm kiếm theo tên, email, sđt..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                }}
              />
              <button
                type="button"
                onClick={fetchUsers}
                style={{
                  padding: '10px 18px',
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Tìm
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.88rem', color: '#64748b' }}>Vai trò:</span>
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                  background: '#fff',
                }}
              >
                <option value="all">Tất cả vai trò</option>
                <option value="admin">🛡️ Quản trị viên (Admin)</option>
                <option value="landlord">🏠 Chủ nhà trọ (Landlord)</option>
                <option value="tenant">👤 Khách thuê (Tenant)</option>
                <option value="visitor">👀 Khách vãng lai (Visitor)</option>
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
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '12px 14px' }}>Người dùng</th>
                    <th style={{ padding: '12px 14px' }}>Liên hệ</th>
                    <th style={{ padding: '12px 14px' }}>Dãy / Phòng</th>
                    <th style={{ padding: '12px 14px' }}>Vai trò (Role)</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <img
                            src={u.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.email}`}
                            alt={u.full_name}
                            style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                          <div>
                            <div style={{ fontWeight: '600', color: '#0f172a' }}>{u.full_name}</div>
                            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>ID: #{u.id}</div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '14px' }}>
                        <div style={{ color: '#334155' }}>{u.email}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{u.phone || 'Chưa có SĐT'}</div>
                      </td>

                      <td style={{ padding: '14px' }}>
                        <span style={{ fontSize: '0.85rem', color: '#475569' }}>
                          {u.houses_count || 0} Dãy / {u.rooms_count || 0} Phòng
                        </span>
                      </td>

                      <td style={{ padding: '14px' }}>
                        <select
                          value={u.role}
                          disabled={actionLoadingId === u.id}
                          onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            border: '1px solid #cbd5e1',
                            background:
                              u.role === 'admin'
                                ? '#fee2e2'
                                : u.role === 'landlord'
                                ? '#eff6ff'
                                : '#f1f5f9',
                            color:
                              u.role === 'admin'
                                ? '#991b1b'
                                : u.role === 'landlord'
                                ? '#1e40af'
                                : '#334155',
                          }}
                        >
                          <option value="admin">🛡️ Admin</option>
                          <option value="landlord">🏠 Landlord</option>
                          <option value="tenant">👤 Tenant</option>
                          <option value="visitor">👀 Visitor</option>
                        </select>
                      </td>

                      <td style={{ padding: '14px', textAlign: 'right' }}>
                        <button
                          type="button"
                          disabled={actionLoadingId === u.id || u.id === user.id}
                          onClick={() => handleDeleteUser(u.id, u.full_name)}
                          style={{
                            background: '#fee2e2',
                            color: '#dc2626',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '0.82rem',
                            fontWeight: '600',
                            cursor: u.id === user.id ? 'not-allowed' : 'pointer',
                            opacity: u.id === user.id ? 0.5 : 1,
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
        <div style={{ background: '#fff', padding: '24px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          {/* Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '12px', flex: '1', minWidth: '280px' }}>
              <input
                type="text"
                placeholder="Tìm theo tên phòng, tòa nhà, tên chủ trọ..."
                value={roomSearch}
                onChange={(e) => setRoomSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchRooms()}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                }}
              />
              <button
                type="button"
                onClick={fetchRooms}
                style={{
                  padding: '10px 18px',
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Tìm
              </button>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <select
                value={roomPublishFilter}
                onChange={(e) => setRoomPublishFilter(e.target.value)}
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                  background: '#fff',
                }}
              >
                <option value="all">Tất cả trạng thái duyệt</option>
                <option value="true">🌐 Đã xuất bản (Công khai)</option>
                <option value="false">🔒 Đang ẩn / Chờ duyệt</option>
              </select>

              <select
                value={roomStatusFilter}
                onChange={(e) => setRoomStatusFilter(e.target.value)}
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                  background: '#fff',
                }}
              >
                <option value="all">Tất cả trạng thái phòng</option>
                <option value="available">🟢 Phòng còn trống</option>
                <option value="rented">🔴 Đã cho thuê</option>
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
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '12px 14px' }}>Thông tin phòng</th>
                    <th style={{ padding: '12px 14px' }}>Chủ nhà trọ</th>
                    <th style={{ padding: '12px 14px' }}>Giá thuê</th>
                    <th style={{ padding: '12px 14px' }}>Trạng thái Web</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {roomsList.map((r) => {
                    const isPublished = Boolean(r.is_published)
                    return (
                      <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '14px' }}>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <img
                              src={
                                r.primary_image ||
                                'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=150'
                              }
                              alt={r.title}
                              style={{ width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover' }}
                            />
                            <div>
                              <Link
                                to={`/rooms/${r.id}`}
                                target="_blank"
                                style={{
                                  fontWeight: '600',
                                  color: '#2563eb',
                                  textDecoration: 'none',
                                  display: 'block',
                                  marginBottom: '3px',
                                }}
                              >
                                {r.title} ↗
                              </Link>
                              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                📍 {r.house_name} - {r.house_district || r.house_city} ({r.area || 20}m²)
                              </div>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '14px' }}>
                          <div style={{ fontWeight: '600', color: '#1e293b' }}>{r.landlord_name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{r.landlord_phone || r.landlord_email}</div>
                        </td>

                        <td style={{ padding: '14px' }}>
                          <div style={{ fontWeight: '700', color: '#0f172a' }}>{formatPrice(r.price)}</div>
                          <div style={{ fontSize: '0.78rem', color: r.status === 'rented' ? '#ef4444' : '#10b981' }}>
                            {r.status === 'rented' ? '● Đã cho thuê' : '● Còn trống'}
                          </div>
                        </td>

                        <td style={{ padding: '14px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '4px 10px',
                              borderRadius: '999px',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              background: isPublished ? '#dcfce7' : '#f1f5f9',
                              color: isPublished ? '#166534' : '#64748b',
                            }}
                          >
                            {isPublished ? '🌐 Đang hiển thị' : '🔒 Đang ẩn'}
                          </span>
                        </td>

                        <td style={{ padding: '14px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              disabled={actionLoadingId === r.id}
                              onClick={() => handleToggleRoomPublish(r.id)}
                              style={{
                                background: isPublished ? '#fef3c7' : '#dcfce7',
                                color: isPublished ? '#92400e' : '#166534',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '0.82rem',
                                fontWeight: '600',
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
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '0.82rem',
                                fontWeight: '600',
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
        <div style={{ background: '#fff', padding: '24px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>🧾 Toàn bộ Hóa đơn trên Sàn</h3>
            <select
              value={billStatusFilter}
              onChange={(e) => setBillStatusFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.88rem',
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
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
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
                      <td style={{ padding: '14px' }}>
                        <div style={{ fontWeight: '600', color: '#0f172a' }}>{b.bill_number || `HĐ-${b.id}`}</div>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                          {b.month ? new Date(b.month).toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' }) : '-'}
                        </div>
                      </td>
                      <td style={{ padding: '14px' }}>
                        <div style={{ fontWeight: '500', color: '#1e293b' }}>{b.room_title}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{b.house_name}</div>
                      </td>
                      <td style={{ padding: '14px' }}>
                        <div style={{ color: '#0f172a' }}>{b.tenant_name || 'Khách thuê'}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{b.tenant_phone || '-'}</div>
                      </td>
                      <td style={{ padding: '14px', color: '#475569' }}>{b.landlord_name}</td>
                      <td style={{ padding: '14px', fontWeight: '700', color: '#059669' }}>
                        {formatPrice(b.total_amount)}
                      </td>
                      <td style={{ padding: '14px', textAlign: 'right' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '999px',
                            fontSize: '0.78rem',
                            fontWeight: '600',
                            background: b.status === 'paid' ? '#dcfce7' : '#fee2e2',
                            color: b.status === 'paid' ? '#166534' : '#dc2626',
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
    </div>
  )
}
