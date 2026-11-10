import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { authApi, setAuthToken } from '../services/api'

export interface LandlordUser {
  id: string
  name: string
  email: string
  phone: string
  avatar?: string
  role: 'landlord' | 'admin' | 'tenant' | 'visitor' | 'poster'
  approval_status?: 'pending' | 'approved' | 'rejected'
}

interface AuthContextType {
  user: LandlordUser | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; user?: LandlordUser; error?: string }>
  register: (data: {
    name: string
    email: string
    phone: string
    password: string
    role?: 'landlord' | 'poster'
    propertyName?: string
    propertyAddress?: string
    propertyImage?: string
  }) => Promise<{ success: boolean; requiresApproval?: boolean; message?: string; error?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const AUTH_STORAGE_KEY = 'boarding_house_auth_user'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LandlordUser | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY)
      }
    } catch (e) {
      console.error('Failed to save auth state to localStorage', e)
    }
  }, [user])

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; user?: LandlordUser; error?: string }> => {
    if (!email || !password) {
      return { success: false, error: 'Vui lòng nhập đầy đủ email và mật khẩu' }
    }

    try {
      const res = await authApi.login(email.trim(), password)
      if (res && res.user) {
        const loggedUser: LandlordUser = {
          id: String(res.user.id),
          name: res.user.fullName || res.user.name || email.split('@')[0],
          email: res.user.email,
          phone: res.user.phone || '0905 888 999',
          avatar: res.user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${res.user.email}`,
          role: res.user.role || 'landlord',
          approval_status: res.user.approval_status || 'approved',
        }
        setUser(loggedUser)
        return { success: true, user: loggedUser }
      }
    } catch (apiError: any) {
      return { success: false, error: apiError.message || 'Đăng nhập không thành công' }
    }

    return { success: false, error: 'Sai tài khoản hoặc mật khẩu' }
  }

  const register = async (data: {
    name: string
    email: string
    phone: string
    password: string
    role?: 'landlord' | 'poster'
    propertyName?: string
    propertyAddress?: string
    propertyImage?: string
  }): Promise<{ success: boolean; requiresApproval?: boolean; message?: string; error?: string }> => {
    if (!data.name || !data.email || !data.phone || !data.password) {
      return { success: false, error: 'Vui lòng điền đầy đủ tất cả thông tin' }
    }

    if (data.role === 'landlord' && (!data.propertyName || !data.propertyAddress)) {
      return { success: false, error: 'Chủ trọ vui lòng nhập tên nhà trọ và địa chỉ nhà trọ' }
    }

    if (data.password.length < 6) {
      return { success: false, error: 'Mật khẩu phải có ít nhất 6 ký tự' }
    }

    const selectedRole = data.role || 'landlord'

    try {
      const res = await authApi.register({
        fullName: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password,
        role: selectedRole,
        propertyName: data.propertyName,
        propertyAddress: data.propertyAddress,
        propertyImage: data.propertyImage,
      })

      if (res.requiresApproval) {
        // Tài khoản chờ Admin duyệt -> không lưu trạng thái đăng nhập
        return {
          success: true,
          requiresApproval: true,
          message: res.message || 'Đăng ký thành công! Hồ sơ đang chờ Quản trị viên xét duyệt.',
        }
      }

      if (res && res.user && res.token) {
        const loggedUser: LandlordUser = {
          id: String(res.user.id),
          name: res.user.fullName || data.name,
          email: res.user.email,
          phone: data.phone,
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${res.user.email}`,
          role: res.user.role || selectedRole,
          approval_status: 'approved',
        }
        setUser(loggedUser)
        return { success: true, requiresApproval: false }
      }

      return { success: true, requiresApproval: true, message: res.message }
    } catch (apiError: any) {
      return { success: false, error: apiError.message || 'Đăng ký thất bại' }
    }
  }

  const logout = () => {
    setAuthToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
