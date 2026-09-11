import React, { createContext, useContext, useState, useEffect } from 'react'
import type { Tenant, ContractStatus } from '../types/tenant'
import { mobileTenantApi } from '../services/api'
import { useAuth } from './AuthContext'
import { useRooms } from './RoomContext'

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

const TenantContext = createContext<TenantContextType | undefined>(undefined)

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth()
  const { occupyRoom, vacateRoom } = useRooms()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const refreshTenants = async () => {
    setIsLoading(true)
    try {
      const res = await mobileTenantApi.getTenants()
      if (res && Array.isArray(res.tenants)) {
        const mapped: Tenant[] = res.tenants.map((t: any) => ({
          id: String(t.id),
          contractNumber: t.contractNumber || `HD-2026-${String(t.id).padStart(3, '0')}`,
          name: t.name || t.fullName || 'Khách thuê',
          phone: t.phone || '',
          email: t.email || '',
          idCard: t.identityNumber || t.idCard || '',
          hometown: t.hometown || '',
          job: t.job || '',
          roomId: String(t.roomId || t.id),
          roomNumber: t.roomNumber || `P.${t.id}`,
          houseName: t.houseName || 'Nhà trọ',
          rentStartDate: t.rentStartDate || '2026-01-01',
          rentEndDate: t.rentEndDate || '2026-12-31',
          deposit: Number(t.deposit) || 0,
          monthlyRent: Number(t.monthlyRent) || 0,
          status: t.status || 'active',
          notes: t.notes || t.note || '',
        }))
        setTenants(mapped)
      } else {
        setTenants([])
      }
    } catch (e: any) {
      console.log('Mobile tenant fetch error:', e.message)
      setTenants([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refreshTenants()
  }, [user?.id, isAuthenticated])

  const getTenantsByHouse = (houseName?: string) => {
    if (!houseName || houseName === 'all') return tenants
    return tenants.filter((t) => t.houseName.toLowerCase() === houseName.toLowerCase())
  }

  const addTenant = async (tenantData: Omit<Tenant, 'id' | 'contractNumber'>) => {
    // Tự động đồng bộ sang Phòng trọ tương ứng -> Đã thuê
    if (tenantData.roomNumber) {
      await occupyRoom(tenantData.roomNumber, tenantData.houseName, tenantData.name, tenantData.phone)
    }

    try {
      const res = await mobileTenantApi.createTenant({
        fullName: tenantData.name,
        email: tenantData.email,
        phone: tenantData.phone,
        identityNumber: tenantData.idCard,
        hometown: tenantData.hometown,
        job: tenantData.job,
        note: tenantData.notes,
      })
      if (res && res.tenant) {
        setTenants((prev) => [res.tenant, ...prev])
        return
      }
    } catch (e: any) {
      console.log('Mobile create tenant error:', e.message)
    }

    const nextSeq = tenants.length + 1
    const newTenant: Tenant = {
      ...tenantData,
      id: `tenant_${Date.now()}`,
      contractNumber: `HD-2026-${String(nextSeq).padStart(3, '0')}`,
    }
    setTenants((prev) => [newTenant, ...prev])
  }

  const updateTenant = async (id: string, updatedData: Partial<Tenant>) => {
    setTenants((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updatedData } : item))
    )

    try {
      await mobileTenantApi.updateTenant(id, {
        fullName: updatedData.name,
        email: updatedData.email,
        phone: updatedData.phone,
        identityNumber: updatedData.idCard,
        hometown: updatedData.hometown,
        job: updatedData.job,
        note: updatedData.notes,
      })
    } catch (e: any) {
      console.log('Mobile update tenant error:', e.message)
    }
  }

  const deleteTenant = async (id: string) => {
    const target = tenants.find((t) => t.id === id)
    if (target && target.roomNumber) {
      await vacateRoom(target.roomNumber, target.houseName)
    }

    setTenants((prev) => prev.filter((item) => item.id !== id))
    try {
      await mobileTenantApi.deleteTenant(id)
    } catch (e: any) {
      console.log('Mobile delete tenant error:', e.message)
    }
  }

  const updateContractStatus = async (id: string, status: ContractStatus) => {
    const target = tenants.find((t) => t.id === id)
    if (target && (status === 'terminated' || status === 'expired') && target.roomNumber) {
      await vacateRoom(target.roomNumber, target.houseName)
    } else if (target && status === 'active' && target.roomNumber) {
      await occupyRoom(target.roomNumber, target.houseName, target.name, target.phone)
    }

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
