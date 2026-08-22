import React, { createContext, useContext, useState } from 'react'
import type { Tenant, ContractStatus } from '../types/tenant'

interface TenantContextType {
  tenants: Tenant[]
  addTenant: (tenant: Omit<Tenant, 'id' | 'contractNumber'>) => void
  updateTenant: (id: string, updatedData: Partial<Tenant>) => void
  deleteTenant: (id: string) => void
  updateContractStatus: (id: string, status: ContractStatus) => void
  getTenantsByHouse: (houseName?: string) => Tenant[]
}

const INITIAL_TENANTS: Tenant[] = [
  {
    id: 'tenant_1',
    contractNumber: 'HD-2026-101',
    name: 'Nguyễn Văn Hùng',
    phone: '0978 111 222',
    email: 'hung.nguyen@example.com',
    idCard: '048201009876',
    hometown: 'Quảng Nam',
    job: 'Kỹ sư phần mềm',
    roomId: 'm_room_101',
    roomNumber: 'P.101',
    houseName: 'Dãy trọ Hòa Khánh (Đà Nẵng)',
    rentStartDate: '2026-01-01',
    rentEndDate: '2026-12-31',
    deposit: 2500000,
    monthlyRent: 2500000,
    status: 'active',
    notes: 'Khách đóng tiền đúng hạn ngày 05 hàng tháng',
  },
  {
    id: 'tenant_2',
    contractNumber: 'HD-2026-102',
    name: 'Trần Thị Mai',
    phone: '0912 333 444',
    email: 'mai.tran@example.com',
    idCard: '048202008765',
    hometown: 'Huế',
    job: 'Kế toán viên',
    roomId: 'm_room_102',
    roomNumber: 'P.102',
    houseName: 'Dãy trọ Hòa Khánh (Đà Nẵng)',
    rentStartDate: '2026-02-15',
    rentEndDate: '2027-02-14',
    deposit: 2200000,
    monthlyRent: 2200000,
    status: 'active',
  },
  {
    id: 'tenant_3',
    contractNumber: 'HD-2026-201',
    name: 'Lê Hoàng Long',
    phone: '0905 555 666',
    email: 'long.le@example.com',
    idCard: '048203007654',
    hometown: 'Đà Nẵng',
    job: 'Sinh viên ĐH Bách Khoa',
    roomId: 'm_room_201',
    roomNumber: 'P.201',
    houseName: 'Dãy trọ Hòa Khánh (Đà Nẵng)',
    rentStartDate: '2025-09-01',
    rentEndDate: '2026-08-31',
    deposit: 3200000,
    monthlyRent: 3200000,
    status: 'active',
    notes: 'Ở cùng 1 bạn cùng phòng',
  },
  {
    id: 'tenant_4',
    contractNumber: 'HD-2026-203',
    name: 'Phạm Quỳnh Như',
    phone: '0934 777 888',
    email: 'nhu.pham@example.com',
    idCard: '048204006543',
    hometown: 'Quảng Ngãi',
    job: 'Nhân viên văn phòng',
    roomId: 'm_room_203',
    roomNumber: 'P.203',
    houseName: 'Dãy trọ Hòa Khánh (Đà Nẵng)',
    rentStartDate: '2026-03-01',
    rentEndDate: '2027-02-28',
    deposit: 2400000,
    monthlyRent: 2400000,
    status: 'active',
  },
  {
    id: 'tenant_5',
    contractNumber: 'HD-2026-301',
    name: 'Võ Minh Trí',
    phone: '0988 999 000',
    email: 'tri.vo@example.com',
    idCard: '048205005432',
    hometown: 'Gia Lai',
    job: 'Kỹ sư cầu đường',
    roomId: 'm_room_301',
    roomNumber: 'P.301',
    houseName: 'Nhà trọ Cẩm Lệ (Đà Nẵng)',
    rentStartDate: '2025-11-01',
    rentEndDate: '2026-10-31',
    deposit: 4000000,
    monthlyRent: 4000000,
    status: 'active',
  },
]

const TenantContext = createContext<TenantContextType | undefined>(undefined)

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenants, setTenants] = useState<Tenant[]>(INITIAL_TENANTS)

  const getTenantsByHouse = (houseName?: string) => {
    if (!houseName || houseName === 'all') return tenants
    return tenants.filter((t) => t.houseName.toLowerCase() === houseName.toLowerCase())
  }

  const addTenant = (tenantData: Omit<Tenant, 'id' | 'contractNumber'>) => {
    const nextSeq = tenants.length + 1
    const newTenant: Tenant = {
      ...tenantData,
      id: `tenant_${Date.now()}`,
      contractNumber: `HD-2026-${String(nextSeq).padStart(3, '0')}`,
    }
    setTenants((prev) => [newTenant, ...prev])
  }

  const updateTenant = (id: string, updatedData: Partial<Tenant>) => {
    setTenants((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updatedData } : item))
    )
  }

  const deleteTenant = (id: string) => {
    setTenants((prev) => prev.filter((item) => item.id !== id))
  }

  const updateContractStatus = (id: string, status: ContractStatus) => {
    setTenants((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item))
    )
  }

  return (
    <TenantContext.Provider
      value={{
        tenants,
        addTenant,
        updateTenant,
        deleteTenant,
        updateContractStatus,
        getTenantsByHouse,
      }}
    >
      {children}
    </TenantContext.Provider>
  )
}

export function useTenants() {
  const context = useContext(TenantContext)
  if (!context) {
    throw new Error('useTenants must be used within a TenantProvider')
  }
  return context
}
