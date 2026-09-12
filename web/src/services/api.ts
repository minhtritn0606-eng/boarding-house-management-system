/**
 * Web API Client Service
 * Connects React Frontend to Express Backend RESTful APIs
 */

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '')

const TOKEN_KEY = 'boarding_house_token'

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
  } catch (e) {
    console.error('Failed to set auth token', e)
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`

  const response = await fetch(url, {
    ...options,
    headers,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || `Lỗi yêu cầu máy chủ (Mã: ${response.status})`)
  }

  return data as T
}

// ================= AUTH API =================
export const authApi = {
  login: async (email: string, password: string) => {
    const res = await request<{ user: any; token: string; message?: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    if (res.token) {
      setAuthToken(res.token)
    }
    return res
  },

  register: async (data: { fullName: string; email: string; password: string; phone?: string; role?: string }) => {
    const res = await request<{ user: any; token: string; message?: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    if (res.token) {
      setAuthToken(res.token)
    }
    return res
  },
}

// ================= HOUSES API =================
export const houseApi = {
  getHouses: async () => {
    return await request<{ houses: any[] }>('/houses')
  },
  createHouse: async (data: { name: string; address: string; city: string; description?: string }) => {
    return await request<{ house: any }>('/houses', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}

// ================= ROOMS API =================
export interface RoomFilterParams {
  search?: string
  city?: string
  minPrice?: number
  maxPrice?: number
  roomType?: string
  status?: string
}

export const roomApi = {
  getPublishedRooms: async (filters: RoomFilterParams = {}) => {
    const query = new URLSearchParams()
    if (filters.search) query.append('search', filters.search)
    if (filters.city) query.append('city', filters.city)
    if (filters.minPrice !== undefined) query.append('minPrice', String(filters.minPrice))
    if (filters.maxPrice !== undefined) query.append('maxPrice', String(filters.maxPrice))
    if (filters.roomType && filters.roomType !== 'all') query.append('roomType', filters.roomType)
    if (filters.status && filters.status !== 'all') query.append('status', filters.status)

    const queryString = query.toString() ? `?${query.toString()}` : ''
    return await request<{ rooms: any[] }>(`/rooms${queryString}`)
  },

  getRoomDetails: async (id: number | string) => {
    return await request<{ room: any }>(`/rooms/${id}`)
  },

  createRoom: async (data: {
    boardingHouseId?: number | string
    title: string
    description?: string
    price: number
    roomType?: string
    area?: number
    amenities?: string
    images?: string[]
    address?: string
    city?: string
    district?: string
    latitude?: number
    longitude?: number
  }) => {
    return await request<{ room: any }>('/rooms', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  updateRoom: async (id: number | string, data: Partial<any>) => {
    return await request<{ room: any }>(`/rooms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  deleteRoom: async (id: number | string) => {
    return await request<{ message: string }>(`/rooms/${id}`, {
      method: 'DELETE',
    })
  },

  publishRoom: async (id: number | string) => {
    return await request<{ room: any }>(`/rooms/${id}/publish`, {
      method: 'PATCH',
    })
  },
}

// ================= TENANTS & CONTRACTS API =================
export const tenantApi = {
  getTenants: async () => {
    return await request<{ tenants: any[] }>('/tenants')
  },
  createTenant: async (data: any) => {
    return await request<{ tenant: any }>('/tenants', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
  updateTenant: async (id: number | string, data: any) => {
    return await request<{ tenant: any }>(`/tenants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },
  deleteTenant: async (id: number | string) => {
    return await request<{ message: string }>(`/tenants/${id}`, {
      method: 'DELETE',
    })
  },
}

export const contractApi = {
  getContracts: async () => {
    return await request<{ contracts: any[] }>('/contracts')
  },
  createContract: async (data: any) => {
    return await request<{ contract: any }>('/contracts', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}

// ================= BILLS API =================
export const billApi = {
  getBills: async () => {
    return await request<{ bills: any[] }>('/bills')
  },
  createBill: async (data: any) => {
    return await request<{ bill: any }>('/bills', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
  updateBill: async (id: number | string, data: any) => {
    return await request<{ bill: any }>(`/bills/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },
  deleteBill: async (id: number | string) => {
    return await request<{ message: string }>(`/bills/${id}`, {
      method: 'DELETE',
    })
  },
}

// ================= ADMIN API =================
export interface AdminStats {
  users: {
    total_users: number
    total_landlords: number
    total_tenants: number
    total_admins: number
    total_visitors: number
  }
  rooms: {
    total_rooms: number
    published_rooms: number
    hidden_rooms: number
    rented_rooms: number
    available_rooms: number
    average_price: number | null
  }
  houses: {
    total_houses: number
  }
  bills: {
    total_bills: number
    paid_bills: number
    unpaid_bills: number
    total_revenue: number
  }
}

export const adminApi = {
  getStats: async () => {
    return await request<AdminStats>('/admin/stats')
  },

  getUsers: async (params: { search?: string; role?: string } = {}) => {
    const query = new URLSearchParams()
    if (params.search) query.append('search', params.search)
    if (params.role && params.role !== 'all') query.append('role', params.role)
    const qs = query.toString() ? `?${query.toString()}` : ''
    return await request<{ users: any[] }>(`/admin/users${qs}`)
  },

  updateUserRole: async (userId: number | string, role: string) => {
    return await request<{ message: string; userId: number; role: string }>(`/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    })
  },

  deleteUser: async (userId: number | string) => {
    return await request<{ message: string; userId: number }>(`/admin/users/${userId}`, {
      method: 'DELETE',
    })
  },

  getRooms: async (params: { search?: string; status?: string; isPublished?: string } = {}) => {
    const query = new URLSearchParams()
    if (params.search) query.append('search', params.search)
    if (params.status && params.status !== 'all') query.append('status', params.status)
    if (params.isPublished && params.isPublished !== 'all') query.append('isPublished', params.isPublished)
    const qs = query.toString() ? `?${query.toString()}` : ''
    return await request<{ rooms: any[] }>(`/admin/rooms${qs}`)
  },

  toggleRoomPublish: async (roomId: number | string) => {
    return await request<{ message: string; roomId: number; isPublished: boolean }>(
      `/admin/rooms/${roomId}/toggle-publish`,
      {
        method: 'PATCH',
      }
    )
  },

  deleteRoom: async (roomId: number | string) => {
    return await request<{ message: string; roomId: number }>(`/admin/rooms/${roomId}`, {
      method: 'DELETE',
    })
  },

  getBills: async (params: { status?: string } = {}) => {
    const query = new URLSearchParams()
    if (params.status && params.status !== 'all') query.append('status', params.status)
    const qs = query.toString() ? `?${query.toString()}` : ''
    return await request<{ bills: any[] }>(`/admin/bills${qs}`)
  },
}

// ================= CHATBOT API =================
export interface SuggestedRoom {
  id: number
  title: string
  price: number
  area: number
  houseName: string
  district: string
  address: string
  status: string
  amenities?: string
  image: string
}

export interface ChatbotResponse {
  reply: string
  suggestedRooms?: SuggestedRoom[]
  quickReplies?: string[]
}

export const chatbotApi = {
  sendMessage: async (message: string, currentRoomId?: number | string) => {
    return await request<ChatbotResponse>('/chatbot/message', {
      method: 'POST',
      body: JSON.stringify({ message, currentRoomId }),
    })
  },
}

