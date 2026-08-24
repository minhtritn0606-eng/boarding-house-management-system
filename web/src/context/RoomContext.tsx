import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { sampleRooms, type Room } from '../data/sampleRooms'
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

const ROOMS_STORAGE_KEY = 'boarding_house_rooms_data_v2'

export function RoomProvider({ children }: { children: ReactNode }) {
  const [rooms, setRooms] = useState<Room[]>(() => {
    try {
      const saved = localStorage.getItem(ROOMS_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
        }
      }
    } catch (e) {
      console.error('Failed to parse rooms from localStorage', e)
    }
    return sampleRooms
  })
  const [isLoading, setIsLoading] = useState(false)

  // Fetch live rooms from MySQL Backend API on mount
  const refreshRooms = async () => {
    setIsLoading(true)
    try {
      const res = await roomApi.getPublishedRooms()
      if (res && Array.isArray(res.rooms) && res.rooms.length > 0) {
        setRooms(res.rooms)
        localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(res.rooms))
        return
      }
    } catch (err: any) {
      console.warn('Backend offline or error, using local seed data:', err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refreshRooms()
  }, [])

  useEffect(() => {
    try {
      if (rooms.length > 0) {
        localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(rooms))
      }
    } catch (e) {
      console.error('Failed to save rooms to localStorage', e)
    }
  }, [rooms])

  const addRoom = async (roomData: Omit<Room, 'id' | 'postedDate'>): Promise<Room> => {
    const today = new Date().toISOString().split('T')[0]
    const nextId = rooms.length > 0 ? Math.max(...rooms.map((r) => r.id)) + 1 : 101

    const newLocalRoom: Room = {
      ...roomData,
      id: nextId,
      postedDate: today,
      status: roomData.status || 'available',
    }

    try {
      const res = await roomApi.createRoom({
        boardingHouseId: 1, // Default house
        title: roomData.title,
        description: roomData.description,
        price: roomData.price,
        roomType: roomData.roomType,
        area: roomData.area,
        amenities: Array.isArray(roomData.amenities) ? roomData.amenities.join(', ') : roomData.amenities,
      })
      if (res && res.room) {
        setRooms((prev) => [res.room, ...prev])
        return res.room
      }
    } catch (e: any) {
      console.warn('Backend createRoom offline/fallback:', e.message)
    }

    setRooms((prev) => [newLocalRoom, ...prev])
    return newLocalRoom
  }

  const updateRoom = async (id: number, roomData: Partial<Room>) => {
    setRooms((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...roomData } : r))
    )

    try {
      await roomApi.updateRoom(id, roomData)
    } catch (e: any) {
      console.warn('Backend updateRoom error:', e.message)
    }
  }

  const deleteRoom = async (id: number) => {
    setRooms((prev) => prev.filter((r) => r.id !== id))
    try {
      await roomApi.deleteRoom(id)
    } catch (e: any) {
      console.warn('Backend deleteRoom error:', e.message)
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
      await roomApi.updateRoom(id, { status: nextStatus })
    } catch (e: any) {
      console.warn('Backend toggle status error:', e.message)
    }
  }

  const getRoomsByOwner = (ownerEmail?: string): Room[] => {
    if (!ownerEmail) return rooms
    const filtered = rooms.filter(
      (r) => (r.ownerEmail || '').toLowerCase() === ownerEmail.toLowerCase()
    )
    return filtered.length > 0 ? filtered : rooms
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
