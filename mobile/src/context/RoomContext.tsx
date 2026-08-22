import React, { createContext, useContext, useState } from 'react'
import type { MobileRoom, HouseBranch, RoomStatus } from '../types/room'

interface RoomContextType {
  rooms: MobileRoom[]
  branches: HouseBranch[]
  getRoomsByOwner: (ownerEmail?: string) => MobileRoom[]
  addRoom: (room: Omit<MobileRoom, 'id'>) => void
  updateRoom: (id: string, updatedData: Partial<MobileRoom>) => void
  deleteRoom: (id: string) => void
  toggleRoomStatus: (id: string) => void
}

const INITIAL_HOUSES: HouseBranch[] = [
  {
    id: 'house_1',
    name: 'Dãy trọ Hòa Khánh (Đà Nẵng)',
    address: '120 Ngô Thì Nhậm, P. Hòa Khánh Nam, Q. Liên Chiểu, Đà Nẵng',
    totalRooms: 8,
  },
  {
    id: 'house_2',
    name: 'Nhà trọ Cẩm Lệ (Đà Nẵng)',
    address: '45 Cách Mạng Tháng 8, Q. Cẩm Lệ, Đà Nẵng',
    totalRooms: 4,
  },
]

const INITIAL_ROOMS: MobileRoom[] = [
  {
    id: 'm_room_101',
    houseName: 'Dãy trọ Hòa Khánh (Đà Nẵng)',
    roomNumber: 'P.101',
    title: 'Phòng đơn full nội thất có gác lửng',
    price: 2500000,
    area: 20,
    roomType: 'private',
    status: 'rented',
    ownerEmail: 'nam.owner@example.com',
    tenantName: 'Nguyễn Văn Hùng',
    tenantPhone: '0978 111 222',
    amenities: ['Điều hòa', 'Gác lửng', 'Nóng lạnh', 'Wifi tốc độ cao'],
    floor: 1,
    note: 'Hợp đồng đến tháng 12/2026',
  },
  {
    id: 'm_room_102',
    houseName: 'Dãy trọ Hòa Khánh (Đà Nẵng)',
    roomNumber: 'P.102',
    title: 'Phòng khép kín sạch sẽ ban công thoáng',
    price: 2200000,
    area: 18,
    roomType: 'private',
    status: 'rented',
    ownerEmail: 'nam.owner@example.com',
    tenantName: 'Trần Thị Mai',
    tenantPhone: '0912 333 444',
    amenities: ['Wifi', 'Nóng lạnh', 'Ban công', 'Giờ giấc tự do'],
    floor: 1,
  },
  {
    id: 'm_room_103',
    houseName: 'Dãy trọ Hòa Khánh (Đà Nẵng)',
    roomNumber: 'P.103',
    title: 'Phòng trọ tầng 1 gần cổng trường ĐH Bách Khoa',
    price: 2000000,
    area: 18,
    roomType: 'private',
    status: 'available',
    ownerEmail: 'nam.owner@example.com',
    amenities: ['Wifi', 'Nóng lạnh', 'Chỗ để xe riêng'],
    floor: 1,
    note: 'Vừa dọn dẹp sạch sẽ, sẵn sàng vào ở',
  },
  {
    id: 'm_room_201',
    houseName: 'Dãy trọ Hòa Khánh (Đà Nẵng)',
    roomNumber: 'P.201',
    title: 'Phòng đôi có máy lạnh và tủ lạnh mini',
    price: 3200000,
    area: 25,
    roomType: 'shared',
    status: 'rented',
    ownerEmail: 'nam.owner@example.com',
    tenantName: 'Lê Hoàng Long',
    tenantPhone: '0905 555 666',
    amenities: ['Điều hòa', 'Tủ lạnh', 'Gác lửng', 'Nóng lạnh', 'Wifi'],
    floor: 2,
  },
  {
    id: 'm_room_202',
    houseName: 'Dãy trọ Hòa Khánh (Đà Nẵng)',
    roomNumber: 'P.202',
    title: 'Phòng Studio cao cấp có cửa sổ lớn',
    price: 3500000,
    area: 28,
    roomType: 'studio',
    status: 'available',
    ownerEmail: 'nam.owner@example.com',
    amenities: ['Điều hòa', 'Bếp riêng', 'Tủ quần áo', 'Tủ lạnh', 'Máy giặt chung'],
    floor: 2,
    note: 'Khách vừa trả phòng cuối tháng trước',
  },
  {
    id: 'm_room_203',
    houseName: 'Dãy trọ Hòa Khánh (Đà Nẵng)',
    roomNumber: 'P.203',
    title: 'Phòng đơn ban công view công viên',
    price: 2400000,
    area: 20,
    roomType: 'private',
    status: 'rented',
    ownerEmail: 'nam.owner@example.com',
    tenantName: 'Phạm Quỳnh Như',
    tenantPhone: '0934 777 888',
    amenities: ['Điều hòa', 'Ban công', 'Nóng lạnh', 'Wifi'],
    floor: 2,
  },
  {
    id: 'm_room_301',
    houseName: 'Nhà trọ Cẩm Lệ (Đà Nẵng)',
    roomNumber: 'P.301',
    title: 'Phòng căn hộ mini 1 phòng ngủ khép kín',
    price: 4000000,
    area: 32,
    roomType: 'studio',
    status: 'rented',
    ownerEmail: 'nam.owner@example.com',
    tenantName: 'Võ Minh Trí',
    tenantPhone: '0988 999 000',
    amenities: ['Full nội thất', 'Điều hòa', 'Máy giặt', 'Bếp', 'Khóa vân tay'],
    floor: 3,
  },
  {
    id: 'm_room_302',
    houseName: 'Nhà trọ Cẩm Lệ (Đà Nẵng)',
    roomNumber: 'P.302',
    title: 'Phòng đơn tiện nghi gần chợ Cẩm Lệ',
    price: 2300000,
    area: 19,
    roomType: 'private',
    status: 'available',
    ownerEmail: 'nam.owner@example.com',
    amenities: ['Wifi', 'Nóng lạnh', 'Để xe tầng 1'],
    floor: 3,
  },
]

