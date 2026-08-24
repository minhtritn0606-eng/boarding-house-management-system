import React, { createContext, useContext, useState, useEffect } from 'react'
import type { Tenant, ContractStatus } from '../types/tenant'
import { mobileTenantApi } from '../services/api'

interface TenantContextType {
  tenants: Tenant[]
  isLoading: boolean
  refreshTenants: () => Promise<void>
  addTenant: (tenant: Omit<Tenant, 'id' | 'contractNumber'>) => Promise<void>
  updateTenant: (id: string, updatedData: Partial<Tenant>) => Promise<void>
  deleteTenant: (id: string) => Promise<void>
  updateContractStatus: (id: string, status: ContractStatus) => Promise<void>
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
  const [isLoading, setIsLoading] = useState(false)

  const refreshTenants = async () => {
    setIsLoading(true)
    try {
      const res = await mobileTenantApi.getTenants()
      if (res && Array.isArray(res.tenants) && res.tenants.length > 0) {
        const mapped: Tenant[] = res.tenants.map((t: any, idx: number) => ({
          id: String(t.id),
          contractNumber: `HD-2026-${String(idx + 101).padStart(3, '0')}`,
          name: t.fullName || t.name,
          phone: t.phone || '0905 111 222',
          email: t.email,
          idCard: t.identityNumber || t.idCard || '048200000000',
          hometown: t.hometown || 'Đà Nẵng',
          job: t.job || 'Người đi làm',
          roomId: `room_${t.id}`,
          roomNumber: `P.${100 + idx + 1}`,
          houseName: 'Dãy trọ Hòa Khánh (Đà Nẵng)',
          rentStartDate: '2026-01-01',
          rentEndDate: '2026-12-31',
          deposit: 2500000,
          monthlyRent: 2500000,
          status: 'active',
          notes: t.note,
        }))
        setTenants(mapped)
      }
    } catch (e: any) {
      console.log('Mobile tenant fetch offline/fallback:', e.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refreshTenants()
  }, [])

  const getTenantsByHouse = (houseName?: string) => {
    if (!houseName || houseName === 'all') return tenants
    return tenants.filter((t) => t.houseName.toLowerCase() === houseName.toLowerCase())
  }

  const addTenant = async (tenantData: Omit<Tenant, 'id' | 'contractNumber'>) => {
    const nextSeq = tenants.length + 1
    const newTenant: Tenant = {
      ...tenantData,
      id: `tenant_${Date.now()}`,
      contractNumber: `HD-2026-${String(nextSeq).padStart(3, '0')}`,
    }
    setTenants((prev) => [newTenant, ...prev])

    try {
      await mobileTenantApi.createTenant({
        fullName: tenantData.name,
        email: tenantData.email,
        phone: tenantData.phone,
        identityNumber: tenantData.idCard,
        note: tenantData.notes,
      })
    } catch (e: any) {
      console.log('Mobile create tenant sync fallback:', e.message)
    }
  }

  const updateTenant = async (id: string, updatedData: Partial<Tenant>) => {
    setTenants((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updatedData } : item))
    )
  }

  const deleteTenant = async (id: string) => {
    setTenants((prev) => prev.filter((item) => item.id !== id))
  }

  const updateContractStatus = async (id: string, status: ContractStatus) => {
    setTenants((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item))
    )
  }

  return (
    <TenantContext.Provider
      value={{
        tenants,
        isLoading,
        refreshTenants,
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
