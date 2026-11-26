export interface ViewingAppointment {
  id: number
  roomId?: number
  roomTitle?: string
  roomPrice?: number
  houseName?: string
  houseAddress?: string
  visitorName: string
  phone: string
  viewingDate: string
  viewingTime: string
  note?: string
  status: 'pending' | 'confirmed' | 'cancelled'
  createdAt?: string
}
