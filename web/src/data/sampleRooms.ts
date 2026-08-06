export interface Room {
  id: number;
  title: string;
  city: string;
  price: number;
  roomType: 'private' | 'shared' | 'studio';
  description: string;
  address: string;
  contact: string;
  district?: string;
  area?: number;
  status?: 'available' | 'rented';
  amenities?: string[];
  ownerName?: string;
  ownerEmail?: string;
  images?: string[];
  postedDate?: string;
}

export const sampleRooms: Room[] = [
  {
    id: 1,
    title: 'Phòng riêng gần Nguyễn Văn Linh',
    city: 'Đà Nẵng',
    price: 2500000,
    roomType: 'private',
    description: 'Phòng sạch sẽ, có máy lạnh, gần trung tâm.',
    address: '28 Nguyễn Văn Linh, Đà Nẵng',
    contact: '0938 123 456',
    district: 'Liên Chiểu',
    area: 18,
    status: 'available',
    amenities: ['Wifi', 'Điều hòa', 'Máy giặt'],
    ownerName: 'Anh Nam',
    ownerEmail: 'nam.owner@example.com',
    images: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1493666438817-866a91353ca9?auto=format&fit=crop&w=1200&q=80'
    ],
    postedDate: '2026-07-28',
  },
  {
    id: 2,
    title: 'Phòng chung tiện nghi',
    city: 'Huế',
    price: 1200000,
    roomType: 'shared',
    description: 'Phù hợp sinh viên, có wifi và giặt là.',
    address: '10 Phạm Văn Đồng, Huế',
    contact: '0912 234 567',
    district: "Phú Vân",
    area: 12,
    status: 'available',
    amenities: ['Wifi', 'Chỗ để xe'],
    ownerName: 'Chị Lan',
    ownerEmail: 'lan.owner@example.com',
    images: [
      'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80'
    ],
    postedDate: '2026-06-15',
  },
  {
    id: 3,
    title: 'Studio mini đầy đủ nội thất',
    city: 'Đà Nẵng',
    price: 3200000,
    roomType: 'studio',
    description: 'Studio nhỏ thoáng mát, phù hợp người đi làm.',
    address: '72 Lê Duẩn, Đà Nẵng',
    contact: '0905 678 901',
    district: 'Hải Châu',
    area: 28,
    status: 'available',
    amenities: ['Wifi', 'Điều hòa', 'Nhà vệ sinh riêng', 'Chỗ để xe'],
    ownerName: 'Anh Tuấn',
    ownerEmail: 'tuan.owner@example.com',
    images: [
      'https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1200&q=80'
    ],
    postedDate: '2026-07-01',
  },
  {
    id: 4,
    title: 'Phòng cao cấp ở trung tâm',
    city: 'Hà Nội',
    price: 4000000,
    roomType: 'private',
    description: 'View đẹp, có bếp riêng, gần chợ và trường học.',
    address: '120 Trần Hưng Đạo, Hà Nội',
    contact: '0987 654 321',
    district: 'Hoàn Kiếm',
    area: 35,
    status: 'available',
    amenities: ['Wifi', 'Điều hòa', 'Máy giặt', 'Nhà vệ sinh riêng'],
    ownerName: 'Cô Hoa',
    ownerEmail: 'hoa.owner@example.com',
    images: [
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80'
    ],
    postedDate: '2026-05-20',
  },
];
