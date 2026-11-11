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
  status?: 'available' | 'rented' | 'pending' | 'rejected' | string;
  amenities?: string[];
  ownerName?: string;
  ownerEmail?: string;
  images?: string[];
  postedDate?: string;
  latitude?: number;
  longitude?: number;
  isPublished?: boolean;
  aiRiskScore?: number;
  aiReviewStatus?: 'approved' | 'pending_review' | 'rejected' | string;
  aiFlags?: string[];
  aiSummary?: string;
  viewCount?: number;
  contactClicks?: number;
  zaloClicks?: number;
  appointmentCount?: number;
}

export const sampleRooms: Room[] = [];
