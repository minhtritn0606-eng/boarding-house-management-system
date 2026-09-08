import React, { createContext, useContext, useState } from 'react'
import type { LandlordUser } from '../types'
import { mobileAuthApi, setMobileAuthToken } from '../services/api'

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
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<LandlordUser | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true)
    const cleanEmail = email.trim()
    const cleanPass = password.trim()

    if (!cleanEmail || !cleanPass) {
      setIsLoading(false)
      return { success: false, error: 'Vui lòng nhập đầy đủ Email và Mật khẩu' }
    }

    try {
      const res = await mobileAuthApi.login(cleanEmail, cleanPass)
      if (res && res.user) {
        setUser({
          id: String(res.user.id),
          name: res.user.fullName || res.user.name || cleanEmail.split('@')[0],
          email: res.user.email,
          phone: res.user.phone || '0905 888 999',
          role: 'landlord',
          avatar: res.user.avatar || `https://api.dicebear.com/7.x/bottts/png?seed=${cleanEmail}`,
        })
        setIsLoading(false)
        return { success: true }
      }
    } catch (apiErr: any) {
      setIsLoading(false)
      return { success: false, error: apiErr.message || 'Đăng nhập không thành công' }
    }

    setIsLoading(false)
    return { success: false, error: 'Sai tài khoản hoặc mật khẩu' }
  }

  const register = async (data: {
    name: string
    email: string
    phone: string
    password: string
  }): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true)
    const cleanName = data.name.trim()
    const cleanEmail = data.email.trim()
    const cleanPhone = data.phone.trim()
    const cleanPass = data.password.trim()

    if (!cleanName || !cleanEmail || !cleanPhone || !cleanPass) {
      setIsLoading(false)
      return { success: false, error: 'Vui lòng điền đầy đủ tất cả thông tin' }
    }

    if (cleanPass.length < 6) {
      setIsLoading(false)
      return { success: false, error: 'Mật khẩu phải có ít nhất 6 ký tự' }
    }

    try {
      const res = await mobileAuthApi.register({
        fullName: cleanName,
        email: cleanEmail,
        password: cleanPass,
        role: 'landlord',
      })
      if (res && res.user) {
        setUser({
          id: String(res.user.id),
          name: res.user.fullName || cleanName,
          email: res.user.email,
          phone: cleanPhone,
          role: 'landlord',
          avatar: `https://api.dicebear.com/7.x/bottts/png?seed=${cleanEmail}`,
        })
        setIsLoading(false)
        return { success: true }
      }
    } catch (apiErr: any) {
      setIsLoading(false)
      return { success: false, error: apiErr.message || 'Đăng ký không thành công' }
    }

    setIsLoading(false)
    return { success: true }
  }

  const logout = () => {
    setMobileAuthToken(null)
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
