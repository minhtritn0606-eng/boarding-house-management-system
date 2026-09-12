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

export const sampleRooms: Room[] = [
  {
    id: 101,
    title: 'Phòng P.101 - Phòng đơn full nội thất có gác lửng',
    city: 'Đà Nẵng',
    district: 'Liên Chiểu',
    price: 2500000,
    roomType: 'private',
    description: 'Phòng tầng 1 khép kín sạch sẽ, có gác lửng đúc kiên cố, sẵn điều hòa và bình nóng lạnh mới 100%. Cách cổng trường ĐH Bách Khoa và ĐH Sư Phạm 500m.',
    address: '120 Ngô Thì Nhậm, P. Hòa Khánh Nam, Q. Liên Chiểu, Đà Nẵng',
    contact: '0905 888 999',
    area: 20,
    floor: 1,
    status: 'rented',
    amenities: ['Điều hòa', 'Gác lửng', 'Nóng lạnh', 'Wifi tốc độ cao', 'Chỗ để xe riêng'],
    ownerName: 'Nguyễn Văn Nam (Chủ trọ)',
    ownerEmail: 'nam.owner@example.com',
    images: [
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80'
    ],
    postedDate: '2026-08-01',
  },
  {
    id: 102,
    title: 'Phòng P.102 - Phòng khép kín ban công thoáng mát',
    city: 'Đà Nẵng',
    district: 'Liên Chiểu',
    price: 2200000,
    roomType: 'private',
    description: 'Phòng tầng 1 có ban công riêng, cửa sổ đón gió mát, giờ giấc tự do không chung chủ.',
    address: '120 Ngô Thì Nhậm, P. Hòa Khánh Nam, Q. Liên Chiểu, Đà Nẵng',
    contact: '0905 888 999',
    area: 18,
    floor: 1,
    status: 'rented',
    amenities: ['Wifi tốc độ cao', 'Nóng lạnh', 'Ban công', 'Giờ giấc tự do'],
    ownerName: 'Nguyễn Văn Nam (Chủ trọ)',
    ownerEmail: 'nam.owner@example.com',
    images: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80'
    ],
    postedDate: '2026-08-01',
  },
  {
    id: 103,
    title: 'Phòng P.103 - Phòng trọ tiện nghi gần cổng trường ĐHBK',
    city: 'Đà Nẵng',
    district: 'Liên Chiểu',
    price: 2000000,
    roomType: 'private',
    description: 'Phòng mới dọn dẹp sạch sẽ, tường ốp gạch men cao cấp, có sẵn quạt trần, móc áo và kệ bếp. Sẵn sàng vào ở ngay.',
    address: '120 Ngô Thì Nhậm, P. Hòa Khánh Nam, Q. Liên Chiểu, Đà Nẵng',
    contact: '0905 888 999',
    area: 18,
    floor: 1,
    status: 'available',
    amenities: ['Wifi tốc độ cao', 'Nóng lạnh', 'Chỗ để xe riêng', 'Camera an ninh'],
    ownerName: 'Nguyễn Văn Nam (Chủ trọ)',
    ownerEmail: 'nam.owner@example.com',
    images: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80'
    ],
    postedDate: '2026-08-01',
  },
  {
    id: 201,
    title: 'Phòng P.201 - Phòng đôi có máy lạnh & tủ lạnh mini',
    city: 'Đà Nẵng',
    district: 'Liên Chiểu',
    price: 3200000,
    roomType: 'shared',
    description: 'Phòng tầng 2 rộng rãi thích hợp cho 2 bạn sinh viên hoặc người đi làm ở ghép.',
    address: '120 Ngô Thì Nhậm, P. Hòa Khánh Nam, Q. Liên Chiểu, Đà Nẵng',
    contact: '0905 888 999',
    area: 25,
    floor: 2,
    status: 'rented',
    amenities: ['Điều hòa', 'Tủ lạnh', 'Gác lửng', 'Nóng lạnh', 'Wifi tốc độ cao'],
    ownerName: 'Nguyễn Văn Nam (Chủ trọ)',
    ownerEmail: 'nam.owner@example.com',
    images: [
      'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80'
    ],
    postedDate: '2026-08-01',
  },
  {
    id: 202,
    title: 'Phòng P.202 - Studio cao cấp cửa sổ lớn view thoáng',
    city: 'Đà Nẵng',
    district: 'Liên Chiểu',
    price: 3500000,
    roomType: 'studio',
    description: 'Phòng Studio tầng 2 trang bị giường nệm, tủ quần áo lớn, bếp nấu ăn riêng, ban công riêng.',
    address: '120 Ngô Thì Nhậm, P. Hòa Khánh Nam, Q. Liên Chiểu, Đà Nẵng',
    contact: '0905 888 999',
    area: 28,
    floor: 2,
    status: 'available',
    amenities: ['Điều hòa', 'Bếp riêng', 'Tủ quần áo', 'Tủ lạnh', 'Máy giặt chung', 'Khóa vân tay'],
    ownerName: 'Nguyễn Văn Nam (Chủ trọ)',
    ownerEmail: 'nam.owner@example.com',
    images: [
      'https://images.unsplash.com/photo-1502005229762-ee1afd597405?auto=format&fit=crop&w=1200&q=80'
    ],
    postedDate: '2026-08-01',
  },
  {
    id: 203,
    title: 'Phòng P.203 - Phòng đơn ban công view công viên',
    city: 'Đà Nẵng',
    district: 'Liên Chiểu',
    price: 2400000,
    roomType: 'private',
    description: 'Phòng tầng 2 view đẹp, yên tĩnh thích hợp học tập và làm việc online.',
    address: '120 Ngô Thì Nhậm, P. Hòa Khánh Nam, Q. Liên Chiểu, Đà Nẵng',
    contact: '0905 888 999',
    area: 20,
    floor: 2,
    status: 'rented',
    amenities: ['Điều hòa', 'Ban công', 'Nóng lạnh', 'Wifi tốc độ cao'],
    ownerName: 'Nguyễn Văn Nam (Chủ trọ)',
    ownerEmail: 'nam.owner@example.com',
    images: [
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80'
    ],
    postedDate: '2026-08-01',
  },
  {
    id: 301,
    title: 'Phòng P.301 - Căn hộ mini 1 phòng ngủ khép kín',
    city: 'Đà Nẵng',
    district: 'Cẩm Lệ',
    price: 4000000,
    roomType: 'studio',
    description: 'Căn hộ mini tầng 3 tách biệt phòng ngủ và phòng khách, có sofa nhỏ và bàn làm việc, gần chợ Cẩm Lệ.',
    address: '45 Cách Mạng Tháng 8, P. Khuê Trung, Q. Cẩm Lệ, Đà Nẵng',
    contact: '0905 888 999',
    area: 32,
    floor: 3,
    status: 'rented',
    amenities: ['Full nội thất', 'Điều hòa', 'Máy giặt riêng', 'Bếp', 'Khóa vân tay', 'Smart TV'],
    ownerName: 'Nguyễn Văn Nam (Chủ trọ)',
    ownerEmail: 'nam.owner@example.com',
    images: [
      'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?auto=format&fit=crop&w=1200&q=80'
    ],
    postedDate: '2026-08-01',
  },
  {
    id: 302,
    title: 'Phòng P.302 - Phòng đơn tiện nghi gần chợ Cẩm Lệ',
    city: 'Đà Nẵng',
    district: 'Cẩm Lệ',
    price: 2300000,
    roomType: 'private',
    description: 'Phòng sạch sẽ, giá cả hợp lý, đường lớn ô tô vào tận cổng.',
    address: '45 Cách Mạng Tháng 8, P. Khuê Trung, Q. Cẩm Lệ, Đà Nẵng',
    contact: '0905 888 999',
    area: 19,
    floor: 3,
    status: 'available',
    amenities: ['Wifi tốc độ cao', 'Nóng lạnh', 'Để xe tầng 1', 'Giờ giấc tự do'],
    ownerName: 'Nguyễn Văn Nam (Chủ trọ)',
    ownerEmail: 'nam.owner@example.com',
    images: [
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80'
    ],
    postedDate: '2026-08-01',
  },
  {
    id: 401,
    title: 'Phòng P.401 - Studio phong cách hiện đại gần ĐH Kinh Tế',
    city: 'Đà Nẵng',
    district: 'Ngũ Hành Sơn',
    price: 3800000,
    roomType: 'studio',
    description: 'Phòng Studio thiết kế trẻ trung, cách ĐH Kinh Tế (DUE) 300m, cách biển Mỹ Khê 800m.',
    address: '88 Phan Tứ, P. Mỹ An, Q. Ngũ Hành Sơn, Đà Nẵng',
    contact: '0914 222 333',
    area: 26,
    floor: 4,
    status: 'available',
    amenities: ['Điều hòa', 'Tủ lạnh', 'Bếp từ', 'Tủ đồ', 'Khóa thẻ từ', 'Wifi tốc độ cao'],
    ownerName: 'Lê Thị Thu Lan',
    ownerEmail: 'lan.landlord@example.com',
    images: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80'
    ],
    postedDate: '2026-08-01',
  },
  {
    id: 601,
    title: 'Phòng P.501 - Căn hộ Studio cao cấp view sông Hàn',
    city: 'Đà Nẵng',
    district: 'Hải Châu',
    price: 4500000,
    roomType: 'studio',
    description: 'Căn hộ dịch vụ trung tâm Hải Châu đầy đủ tiện nghi tiêu chuẩn khách sạn, có thang máy.',
    address: '210 Đường 2 Tháng 9, P. Hòa Cường Bắc, Q. Hải Châu, Đà Nẵng',
    contact: '0983 444 555',
    area: 35,
    floor: 5,
    status: 'available',
    amenities: ['Thang máy', 'Điều hòa Inverter', 'Tủ lạnh Side by side', 'Máy giặt riêng', 'Ban công kính'],
    ownerName: 'Trần Minh Đức',
    ownerEmail: 'duc.landlord@example.com',
    images: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80'
    ],
    postedDate: '2026-08-01',
  }
];
