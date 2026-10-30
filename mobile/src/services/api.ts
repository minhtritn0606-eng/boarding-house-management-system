/**
 * Mobile API Client Service
 * Connects React Native (Expo) App to Express Backend RESTful APIs
 */

import { Platform, NativeModules } from 'react-native'
import Constants from 'expo-constants'

// Host IP of backend server on current network (Realme 2 Hotspot: 192.168.111.41)
const LAN_HOST = '192.168.111.41'

/**
 * Trích xuất địa chỉ IP của máy tính từ bất kỳ định dạng URL nào của Expo / React Native:
 * - hostUri: "192.168.x.x:8081"
 * - experienceUrl: "exp://192.168.x.x:8081"
 * - linkingUri: "exp://192.168.x.x:8081"
 * - scriptURL: "http://192.168.x.x:8081/index.bundle?..."
 */
const extractHost = (urlOrUri: string | undefined | null): string | null => {
  if (!urlOrUri || typeof urlOrUri !== 'string') return null
  const cleaned = urlOrUri.replace(/^[a-zA-Z]+:\/\//, '').split('/')[0]
  const host = cleaned.split(':')[0]
  if (host && host !== 'localhost' && host !== '127.0.0.1' && host !== '0.0.0.0') {
    return host
  }
  return null
}

export const getDevServerHost = (): string | null => {
  try {
    const candidate =
      extractHost(Constants.expoConfig?.hostUri) ||
      extractHost((Constants as any).manifest2?.extra?.expoClient?.hostUri) ||
      extractHost((Constants as any).manifest?.debuggerHost) ||
      extractHost((Constants as any).experienceUrl) ||
      extractHost((Constants as any).linkingUri) ||
      extractHost(NativeModules?.SourceCode?.scriptURL)

    if (candidate) {
      return candidate
    }
  } catch {
    // ignore
  }
  return null
}

export const getDefaultHost = () => {
  // If running on web browser
  if (Platform.OS === 'web') {
    return 'http://localhost:5000/api'
  }

  // 1. Tự động nhận diện IP máy tính từ mã QR Expo / Metro Bundler
  const autoHost = getDevServerHost()
  if (autoHost) {
    return `http://${autoHost}:5000/api`
  }

  // 2. Dự phòng IP khi chạy không có kết nối Metro
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

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(data.message || `Lỗi yêu cầu máy chủ (${response.status})`)
    }

    return data as T
  } catch (error: any) {
    console.log(`[API Connection] Lỗi kết nối tới: ${url} (${error.message})`)
    throw error
  }
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
    if (filters.mine !== undefined) {
      query.append('mine', String(filters.mine))
    } else {
      query.append('mine', 'true') // Default for mobile app: landlord's own rooms
    }

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

  publishRoom: async (id: number | string, isPublished?: boolean) => {
    return await mobileRequest<{ message: string; room: any }>(`/rooms/${id}/publish`, {
      method: 'POST',
      body: JSON.stringify({ isPublished }),
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
