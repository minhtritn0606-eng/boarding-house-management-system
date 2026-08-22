export type BillStatus = 'paid' | 'unpaid' | 'overdue'

export interface BillItem {
  id: string
  roomNumber: string
  houseName: string
  tenantName: string
  tenantPhone: string
  month: number // 1 - 12
  year: number
  
  // Room fee
  roomFee: number
  
  // Electric
  oldElectricMeter: number
  newElectricMeter: number
  electricUsage: number
  electricRate: number // default e.g. 3500 VND/kWh
  electricAmount: number
  
  // Water
  oldWaterMeter: number
  newWaterMeter: number
  waterUsage: number
  waterRate: number // default e.g. 15000 VND/m3
  waterAmount: number
  
  // Extra services
  internetFee: number
  trashFee: number
  otherFee?: number
  otherFeeNote?: string
  
  // Summary
  totalAmount: number
  status: BillStatus
  dueDate: string
  paidDate?: string
  paymentMethod?: 'cash' | 'banking'
  note?: string
}

export interface UtilitySettings {
  electricRate: number // VNĐ / kWh
  waterRate: number    // VNĐ / m3
  internetFee: number  // VNĐ / tháng
  trashFee: number     // VNĐ / tháng
}
