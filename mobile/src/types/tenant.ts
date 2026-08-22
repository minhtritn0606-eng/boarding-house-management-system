export type ContractStatus = 'active' | 'expired' | 'pending' | 'terminated'

export interface Tenant {
  id: string
  name: string
  phone: string
  email?: string
  idCard: string // CCCD / CMND
  hometown: string
  job?: string
  roomId: string
  roomNumber: string
  houseName: string
  rentStartDate: string
  rentEndDate: string
  deposit: number
  monthlyRent: number
  status: ContractStatus
  contractNumber: string
  notes?: string
}

export interface ContractItem {
  id: string
  contractNumber: string
  tenantId: string
  tenantName: string
  tenantPhone: string
  roomId: string
  roomNumber: string
  houseName: string
  startDate: string
  endDate: string
  depositAmount: number
  monthlyPrice: number
  status: ContractStatus
  createdDate: string
}
