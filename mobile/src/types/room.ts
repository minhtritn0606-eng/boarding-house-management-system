export type RoomStatus = 'available' | 'rented' | 'maintenance'

export type RoomType = 'private' | 'shared' | 'studio'

export interface MobileRoom {
  id: string
  houseName: string
  roomNumber: string
  title: string
  price: number
  area: number
  roomType: RoomType
  status: RoomStatus
  ownerEmail: string
  tenantName?: string
  tenantPhone?: string
  amenities: string[]
  floor?: number
  note?: string
}

export interface HouseBranch {
  id: string
  name: string
  address: string
  totalRooms: number
}
