import React, { createContext, useContext, useState } from 'react'
import type { LandlordUser, DemoAccount } from '../types'

interface AuthContextType {
  user: LandlordUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (data: {
    name: string
    email: string
    phone: string
    password: string
  }) => Promise<{ success: boolean; error?: string }>
  loginWithDemo: (demo: DemoAccount) => void
  logout: () => void
  demoAccounts: DemoAccount[]
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    name: 'Anh Nam (Đà Nẵng)',
    email: 'nam.owner@example.com',
    phone: '0938 123 456',
    label: 'Chủ trọ tại Đà Nẵng • 12 phòng',
  },
  {
    name: 'Chị Lan (Huế)',
    email: 'lan.owner@example.com',
    phone: '0912 234 567',
    label: 'Chủ trọ tại Huế • 8 phòng',
  },
  {
    name: 'Cô Hoa (Hà Nội)',
    email: 'hoa.owner@example.com',
    phone: '0987 654 321',
    label: 'Chủ trọ tại Hà Nội • 16 phòng',
  },
]

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<LandlordUser | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [registeredUsers, setRegisteredUsers] = useState<
    Array<{ name: string; email: string; phone: string; password: string }>
  >([])

  const loginWithDemo = (demo: DemoAccount) => {
    setUser({
      id: `owner_${demo.email}`,
      name: demo.name,
      email: demo.email,
      phone: demo.phone,
      role: 'landlord',
      avatar: `https://api.dicebear.com/7.x/bottts/png?seed=${demo.email}`,
    })
  }

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true)
    try {
      if (!email.trim() || !password.trim()) {
        setIsLoading(false)
        return { success: false, error: 'Vui lòng nhập đầy đủ Email và Mật khẩu' }
      }

      // Check if it's a demo account
      const demo = DEMO_ACCOUNTS.find((a) => a.email.toLowerCase() === email.trim().toLowerCase())
      if (demo) {
        setUser({
          id: `owner_${demo.email}`,
          name: demo.name,
          email: demo.email,
          phone: demo.phone,
          role: 'landlord',
          avatar: `https://api.dicebear.com/7.x/bottts/png?seed=${demo.email}`,
        })
        setIsLoading(false)
        return { success: true }
      }

      // Check registered accounts
      const found = registeredUsers.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
      )
      if (found) {
        setUser({
          id: `owner_${found.email}`,
          name: found.name,
          email: found.email,
          phone: found.phone,
          role: 'landlord',
          avatar: `https://api.dicebear.com/7.x/bottts/png?seed=${found.email}`,
        })
        setIsLoading(false)
        return { success: true }
      }

      // Auto login for testing if password length >= 6
      if (password.length >= 6) {
        const username = email.split('@')[0]
        const capitalized = username.charAt(0).toUpperCase() + username.slice(1)
        setUser({
          id: `owner_${email}`,
          name: `Chủ trọ ${capitalized}`,
          email: email.trim(),
          phone: '0900 123 456',
          role: 'landlord',
          avatar: `https://api.dicebear.com/7.x/bottts/png?seed=${email}`,
        })
        setIsLoading(false)
        return { success: true }
      }

      setIsLoading(false)
      return { success: false, error: 'Mật khẩu phải có ít nhất 6 ký tự' }
    } catch {
      setIsLoading(false)
      return { success: false, error: 'Đăng nhập không thành công, vui lòng thử lại' }
    }
  }

  const register = async (data: {
    name: string
    email: string
    phone: string
    password: string
  }): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true)
    try {
      if (!data.name.trim() || !data.email.trim() || !data.phone.trim() || !data.password.trim()) {
        setIsLoading(false)
        return { success: false, error: 'Vui lòng điền đầy đủ tất cả thông tin' }
      }

      if (data.password.length < 6) {
        setIsLoading(false)
        return { success: false, error: 'Mật khẩu phải có ít nhất 6 ký tự' }
      }

      const emailExists = registeredUsers.some(
        (u) => u.email.toLowerCase() === data.email.trim().toLowerCase()
      )
      if (emailExists) {
        setIsLoading(false)
        return { success: false, error: 'Email này đã được đăng ký' }
      }

      const newUser = {
        name: data.name.trim(),
        email: data.email.trim(),
        phone: data.phone.trim(),
        password: data.password,
      }

      setRegisteredUsers((prev) => [...prev, newUser])

      setUser({
        id: `owner_${newUser.email}`,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: 'landlord',
        avatar: `https://api.dicebear.com/7.x/bottts/png?seed=${newUser.email}`,
      })

      setIsLoading(false)
      return { success: true }
    } catch {
      setIsLoading(false)
      return { success: false, error: 'Đăng ký thất bại, vui lòng thử lại' }
    }
  }

  const logout = () => {
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        loginWithDemo,
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
