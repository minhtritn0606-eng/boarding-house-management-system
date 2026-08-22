import React, { createContext, useContext, useState } from 'react'
import type { BillItem, UtilitySettings, BillStatus } from '../types/bill'

interface BillContextType {
  bills: BillItem[]
  utilitySettings: UtilitySettings
  updateUtilitySettings: (settings: Partial<UtilitySettings>) => void
  addBill: (bill: Omit<BillItem, 'id' | 'electricUsage' | 'electricAmount' | 'waterUsage' | 'waterAmount' | 'totalAmount'>) => void
  updateBill: (id: string, updatedData: Partial<BillItem>) => void
  deleteBill: (id: string) => void
  markAsPaid: (id: string, method?: 'cash' | 'banking') => void
  getBillsByMonth: (month: number, year: number) => BillItem[]
  totalUnpaidAmount: number
  totalPaidAmount: number
}

const DEFAULT_UTILITY_SETTINGS: UtilitySettings = {
  electricRate: 3500,
  waterRate: 15000,
  internetFee: 100000,
  trashFee: 30000,
}

const INITIAL_BILLS: BillItem[] = [
  {
    id: 'bill_101_8',
    roomNumber: 'P.101',
    houseName: 'Dãy trọ Hòa Khánh (Đà Nẵng)',
    tenantName: 'Nguyễn Văn Hùng',
    tenantPhone: '0978 111 222',
    month: 8,
    year: 2026,
    roomFee: 2500000,
    oldElectricMeter: 1420,
    newElectricMeter: 1485,
    electricUsage: 65,
    electricRate: 3500,
    electricAmount: 227500,
    oldWaterMeter: 110,
    newWaterMeter: 116,
    waterUsage: 6,
    waterRate: 15000,
    waterAmount: 90000,
    internetFee: 100000,
    trashFee: 30000,
    totalAmount: 2947500,
    status: 'paid',
    dueDate: '2026-08-10',
    paidDate: '2026-08-05',
    paymentMethod: 'banking',
  },
  {
    id: 'bill_102_8',
    roomNumber: 'P.102',
    houseName: 'Dãy trọ Hòa Khánh (Đà Nẵng)',
    tenantName: 'Trần Thị Mai',
    tenantPhone: '0912 333 444',
    month: 8,
    year: 2026,
    roomFee: 2200000,
    oldElectricMeter: 890,
    newElectricMeter: 940,
    electricUsage: 50,
    electricRate: 3500,
    electricAmount: 175000,
    oldWaterMeter: 75,
    newWaterMeter: 79,
    waterUsage: 4,
    waterRate: 15000,
    waterAmount: 60000,
    internetFee: 100000,
    trashFee: 30000,
    totalAmount: 2565000,
    status: 'paid',
    dueDate: '2026-08-10',
    paidDate: '2026-08-07',
    paymentMethod: 'banking',
  },
  {
    id: 'bill_201_8',
    roomNumber: 'P.201',
    houseName: 'Dãy trọ Hòa Khánh (Đà Nẵng)',
    tenantName: 'Lê Hoàng Long',
    tenantPhone: '0905 555 666',
    month: 8,
    year: 2026,
    roomFee: 3200000,
    oldElectricMeter: 2100,
    newElectricMeter: 2210,
    electricUsage: 110,
    electricRate: 3500,
    electricAmount: 385000,
    oldWaterMeter: 180,
    newWaterMeter: 188,
    waterUsage: 8,
    waterRate: 15000,
    waterAmount: 120000,
    internetFee: 100000,
    trashFee: 30000,
    totalAmount: 3835000,
    status: 'unpaid',
    dueDate: '2026-08-25',
    note: 'Đã gửi phiếu thu qua Zalo',
  },
  {
    id: 'bill_203_8',
    roomNumber: 'P.203',
    houseName: 'Dãy trọ Hòa Khánh (Đà Nẵng)',
    tenantName: 'Phạm Quỳnh Như',
    tenantPhone: '0934 777 888',
    month: 8,
    year: 2026,
    roomFee: 2400000,
    oldElectricMeter: 1050,
    newElectricMeter: 1115,
    electricUsage: 65,
    electricRate: 3500,
    electricAmount: 227500,
    oldWaterMeter: 90,
    newWaterMeter: 95,
    waterUsage: 5,
    waterRate: 15000,
    waterAmount: 75000,
    internetFee: 100000,
    trashFee: 30000,
    totalAmount: 2832500,
    status: 'unpaid',
    dueDate: '2026-08-25',
  },
  {
    id: 'bill_301_8',
    roomNumber: 'P.301',
    houseName: 'Nhà trọ Cẩm Lệ (Đà Nẵng)',
    tenantName: 'Võ Minh Trí',
    tenantPhone: '0988 999 000',
    month: 8,
    year: 2026,
    roomFee: 4000000,
    oldElectricMeter: 3400,
    newElectricMeter: 3520,
    electricUsage: 120,
    electricRate: 3500,
    electricAmount: 420000,
    oldWaterMeter: 240,
    newWaterMeter: 248,
    waterUsage: 8,
    waterRate: 15000,
    waterAmount: 120000,
    internetFee: 100000,
    trashFee: 30000,
    totalAmount: 4670000,
    status: 'paid',
    dueDate: '2026-08-10',
    paidDate: '2026-08-04',
    paymentMethod: 'banking',
  },
]

const BillContext = createContext<BillContextType | undefined>(undefined)

export function BillProvider({ children }: { children: React.ReactNode }) {
  const [bills, setBills] = useState<BillItem[]>(INITIAL_BILLS)
  const [utilitySettings, setUtilitySettings] = useState<UtilitySettings>(DEFAULT_UTILITY_SETTINGS)

  const updateUtilitySettings = (settings: Partial<UtilitySettings>) => {
    setUtilitySettings((prev) => ({ ...prev, ...settings }))
  }

  const addBill = (
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

    setBills((prev) => [newBill, ...prev])
  }

  const updateBill = (id: string, updatedData: Partial<BillItem>) => {
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
  }

  const deleteBill = (id: string) => {
    setBills((prev) => prev.filter((b) => b.id !== id))
  }

  const markAsPaid = (id: string, method: 'cash' | 'banking' = 'banking') => {
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
  }

  const getBillsByMonth = (month: number, year: number) => {
    return bills.filter((b) => b.month === month && b.year === year)
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
        utilitySettings,
        updateUtilitySettings,
        addBill,
        updateBill,
        deleteBill,
        markAsPaid,
        getBillsByMonth,
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
