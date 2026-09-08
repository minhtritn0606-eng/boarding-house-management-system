const { getPool } = require('../config/database');

async function ensureRoomsTable() {
  const pool = await getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rooms (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      boarding_house_id BIGINT NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      price DECIMAL(12,2) NOT NULL,
      area DECIMAL(8,2) DEFAULT NULL,
      floor INT DEFAULT 1,
      room_type VARCHAR(100) NOT NULL DEFAULT 'standard',
      status VARCHAR(50) NOT NULL DEFAULT 'available',
      is_published BOOLEAN NOT NULL DEFAULT TRUE,
      available_from DATE DEFAULT NULL,
      amenities TEXT DEFAULT NULL,
      note TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
}

async function createRoom({ boardingHouseId, title, description, price, roomType = 'standard', area, floor = 1, amenities, images = [] }) {
  await ensureRoomsTable();
  const pool = await getPool();
  const [result] = await pool.query(
    'INSERT INTO rooms (boarding_house_id, title, description, price, room_type, area, floor, amenities, is_published) VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)',
    [
      boardingHouseId,
      title,
      description || null,
      price,
      roomType,
      area || null,
      floor || 1,
      Array.isArray(amenities) ? amenities.join(', ') : amenities || null,
    ]
  );

  const roomId = result.insertId;

  // Insert images if provided
  if (Array.isArray(images) && images.length > 0) {
    for (let i = 0; i < images.length; i++) {
      try {
        await pool.query(
          'INSERT INTO room_images (room_id, image_url, is_primary) VALUES (?, ?, ?)',
          [roomId, images[i], i === 0]
        );
      } catch (e) {}
    }
  }

  return await findRoomById(roomId);
}

async function findRoomById(id) {
  await ensureRoomsTable();
  const pool = await getPool();
  const [rows] = await pool.query(
    `SELECT r.*, 
            h.name AS house_name, h.address AS house_address, h.city AS house_city, h.district AS house_district,
            u.full_name AS owner_name, u.email AS owner_email, u.phone AS owner_phone
     FROM rooms r 
     LEFT JOIN boarding_houses h ON r.boarding_house_id = h.id 
     LEFT JOIN landlords l ON h.landlord_id = l.id
     LEFT JOIN users u ON l.user_id = u.id
     WHERE r.id = ?`,
    [id]
  );
  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];

  // Fetch images
  let images = [];
  try {
    const [imgRows] = await pool.query(
      'SELECT image_url FROM room_images WHERE room_id = ? ORDER BY is_primary DESC, id ASC',
      [id]
    );
    images = imgRows.map((img) => img.image_url);
  } catch (e) {}

  if (images.length === 0) {
    images = ['https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800'];
  }

  return {
    id: row.id,
    boardingHouseId: row.boarding_house_id,
    title: row.title,
    description: row.description || '',
    price: Number(row.price),
    roomType: row.room_type || 'private',
    status: row.status || 'available',
    isPublished: Boolean(row.is_published),
    address: row.house_address || 'Đà Nẵng',
    city: row.house_city || 'Đà Nẵng',
    district: row.house_district || 'Liên Chiểu',
    area: Number(row.area) || 20,
    floor: row.floor || 1,
    amenities: row.amenities ? row.amenities.split(',').map((s) => s.trim()).filter(Boolean) : [],
    ownerName: row.owner_name || 'Chủ trọ',
    ownerEmail: row.owner_email || 'nam.owner@example.com',
    contact: row.owner_phone || '0905 888 999',
    images,
    postedDate: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : '2026-08-01',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function updateRoom(id, updates) {
  await ensureRoomsTable();
  const pool = await getPool();
  const fields = [];
  const values = [];

  if (updates.title) {
    fields.push('title = ?');
    values.push(updates.title);
  }
  if (updates.description !== undefined) {
    fields.push('description = ?');
    values.push(updates.description);
  }
  if (updates.price !== undefined) {
    fields.push('price = ?');
    values.push(updates.price);
  }
  if (updates.roomType) {
    fields.push('room_type = ?');
    values.push(updates.roomType);
  }
  if (updates.status) {
    fields.push('status = ?');
    values.push(updates.status);
  }
  if (updates.isPublished !== undefined) {
    fields.push('is_published = ?');
    values.push(updates.isPublished);
  }
  if (updates.area !== undefined) {
    fields.push('area = ?');
    values.push(updates.area);
  }
  if (updates.floor !== undefined) {
    fields.push('floor = ?');
    values.push(updates.floor);
  }
  if (updates.amenities !== undefined) {
    fields.push('amenities = ?');
    values.push(Array.isArray(updates.amenities) ? updates.amenities.join(', ') : updates.amenities);
  }

  if (fields.length === 0) {
    return await findRoomById(id);
  }

  values.push(id);
  await pool.query(`UPDATE rooms SET ${fields.join(', ')} WHERE id = ?`, values);
  return await findRoomById(id);
}

async function deleteRoom(id) {
  await ensureRoomsTable();
  const pool = await getPool();
  await pool.query('DELETE FROM rooms WHERE id = ?', [id]);
}

async function listPublishedRooms(filters = {}) {
  await ensureRoomsTable();
  const pool = await getPool();

  let query = `
    SELECT r.*, 
           h.name AS house_name, h.address AS house_address, h.city AS house_city, h.district AS house_district,
           u.full_name AS owner_name, u.email AS owner_email, u.phone AS owner_phone
    FROM rooms r
    LEFT JOIN boarding_houses h ON r.boarding_house_id = h.id
    LEFT JOIN landlords l ON h.landlord_id = l.id
    LEFT JOIN users u ON l.user_id = u.id
    WHERE (r.is_published = TRUE OR r.is_published IS NULL)
  `;
  const values = [];

  if (filters.search) {
    query += ' AND (LOWER(r.title) LIKE ? OR LOWER(r.description) LIKE ? OR LOWER(h.name) LIKE ? OR LOWER(h.address) LIKE ?)';
    const searchTerm = `%${filters.search.toLowerCase()}%`;
    values.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  if (filters.city && filters.city !== 'all') {
    query += ' AND (LOWER(h.city) LIKE ? OR LOWER(h.address) LIKE ?)';
    values.push(`%${filters.city.toLowerCase()}%`, `%${filters.city.toLowerCase()}%`);
  }

  if (filters.minPrice !== undefined) {
    query += ' AND r.price >= ?';
    values.push(Number(filters.minPrice));
  }

  if (filters.maxPrice !== undefined) {
    query += ' AND r.price <= ?';
    values.push(Number(filters.maxPrice));
  }

  if (filters.roomType && filters.roomType !== 'all') {
    query += ' AND LOWER(r.room_type) = ?';
    values.push(filters.roomType.toLowerCase());
  }

  if (filters.status && filters.status !== 'all') {
    query += ' AND LOWER(r.status) = ?';
    values.push(filters.status.toLowerCase());
  }

  if (filters.userId) {
    query += ' AND (l.user_id = ?)';
    values.push(filters.userId);
  } else if (filters.landlordId) {
    query += ' AND (h.landlord_id = ?)';
    values.push(filters.landlordId);
  } else if (filters.ownerEmail) {
    query += ' AND (LOWER(u.email) = ?)';
    values.push(filters.ownerEmail.toLowerCase());
  }

  query += ' ORDER BY r.id ASC';

  const [rows] = await pool.query(query, values);

  let allImages = [];
  try {
    const [imgRows] = await pool.query('SELECT room_id, image_url FROM room_images ORDER BY is_primary DESC, id ASC');
    allImages = imgRows;
  } catch (e) {}

  return rows.map((row) => {
    const roomImgs = allImages.filter((img) => img.room_id === row.id).map((img) => img.image_url);
    const defaultImages = [
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
    ];

    return {
      id: row.id,
      boardingHouseId: row.boarding_house_id,
      title: row.title,
      description: row.description || '',
      price: Number(row.price),
      roomType: row.room_type || 'private',
      status: row.status || 'available',
      isPublished: Boolean(row.is_published),
      address: row.house_address || `${row.house_name || 'Dãy trọ'}, ${row.house_city || 'Đà Nẵng'}`,
      city: row.house_city || 'Đà Nẵng',
      district: row.house_district || 'Liên Chiểu',
      area: Number(row.area) || 20,
      floor: row.floor || 1,
      amenities: row.amenities ? row.amenities.split(',').map((s) => s.trim()).filter(Boolean) : ['Wifi', 'Nóng lạnh'],
      ownerName: row.owner_name || 'Anh Nam',
      ownerEmail: row.owner_email || 'nam.owner@example.com',
      contact: row.owner_phone || '0905 888 999',
      images: roomImgs.length > 0 ? roomImgs : defaultImages,
      postedDate: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : '2026-08-01',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });
}

module.exports = {
  createRoom,
  findRoomById,
  updateRoom,
  deleteRoom,
  listPublishedRooms,
};
