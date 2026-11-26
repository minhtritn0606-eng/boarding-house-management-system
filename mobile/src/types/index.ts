export interface LandlordUser {
  id: string
  name: string
  email: string
  phone: string
  role: 'landlord' | 'poster'
  avatar?: string
}
