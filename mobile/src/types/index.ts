export interface LandlordUser {
  id: string
  name: string
  email: string
  phone: string
  role: 'landlord'
  avatar?: string
}

export interface DemoAccount {
  name: string
  email: string
  phone: string
  label: string
}
