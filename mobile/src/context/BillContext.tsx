import React, { createContext, useContext, useState, useEffect } from 'react'
import type { BillItem, UtilitySettings, BillStatus } from '../types/bill'
import { mobileBillApi } from '../services/api'
import { useAuth } from './AuthContext'

interface BillContextType {
  bills: BillItem[]
  isLoading: boolean
  refreshBills: () => Promise<void>
  utilitySettings: UtilitySettings
  updateUtilitySettings: (settings: Partial<UtilitySettings>) => void
  addBill: (bill: Omit<BillItem, 'id' | 'electricUsage' | 'electricAmount' | 'waterUsage' | 'waterAmount' | 'totalAmount'>) => Promise<void>
  updateBill: (id: string, updatedData: Partial<BillItem>) => Promise<void>
  deleteBill: (id: string) => Promise<void>
  markAsPaid: (id: string, method?: 'cash' | 'banking') => Promise<void>
  getBillsByMonth: (month: number, year: number) => BillItem[]
  getLastBillForRoom: (roomNumber: string, houseName?: string) => BillItem | undefined
  totalUnpaidAmount: number
  totalPaidAmount: number
}

const DEFAULT_UTILITY_SETTINGS: UtilitySettings = {
  electricRate: 3500,
  waterRate: 15000,
  internetFee: 100000,
  trashFee: 30000,
}

const BillContext = createContext<BillContextType | undefined>(undefined)