const RoomContext = createContext<RoomContextType | undefined>(undefined)

export function RoomProvider({ children }: { children: React.ReactNode }) {
  const [rooms, setRooms] = useState<MobileRoom[]>(INITIAL_ROOMS)
  const [branches] = useState<HouseBranch[]>(INITIAL_HOUSES)

  const getRoomsByOwner = (ownerEmail?: string) => {
    if (!ownerEmail) return rooms
    const filtered = rooms.filter((r) => r.ownerEmail.toLowerCase() === ownerEmail.toLowerCase())
    return filtered.length > 0 ? filtered : rooms
  }

  const addRoom = (roomData: Omit<MobileRoom, 'id'>) => {
    const newRoom: MobileRoom = {
      ...roomData,
      id: `m_room_${Date.now()}`,
    }
    setRooms((prev) => [newRoom, ...prev])
  }

  const updateRoom = (id: string, updatedData: Partial<MobileRoom>) => {
    setRooms((prev) =>
      prev.map((room) => (room.id === id ? { ...room, ...updatedData } : room))
    )
  }

  const deleteRoom = (id: string) => {
    setRooms((prev) => prev.filter((room) => room.id !== id))
  }

  const toggleRoomStatus = (id: string) => {
    setRooms((prev) =>
      prev.map((room) => {
        if (room.id === id) {
          const nextStatus: RoomStatus = room.status === 'rented' ? 'available' : 'rented'
          return {
            ...room,
            status: nextStatus,
            tenantName: nextStatus === 'available' ? undefined : room.tenantName || 'Khách thuê mới',
          }
        }
        return room
      })
    )
  }

  return (
    <RoomContext.Provider
      value={{
        rooms,
        branches,
        getRoomsByOwner,
        addRoom,
        updateRoom,
        deleteRoom,
        toggleRoomStatus,
      }}
    >
      {children}
    </RoomContext.Provider>
  )
}

export function useRooms() {
  const context = useContext(RoomContext)
  if (!context) {
    throw new Error('useRooms must be used within a RoomProvider')
  }
  return context
}
