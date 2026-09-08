/**
 * Mobile API Client Service
 * Connects React Native (Expo) App to Express Backend RESTful APIs
 */

import { Platform } from 'react-native'

// Host IP of backend server (your PC's LAN IP: 192.168.106.94)
const LAN_HOST = '192.168.106.94'

const getDefaultHost = () => {
  // If running on web
  if (Platform.OS === 'web') {
    return 'http://localhost:5000/api'
  }
  // For real mobile device on Wi-Fi or emulator
  return `http://${LAN_HOST}:5000/api`
}

let customApiUrl: string | null = null
let currentAuthToken: string | null = null

export const setCustomApiUrl = (url: string) => {
  customApiUrl = url.replace(/\/+$/, '')
}

export const getApiBaseUrl = () => {
  return customApiUrl || getDefaultHost()
}

export const setMobileAuthToken = (token: string | null) => {
  currentAuthToken = token
}

export const getMobileAuthToken = () => {
  return currentAuthToken
}

async function mobileRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getMobileAuthToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const url = `${getApiBaseUrl()}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`

  const response = await fetch(url, {
    ...options,
    headers,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || `Lỗi yêu cầu máy chủ (${response.status})`)
  }

  return data as T
}

// ================= AUTH =================
export const mobileAuthApi = {
  login: async (email: string, password: string) => {
    const res = await mobileRequest<{ user: any; token: string; message?: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    if (res.token) {
      setMobileAuthToken(res.token)
    }
    return res
  },

  register: async (data: { fullName: string; email: string; password: string; role?: string }) => {
    const res = await mobileRequest<{ user: any; token: string; message?: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    if (res.token) {
      setMobileAuthToken(res.token)
    }
    return res
  },
}

// ================= HOUSES =================
export const mobileHouseApi = {
  getHouses: async () => {
    return await mobileRequest<{ houses: any[] }>('/houses')
  },
}

// ================= ROOMS =================
export const mobileRoomApi = {
  getRooms: async (filters: any = {}) => {
    const query = new URLSearchParams()
    if (filters.search) query.append('search', filters.search)
    if (filters.city) query.append('city', filters.city)
    if (filters.status && filters.status !== 'all') query.append('status', filters.status)

    const queryString = query.toString() ? `?${query.toString()}` : ''
    return await mobileRequest<{ rooms: any[] }>(`/rooms${queryString}`)
  },

  createRoom: async (data: any) => {
    return await mobileRequest<{ room: any }>('/rooms', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  updateRoom: async (id: number | string, data: any) => {
    return await mobileRequest<{ room: any }>(`/rooms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  deleteRoom: async (id: number | string) => {
    return await mobileRequest<{ message: string }>(`/rooms/${id}`, {
      method: 'DELETE',
    })
  },
}

// ================= TENANTS =================
export const mobileTenantApi = {
  getTenants: async () => {
    return await mobileRequest<{ tenants: any[] }>('/tenants')
  },
  createTenant: async (data: any) => {
    return await mobileRequest<{ tenant: any }>('/tenants', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
  updateTenant: async (id: number | string, data: any) => {
    return await mobileRequest<{ tenant: any }>(`/tenants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },
  deleteTenant: async (id: number | string) => {
    return await mobileRequest<{ message: string }>(`/tenants/${id}`, {
      method: 'DELETE',
    })
  },
}

// ================= CONTRACTS =================
export const mobileContractApi = {
  getContracts: async () => {
    return await mobileRequest<{ contracts: any[] }>('/contracts')
  },
  createContract: async (data: any) => {
    return await mobileRequest<{ contract: any }>('/contracts', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}

// ================= BILLS =================
export const mobileBillApi = {
  getBills: async () => {
    return await mobileRequest<{ bills: any[] }>('/bills')
  },
  createBill: async (data: any) => {
    return await mobileRequest<{ bill: any }>('/bills', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
  updateBill: async (id: number | string, data: any) => {
    return await mobileRequest<{ bill: any }>(`/bills/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },
  deleteBill: async (id: number | string) => {
    return await mobileRequest<{ message: string }>(`/bills/${id}`, {
      method: 'DELETE',
    })
  },
}
