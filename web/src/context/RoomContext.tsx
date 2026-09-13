import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { Room } from '../data/sampleRooms'
import { roomApi } from '../services/api'

interface RoomContextType {
  rooms: Room[]
  isLoading: boolean
  refreshRooms: () => Promise<void>
  addRoom: (roomData: Omit<Room, 'id' | 'postedDate'>) => Promise<Room>
  updateRoom: (id: number, roomData: Partial<Room>) => Promise<void>
  deleteRoom: (id: number) => Promise<void>
  toggleRoomStatus: (id: number) => Promise<void>
  getRoomsByOwner: (ownerEmail?: string) => Room[]
}

const RoomContext = createContext<RoomContextType | undefined>(undefined)

export function RoomProvider({ children }: { children: ReactNode }) {
  const [rooms, setRooms] = useState<Room[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Fetch live rooms from MySQL Backend API
  const refreshRooms = async () => {
    setIsLoading(true)
    try {
      const res = await roomApi.getPublishedRooms()
      if (res && Array.isArray(res.rooms)) {
        setRooms(res.rooms)
      } else {
        setRooms([])
      }
    } catch (err: any) {
      console.error('Lỗi khi tải danh sách phòng từ CSDL:', err.message)
      setRooms([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refreshRooms()
  }, [])

  const addRoom = async (roomData: Omit<Room, 'id' | 'postedDate'>): Promise<Room> => {
    setIsLoading(true)
    try {
      const res = await roomApi.createRoom({
        boardingHouseId: roomData.boardingHouseId,
        title: roomData.title,
        description: roomData.description,
        price: Number(roomData.price),
        roomType: roomData.roomType,
        area: Number(roomData.area) || 20,
        amenities: Array.isArray(roomData.amenities) ? roomData.amenities.join(', ') : (roomData.amenities || ''),
        images: roomData.images,
        address: roomData.address,
        city: roomData.city,
        district: roomData.district,
        latitude: roomData.latitude,
        longitude: roomData.longitude,
      })
      if (res && res.room) {
        setRooms((prev) => [res.room, ...prev.filter((r) => r.id !== res.room.id)])
        return res.room
      }
    } catch (e: any) {
      console.error('Lỗi tạo phòng trong CSDL:', e.message)
      throw e
    } finally {
      setIsLoading(false)
    }

    const today = new Date().toISOString().split('T')[0]
    const fallbackRoom: Room = {
      ...roomData,
      id: Date.now(),
      postedDate: today,
      status: roomData.status || 'available',
    }
    return fallbackRoom
  }

  const updateRoom = async (id: number, roomData: Partial<Room>) => {
    try {
      const res = await roomApi.updateRoom(id, roomData)
      if (res && res.room) {
        setRooms((prev) => prev.map((r) => (r.id === id ? res.room : r)))
      } else {
        setRooms((prev) => prev.map((r) => (r.id === id ? { ...r, ...roomData } : r)))
      }
    } catch (e: any) {
      console.error('Lỗi cập nhật phòng trong CSDL:', e.message)
      throw e
    }
  }

  const deleteRoom = async (id: number) => {
    setRooms((prev) => prev.filter((r) => r.id !== id))
    try {
      await roomApi.deleteRoom(id)
    } catch (e: any) {
      console.error('Lỗi xóa phòng trong CSDL:', e.message)
      await refreshRooms()
      throw e
    }
  }

  const toggleRoomStatus = async (id: number) => {
    const target = rooms.find((r) => r.id === id)
    if (!target) return
    const nextStatus = target.status === 'rented' ? 'available' : 'rented'

    setRooms((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: nextStatus } : r))
    )

    try {
      const res = await roomApi.updateRoom(id, { status: nextStatus })
      if (res && res.room) {
        setRooms((prev) => prev.map((r) => (r.id === id ? res.room : r)))
      }
    } catch (e: any) {
      console.error('Lỗi đổi trạng thái phòng trong CSDL:', e.message)
      await refreshRooms()
    }
  }

  const getRoomsByOwner = (ownerEmail?: string): Room[] => {
    if (!ownerEmail) return rooms
    return rooms.filter(
      (r) => (r.ownerEmail || '').toLowerCase() === ownerEmail.toLowerCase()
    )
  }

  return (
    <RoomContext.Provider
      value={{
        rooms,
        isLoading,
        refreshRooms,
        addRoom,
        updateRoom,
        deleteRoom,
        toggleRoomStatus,
        getRoomsByOwner,
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
