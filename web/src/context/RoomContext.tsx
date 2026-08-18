import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { sampleRooms, type Room } from '../data/sampleRooms'

interface RoomContextType {
  rooms: Room[]
  addRoom: (roomData: Omit<Room, 'id' | 'postedDate'>) => Room
  updateRoom: (id: number, roomData: Partial<Room>) => void
  deleteRoom: (id: number) => void
  toggleRoomStatus: (id: number) => void
  getRoomsByOwner: (ownerEmail?: string) => Room[]
}

const RoomContext = createContext<RoomContextType | undefined>(undefined)

const ROOMS_STORAGE_KEY = 'boarding_house_rooms_data'

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

  useEffect(() => {
    try {
      localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(rooms))
    } catch (e) {
      console.error('Failed to save rooms to localStorage', e)
    }
  }, [rooms])

  const addRoom = (roomData: Omit<Room, 'id' | 'postedDate'>): Room => {
    const today = new Date().toISOString().split('T')[0]
    const nextId = rooms.length > 0 ? Math.max(...rooms.map((r) => r.id)) + 1 : 1

    const newRoom: Room = {
      ...roomData,
      id: nextId,
      postedDate: today,
      status: roomData.status || 'available',
    }

    setRooms((prev) => [newRoom, ...prev])
    return newRoom
  }

  const updateRoom = (id: number, roomData: Partial<Room>) => {
    setRooms((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...roomData } : r))
    )
  }

  const deleteRoom = (id: number) => {
    setRooms((prev) => prev.filter((r) => r.id !== id))
  }

  const toggleRoomStatus = (id: number) => {
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          return {
            ...r,
            status: r.status === 'rented' ? 'available' : 'rented',
          }
        }
        return r
      })
    )
  }

  const getRoomsByOwner = (ownerEmail?: string): Room[] => {
    if (!ownerEmail) return []
    return rooms.filter(
      (r) => (r.ownerEmail || '').toLowerCase() === ownerEmail.toLowerCase()
    )
  }

  return (
    <RoomContext.Provider
      value={{
        rooms,
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
