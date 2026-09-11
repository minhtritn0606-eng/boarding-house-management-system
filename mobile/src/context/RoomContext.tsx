import React, { createContext, useContext, useState, useEffect } from 'react'
import type { MobileRoom, HouseBranch, RoomStatus } from '../types/room'
import { mobileRoomApi, mobileHouseApi } from '../services/api'
import { useAuth } from './AuthContext'

interface RoomContextType {
  rooms: MobileRoom[]
  branches: HouseBranch[]
  isLoading: boolean
  refreshRooms: () => Promise<void>
  getRoomsByOwner: (ownerEmail?: string) => MobileRoom[]
  addRoom: (room: Omit<MobileRoom, 'id'>) => Promise<void>
  updateRoom: (id: string, updatedData: Partial<MobileRoom>) => Promise<void>
  deleteRoom: (id: string) => Promise<void>
  toggleRoomStatus: (id: string) => Promise<void>
  occupyRoom: (roomNumber: string, houseName?: string, tenantName?: string, tenantPhone?: string) => Promise<void>
  vacateRoom: (roomNumber: string, houseName?: string) => Promise<void>
}

const RoomContext = createContext<RoomContextType | undefined>(undefined)

export function RoomProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth()
  const [rooms, setRooms] = useState<MobileRoom[]>([])
  const [branches, setBranches] = useState<HouseBranch[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Fetch rooms & houses from MySQL backend for the current landlord
  const refreshRooms = async () => {
    setIsLoading(true)
    try {
      const res = await mobileRoomApi.getRooms()
      if (res && Array.isArray(res.rooms)) {
        const mapped: MobileRoom[] = res.rooms.map((r: any) => ({
          id: String(r.id),
          houseName: r.houseName || r.house_name || (r.address ? r.address.split(',')[0] : 'Dãy trọ chính'),
          roomNumber: r.title && r.title.includes('P.') ? r.title.split(' - ')[0] || `P.${r.id}` : `P.${r.id}`,
          title: r.title,
          price: Number(r.price) || 2500000,
          area: Number(r.area) || 20,
          roomType: r.roomType || 'private',
          status: r.status || 'available',
          ownerEmail: r.ownerEmail || r.owner_email || '',
          tenantName: r.status === 'rented' ? 'Khách thuê' : undefined,
          amenities: Array.isArray(r.amenities) ? r.amenities : ['Wifi', 'Điều hòa', 'Nóng lạnh'],
          floor: r.floor || 1,
        }))
        setRooms(mapped)
      } else {
        setRooms([])
      }
    } catch (e: any) {
      console.log('Mobile room fetch error:', e.message)
      setRooms([])
    }

    try {
      const houseRes = await mobileHouseApi.getHouses()
      if (houseRes && Array.isArray(houseRes.houses)) {
        const mappedHouses: HouseBranch[] = houseRes.houses.map((h: any) => ({
          id: String(h.id),
          name: h.name,
          address: h.address,
          totalRooms: Number(h.totalRooms) || 0,
        }))
        setBranches(mappedHouses)
      } else {
        setBranches([])
      }
    } catch (e: any) {
      setBranches([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refreshRooms()
  }, [user?.id, isAuthenticated])

  const getRoomsByOwner = (ownerEmail?: string) => {
    if (!ownerEmail) return rooms
    const filtered = rooms.filter(
      (r) => !r.ownerEmail || r.ownerEmail.toLowerCase() === ownerEmail.toLowerCase()
    )
    return filtered.length > 0 ? filtered : rooms
  }

  const addRoom = async (roomData: Omit<MobileRoom, 'id'>) => {
    try {
      const targetHouseId = branches.length > 0 && branches[0]?.id ? Number(branches[0].id) : undefined
      const res = await mobileRoomApi.createRoom({
        boardingHouseId: targetHouseId,
        title: `${roomData.roomNumber} - ${roomData.title}`,
        description: roomData.note || '',
        price: roomData.price,
        roomType: roomData.roomType,
        area: roomData.area,
        amenities: roomData.amenities,
      })
      if (res && res.room) {
        await refreshRooms()
        return
      }
    } catch (e: any) {
      console.log('Mobile create room backend error:', e.message)
    }

    const newRoom: MobileRoom = {
      ...roomData,
      id: `m_room_${Date.now()}`,
      ownerEmail: user?.email || roomData.ownerEmail || '',
    }
    setRooms((prev) => [newRoom, ...prev])
  }

  const updateRoom = async (id: string, updatedData: Partial<MobileRoom>) => {
    setRooms((prev) =>
      prev.map((room) => (room.id === id ? { ...room, ...updatedData } : room))
    )

    try {
      await mobileRoomApi.updateRoom(id, updatedData)
    } catch (e: any) {
      console.log('Mobile update room error:', e.message)
    }
  }

  const deleteRoom = async (id: string) => {
    setRooms((prev) => prev.filter((room) => room.id !== id))
    try {
      await mobileRoomApi.deleteRoom(id)
    } catch (e: any) {
      console.log('Mobile delete room error:', e.message)
    }
  }

  const toggleRoomStatus = async (id: string) => {
    let nextStatus: RoomStatus = 'available'
    setRooms((prev) =>
      prev.map((room) => {
        if (room.id === id) {
          nextStatus = room.status === 'rented' ? 'available' : 'rented'
          return {
            ...room,
            status: nextStatus,
            tenantName: nextStatus === 'available' ? undefined : room.tenantName || 'Khách thuê mới',
          }
        }
        return room
      })
    )

    try {
      await mobileRoomApi.updateRoom(id, { status: nextStatus })
    } catch (e: any) {
      console.log('Mobile toggle status error:', e.message)
    }
  }

  const occupyRoom = async (roomNumber: string, houseName?: string, tenantName?: string, tenantPhone?: string) => {
    let matchedId = ''
    setRooms((prev) =>
      prev.map((room) => {
        const isMatch =
          room.roomNumber.toLowerCase() === roomNumber.toLowerCase() ||
          room.title.toLowerCase().includes(roomNumber.toLowerCase())
        if (isMatch) {
          matchedId = room.id
          return {
            ...room,
            status: 'rented' as RoomStatus,
            tenantName: tenantName || 'Khách thuê',
            tenantPhone: tenantPhone || '',
          }
        }
        return room
      })
    )

    if (matchedId) {
      try {
        await mobileRoomApi.updateRoom(matchedId, {
          status: 'rented',
          tenantName,
          tenantPhone,
        })
      } catch (e: any) {
        console.log('Mobile occupyRoom sync error:', e.message)
      }
    }
  }

  const vacateRoom = async (roomNumber: string, houseName?: string) => {
    let matchedId = ''
    setRooms((prev) =>
      prev.map((room) => {
        const isMatch =
          room.roomNumber.toLowerCase() === roomNumber.toLowerCase() ||
          room.title.toLowerCase().includes(roomNumber.toLowerCase())
        if (isMatch) {
          matchedId = room.id
          return {
            ...room,
            status: 'available' as RoomStatus,
            tenantName: undefined,
            tenantPhone: undefined,
          }
        }
        return room
      })
    )

    if (matchedId) {
      try {
        await mobileRoomApi.updateRoom(matchedId, {
          status: 'available',
          tenantName: null,
          tenantPhone: null,
        })
      } catch (e: any) {
        console.log('Mobile vacateRoom sync error:', e.message)
      }
    }
  }

  return (
    <RoomContext.Provider
      value={{
        rooms,
        branches,
        isLoading,
        refreshRooms,
        getRoomsByOwner,
        addRoom,
        updateRoom,
        deleteRoom,
        toggleRoomStatus,
        occupyRoom,
        vacateRoom,
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