export function BillProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth()
  const [bills, setBills] = useState<BillItem[]>([])
  const [utilitySettings, setUtilitySettings] = useState<UtilitySettings>(DEFAULT_UTILITY_SETTINGS)
  const [isLoading, setIsLoading] = useState(false)

  const refreshBills = async () => {
    setIsLoading(true)
    try {
      const res = await mobileBillApi.getBills()
      if (res && Array.isArray(res.bills)) {
        const mapped: BillItem[] = res.bills.map((b: any) => ({
          id: String(b.id),
          roomNumber: b.roomNumber || `P.${b.roomId || '101'}`,
          houseName: b.houseName || 'Nhà trọ',
          tenantName: b.tenantName || 'Khách thuê',
          tenantPhone: b.tenantPhone || '',
          month: Number(b.month) || (new Date().getMonth() + 1),
          year: Number(b.year) || new Date().getFullYear(),
          roomFee: Number(b.roomFee) || 0,
          oldElectricMeter: Number(b.oldElectricMeter) || 0,
          newElectricMeter: Number(b.newElectricMeter) || 0,
          electricUsage: Number(b.electricUsage) || 0,
          electricRate: Number(b.electricRate) || 3500,
          electricAmount: Number(b.electricAmount) || 0,
          oldWaterMeter: Number(b.oldWaterMeter) || 0,
          newWaterMeter: Number(b.newWaterMeter) || 0,
          waterUsage: Number(b.waterUsage) || 0,
          waterRate: Number(b.waterRate) || 15000,
          waterAmount: Number(b.waterAmount) || 0,
          internetFee: Number(b.internetFee) || 0,
          trashFee: Number(b.trashFee) || 0,
          otherFee: Number(b.otherFee) || 0,
          totalAmount: Number(b.totalAmount) || 0,
          status: (b.status === 'paid' ? 'paid' : 'unpaid') as BillStatus,
          dueDate: b.dueDate || '',
          paidDate: b.paidDate,
          paymentMethod: b.paymentMethod,
          note: b.note || '',
        }))
        setBills(mapped)
      } else {
        setBills([])
      }
    } catch (e: any) {
      console.log('Mobile bill fetch error:', e.message)
      setBills([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refreshBills()
  }, [user?.id, isAuthenticated])

  const updateUtilitySettings = (settings: Partial<UtilitySettings>) => {
    setUtilitySettings((prev) => ({ ...prev, ...settings }))
  }

  const addBill = async (
    data: Omit<BillItem, 'id' | 'electricUsage' | 'electricAmount' | 'waterUsage' | 'waterAmount' | 'totalAmount'>
  ) => {
    const electricUsage = Math.max(0, data.newElectricMeter - data.oldElectricMeter)
    const electricAmount = electricUsage * data.electricRate
    const waterUsage = Math.max(0, data.newWaterMeter - data.oldWaterMeter)
    const waterAmount = waterUsage * data.waterRate
    const other = data.otherFee || 0
    const totalAmount =
      data.roomFee + electricAmount + waterAmount + data.internetFee + data.trashFee + other

    const newBill: BillItem = {
      ...data,
      id: `bill_${Date.now()}`,
      electricUsage,
      electricAmount,
      waterUsage,
      waterAmount,
      totalAmount,
    }

    try {
      const res = await mobileBillApi.createBill({
        landlordId: user?.id || 1,
        roomNumber: data.roomNumber,
        tenantName: data.tenantName,
        tenantPhone: data.tenantPhone,
        month: `${data.year}-${String(data.month).padStart(2, '0')}-01`,
        year: data.year,
        roomFee: data.roomFee,
        oldElectricMeter: data.oldElectricMeter,
        newElectricMeter: data.newElectricMeter,
        electricityUnits: electricUsage,
        electricRate: data.electricRate,
        electricityAmount: electricAmount,
        oldWaterMeter: data.oldWaterMeter,
        newWaterMeter: data.newWaterMeter,
        waterUnits: waterUsage,
        waterRate: data.waterRate,
        waterAmount: waterAmount,
        internetFee: data.internetFee,
        trashFee: data.trashFee,
        otherFee: other,
        otherFeeNote: data.otherFeeNote,
        totalAmount,
        dueDate: data.dueDate,
        status: data.status,
        note: data.note,
      })
      if (res && res.bill) {
        setBills((prev) => [res.bill, ...prev])
        return
      }
    } catch (e: any) {
      console.log('Mobile create bill error:', e.message)
    }

    setBills((prev) => [newBill, ...prev])
  }

  const updateBill = async (id: string, updatedData: Partial<BillItem>) => {
    setBills((prev) =>
      prev.map((bill) => {
        if (bill.id === id) {
          const merged = { ...bill, ...updatedData }
          const electricUsage = Math.max(0, merged.newElectricMeter - merged.oldElectricMeter)
          const electricAmount = electricUsage * merged.electricRate
          const waterUsage = Math.max(0, merged.newWaterMeter - merged.oldWaterMeter)
          const waterAmount = waterUsage * merged.waterRate
          const other = merged.otherFee || 0
          const totalAmount =
            merged.roomFee +
            electricAmount +
            waterAmount +
            merged.internetFee +
            merged.trashFee +
            other

          return {
            ...merged,
            electricUsage,
            electricAmount,
            waterUsage,
            waterAmount,
            totalAmount,
          }
        }
        return bill
      })
    )

    try {
      await mobileBillApi.updateBill(id, updatedData)
    } catch (e: any) {
      console.log('Mobile update bill error:', e.message)
    }
  }

  const deleteBill = async (id: string) => {
    setBills((prev) => prev.filter((b) => b.id !== id))
    try {
      await mobileBillApi.deleteBill(id)
    } catch (e: any) {
      console.log('Mobile delete bill error:', e.message)
    }
  }

  const markAsPaid = async (id: string, method: 'cash' | 'banking' = 'banking') => {
    const today = new Date().toISOString().split('T')[0]
    setBills((prev) =>
      prev.map((b) =>
        b.id === id
          ? {
              ...b,
              status: 'paid' as BillStatus,
              paidDate: today,
              paymentMethod: method,
            }
          : b
      )
    )

    try {
      await mobileBillApi.updateBill(id, { status: 'paid', paymentMethod: method })
    } catch (e: any) {
      console.log('Mobile mark as paid error:', e.message)
    }
  }

  const getBillsByMonth = (month: number, year: number) => {
    return bills.filter((b) => b.month === month && b.year === year)
  }

  const getLastBillForRoom = (roomNumber: string, houseName?: string) => {
    const cleanQuery = roomNumber.replace(/[^\d]/g, '')
    const roomBills = bills
      .filter((b) => {
        const bClean = b.roomNumber.replace(/[^\d]/g, '')
        const matchRoom =
          b.roomNumber.toLowerCase() === roomNumber.toLowerCase() ||
          (cleanQuery !== '' && bClean === cleanQuery) ||
          b.roomNumber.toLowerCase().includes(roomNumber.toLowerCase()) ||
          roomNumber.toLowerCase().includes(b.roomNumber.toLowerCase())
        return matchRoom
      })
      .sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month) || (Number(b.id) || 0) - (Number(a.id) || 0))

    return roomBills[0]
  }

  const totalUnpaidAmount = bills
    .filter((b) => b.status === 'unpaid' || b.status === 'overdue')
    .reduce((sum, b) => sum + b.totalAmount, 0)

  const totalPaidAmount = bills
    .filter((b) => b.status === 'paid')
    .reduce((sum, b) => sum + b.totalAmount, 0)

  return (
    <BillContext.Provider
      value={{
        bills,
        isLoading,
        refreshBills,
        utilitySettings,
        updateUtilitySettings,
        addBill,
        updateBill,
        deleteBill,
        markAsPaid,
        getBillsByMonth,
        getLastBillForRoom,
        totalUnpaidAmount,
        totalPaidAmount,
      }}
    >
      {children}
    </BillContext.Provider>
  )
}

export function useBills() {
  const context = useContext(BillContext)
  if (!context) {
    throw new Error('useBills must be used within a BillProvider')
  }
  return context
}
