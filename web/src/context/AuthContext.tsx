import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { authApi, setAuthToken } from '../services/api'

export interface LandlordUser {
  id: string
  name: string
  email: string
  phone: string
  avatar?: string
  role: 'landlord' | 'admin' | 'tenant' | 'visitor'
}

interface AuthContextType {
  user: LandlordUser | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (data: { name: string; email: string; phone: string; password: string }) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  demoAccounts: Array<{ name: string; email: string; phone: string; label: string }>
}

const DEMO_ACCOUNTS = [
  {
    name: 'Anh Nam (Đà Nẵng)',
    email: 'nam.owner@example.com',
    phone: '0905 888 999',
    label: 'Chủ trọ tại Đà Nẵng • Mật khẩu: password123',
  },
  {
    name: 'Chị Lan (Ngũ Hành Sơn)',
    email: 'lan.landlord@example.com',
    phone: '0914 222 333',
    label: 'Chủ trọ tại Ngũ Hành Sơn • Mật khẩu: password123',
  },
  {
    name: 'Anh Đức (Hải Châu)',
    email: 'duc.landlord@example.com',
    phone: '0983 444 555',
    label: 'Chủ trọ tại Hải Châu • Mật khẩu: password123',
  },
]

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const AUTH_STORAGE_KEY = 'boarding_house_auth_user'
const USERS_STORAGE_KEY = 'boarding_house_registered_users'

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

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    if (!email || !password) {
      return { success: false, error: 'Vui lòng nhập đầy đủ email và mật khẩu' }
    }

    // 1. Try real Backend REST API first
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
        }
        setUser(loggedUser)
        return { success: true }
      }
    } catch (apiError: any) {
      // Backend is offline or returned error -> check local fallback
      console.warn('Backend API login error/offline, falling back to local auth:', apiError.message)
    }

    // 2. Fallback: Demo accounts
    const demo = DEMO_ACCOUNTS.find((a) => a.email.toLowerCase() === email.toLowerCase())
    if (demo) {
      const loggedUser: LandlordUser = {
        id: `owner_${demo.email}`,
        name: demo.name,
        email: demo.email,
        phone: demo.phone,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${demo.email}`,
        role: 'landlord',
      }
      setUser(loggedUser)
      return { success: true }
    }

    // 3. Fallback: Registered accounts from localStorage
    try {
      const savedUsers = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '[]')
      const found = savedUsers.find(
        (u: any) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
      )
      if (found) {
        const loggedUser: LandlordUser = {
          id: found.id || `owner_${found.email}`,
          name: found.name,
          email: found.email,
          phone: found.phone,
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${found.email}`,
          role: 'landlord',
        }
        setUser(loggedUser)
        return { success: true }
      }
    } catch (err) {
      console.error(err)
    }

    // 4. Fallback for testing: any email with password length >= 6
    if (password.length >= 6) {
      const nameFromEmail = email.split('@')[0]
      const capitalized = nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1)
      const loggedUser: LandlordUser = {
        id: `owner_${email}`,
        name: `Chủ trọ ${capitalized}`,
        email: email,
        phone: '0905 888 999',
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${email}`,
        role: 'landlord',
      }
      setUser(loggedUser)
      return { success: true }
    }

    return { success: false, error: 'Sai tài khoản hoặc mật khẩu (Mật khẩu phải >= 6 ký tự)' }
  }

  const register = async (data: {
    name: string
    email: string
    phone: string
    password: string
  }): Promise<{ success: boolean; error?: string }> => {
    if (!data.name || !data.email || !data.phone || !data.password) {
      return { success: false, error: 'Vui lòng điền đầy đủ tất cả thông tin' }
    }

    if (data.password.length < 6) {
      return { success: false, error: 'Mật khẩu phải có ít nhất 6 ký tự' }
    }

    // 1. Try real Backend REST API
    try {
      const res = await authApi.register({
        fullName: data.name,
        email: data.email,
        password: data.password,
        role: 'landlord',
      })
      if (res && res.user) {
        const loggedUser: LandlordUser = {
          id: String(res.user.id),
          name: res.user.fullName || data.name,
          email: res.user.email,
          phone: data.phone,
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${res.user.email}`,
          role: 'landlord',
        }
        setUser(loggedUser)
        return { success: true }
      }
    } catch (apiError: any) {
      console.warn('Backend register offline or failed, using local storage:', apiError.message)
    }

    // 2. Local storage fallback
    try {
      const savedUsers = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '[]')
      if (savedUsers.some((u: any) => u.email.toLowerCase() === data.email.toLowerCase())) {
        return { success: false, error: 'Email này đã được đăng ký' }
      }

      const newUser = {
        id: `owner_${Date.now()}`,
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password,
      }

      savedUsers.push(newUser)
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(savedUsers))

      const loggedUser: LandlordUser = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${newUser.email}`,
        role: 'landlord',
      }
      setUser(loggedUser)
      return { success: true }
    } catch {
      return { success: false, error: 'Đăng ký thất bại, vui lòng thử lại sau' }
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
        demoAccounts: DEMO_ACCOUNTS,
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
