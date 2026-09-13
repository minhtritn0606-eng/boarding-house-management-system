export interface Room {
  id: number;
  boardingHouseId?: number;
  title: string;
  city: string;
  price: number;
  roomType: 'private' | 'shared' | 'studio';
  description: string;
  address: string;
  contact: string;
  district?: string;
  area?: number;
  floor?: number;
  status?: 'available' | 'rented';
  amenities?: string[];
  ownerName?: string;
  ownerEmail?: string;
  images?: string[];
  postedDate?: string;
  latitude?: number;
  longitude?: number;
}

export const sampleRooms: Room[] = [];
