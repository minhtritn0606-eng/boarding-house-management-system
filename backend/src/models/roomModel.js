const { getPool } = require('../config/database');

async function ensureRoomsTable() {
  const pool = await getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rooms (
      id INT AUTO_INCREMENT PRIMARY KEY,
      boarding_house_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      price DECIMAL(10,2) NOT NULL,
      room_type VARCHAR(100) NOT NULL DEFAULT 'standard',
      status VARCHAR(50) NOT NULL DEFAULT 'available',
      is_published BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  try {
    await pool.query("ALTER TABLE rooms ADD COLUMN room_type VARCHAR(100) NOT NULL DEFAULT 'standard'");
  } catch (error) {
    // Ignore if the column already exists
  }
}

async function createRoom({ boardingHouseId, title, description, price, roomType = 'standard' }) {
  await ensureRoomsTable();
  const pool = await getPool();
  const [result] = await pool.query(
    'INSERT INTO rooms (boarding_house_id, title, description, price, room_type) VALUES (?, ?, ?, ?, ?)',
    [boardingHouseId, title, description || null, price, roomType]
  );

  return {
    id: result.insertId,
    boardingHouseId,
    title,
    description,
    price,
    roomType,
    status: 'available',
    isPublished: false,
  };
}

async function findRoomById(id) {
  await ensureRoomsTable();
  const pool = await getPool();
  const [rows] = await pool.query(
    'SELECT r.*, h.city AS house_city FROM rooms r LEFT JOIN boarding_houses h ON r.boarding_house_id = h.id WHERE r.id = ?',
    [id]
  );
  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  return {
    id: row.id,
    boardingHouseId: row.boarding_house_id,
    title: row.title,
    description: row.description,
    price: Number(row.price),
    roomType: row.room_type,
    status: row.status,
    isPublished: Boolean(row.is_published),
    city: row.house_city || null,
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
    SELECT r.*, h.city AS house_city
    FROM rooms r
    LEFT JOIN boarding_houses h ON r.boarding_house_id = h.id
    WHERE r.is_published = TRUE
  `;
  const values = [];

  if (filters.search) {
    query += ' AND (LOWER(r.title) LIKE ? OR LOWER(r.description) LIKE ?)';
    const searchTerm = `%${filters.search.toLowerCase()}%`;
    values.push(searchTerm, searchTerm);
  }

  if (filters.city) {
    query += ' AND LOWER(h.city) LIKE ?';
    values.push(`%${filters.city.toLowerCase()}%`);
  }

  if (filters.minPrice !== undefined) {
    query += ' AND r.price >= ?';
    values.push(Number(filters.minPrice));
  }

  if (filters.maxPrice !== undefined) {
    query += ' AND r.price <= ?';
    values.push(Number(filters.maxPrice));
  }

  if (filters.roomType) {
    query += ' AND LOWER(r.room_type) = ?';
    values.push(filters.roomType.toLowerCase());
  }

  if (filters.status) {
    query += ' AND LOWER(r.status) = ?';
    values.push(filters.status.toLowerCase());
  }

  query += ' ORDER BY r.created_at DESC';

  const [rows] = await pool.query(query, values);
  return rows.map((row) => ({
    id: row.id,
    boardingHouseId: row.boarding_house_id,
    title: row.title,
    description: row.description,
    price: Number(row.price),
    roomType: row.room_type,
    status: row.status,
    isPublished: Boolean(row.is_published),
    city: row.house_city || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

module.exports = {
  createRoom,
  findRoomById,
  updateRoom,
  deleteRoom,
  listPublishedRooms,
};
