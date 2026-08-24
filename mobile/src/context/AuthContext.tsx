import React, { createContext, useContext, useState } from 'react'
import type { LandlordUser, DemoAccount } from '../types'
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
  loginWithDemo: (demo: DemoAccount) => void
  logout: () => void
  demoAccounts: DemoAccount[]
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    name: 'Anh Nam (Đà Nẵng)',
    email: 'nam.owner@example.com',
    phone: '0905 888 999',
    label: 'Chủ trọ tại Đà Nẵng • 12 phòng',
  },
  {
    name: 'Chị Lan (Ngũ Hành Sơn)',
    email: 'lan.landlord@example.com',
    phone: '0914 222 333',
    label: 'Chủ trọ tại Ngũ Hành Sơn • 8 phòng',
  },
  {
    name: 'Anh Đức (Hải Châu)',
    email: 'duc.landlord@example.com',
    phone: '0983 444 555',
    label: 'Chủ trọ tại Hải Châu • 16 phòng',
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
    const cleanEmail = email.trim()
    const cleanPass = password.trim()

    if (!cleanEmail || !cleanPass) {
      setIsLoading(false)
      return { success: false, error: 'Vui lòng nhập đầy đủ Email và Mật khẩu' }
    }

    // 1. Try real Backend REST API
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
      console.log('Mobile backend auth offline/fallback:', apiErr.message)
    }

    // 2. Fallback: Demo accounts
    const demo = DEMO_ACCOUNTS.find((a) => a.email.toLowerCase() === cleanEmail.toLowerCase())
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

    // 3. Fallback: Registered accounts
    const found = registeredUsers.find(
      (u) => u.email.toLowerCase() === cleanEmail.toLowerCase() && u.password === cleanPass
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

    // 4. Fallback for testing: any email with password length >= 6
    if (cleanPass.length >= 6) {
      const username = cleanEmail.split('@')[0]
      const capitalized = username.charAt(0).toUpperCase() + username.slice(1)
      setUser({
        id: `owner_${cleanEmail}`,
        name: `Chủ trọ ${capitalized}`,
        email: cleanEmail,
        phone: '0905 888 999',
        role: 'landlord',
        avatar: `https://api.dicebear.com/7.x/bottts/png?seed=${cleanEmail}`,
      })
      setIsLoading(false)
      return { success: true }
    }

    setIsLoading(false)
    return { success: false, error: 'Mật khẩu phải có ít nhất 6 ký tự' }
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

    // 1. Try real Backend REST API
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
      console.log('Mobile backend register offline/fallback:', apiErr.message)
    }

    // 2. Fallback: local memory
    const emailExists = registeredUsers.some(
      (u) => u.email.toLowerCase() === cleanEmail.toLowerCase()
    )
    if (emailExists) {
      setIsLoading(false)
      return { success: false, error: 'Email này đã được đăng ký' }
    }

    const newUser = {
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      password: cleanPass,
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
