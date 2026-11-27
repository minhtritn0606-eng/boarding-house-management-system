const { getPool } = require('../config/database');

async function ensureHousesTable() {
  const pool = await getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS boarding_houses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      landlord_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      address VARCHAR(500) NOT NULL,
      city VARCHAR(200) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
}

async function createHouse({ landlordId, name, address, city, description }) {
  await ensureHousesTable();
  const pool = await getPool();
  const [result] = await pool.query(
    'INSERT INTO boarding_houses (landlord_id, name, address, city, description) VALUES (?, ?, ?, ?, ?)',
    [landlordId, name, address, city, description || null]
  );

  return {
    id: result.insertId,
    landlordId,
    name,
    address,
    city,
    description,
  };
}

async function findHouseById(id) {
  await ensureHousesTable();
  const pool = await getPool();
  const [rows] = await pool.query('SELECT * FROM boarding_houses WHERE id = ?', [id]);
  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  return {
    id: row.id,
    landlordId: row.landlord_id,
    name: row.name,
    address: row.address,
    city: row.city,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function findHousesByLandlord(landlordId) {
  await ensureHousesTable();
  const pool = await getPool();
  const [rows] = await pool.query('SELECT * FROM boarding_houses WHERE landlord_id = ?', [landlordId]);
  return rows.map((row) => ({
    id: row.id,
    landlordId: row.landlord_id,
    name: row.name,
    address: row.address,
    city: row.city,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

async function updateHouse(id, updates) {
  await ensureHousesTable();
  const pool = await getPool();
  const fields = [];
  const values = [];

  if (updates.name) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.address) {
    fields.push('address = ?');
    values.push(updates.address);
  }
  if (updates.city) {
    fields.push('city = ?');
    values.push(updates.city);
  }
  if (updates.description !== undefined) {
    fields.push('description = ?');
    values.push(updates.description);
  }

  if (fields.length === 0) {
    return await findHouseById(id);
  }

  values.push(id);
  await pool.query(`UPDATE boarding_houses SET ${fields.join(', ')} WHERE id = ?`, values);
  return await findHouseById(id);
}

async function deleteHouse(id) {
  await ensureHousesTable();
  const pool = await getPool();
  try {
    await pool.query('DELETE FROM house_utility_settings WHERE house_id = ?', [id]);
  } catch (e) {}
  await pool.query('DELETE FROM boarding_houses WHERE id = ?', [id]);
}

async function ensureHouseUtilitySettingsTable() {
  const pool = await getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS house_utility_settings (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      house_id INT NOT NULL UNIQUE,
      electric_rate DECIMAL(10,2) DEFAULT 3500.00,
      water_rate DECIMAL(10,2) DEFAULT 15000.00,
      internet_fee DECIMAL(10,2) DEFAULT 100000.00,
      trash_fee DECIMAL(10,2) DEFAULT 30000.00,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_house_id (house_id)
    )
  `);
}

async function getHouseUtilitySettings(houseId) {
  await ensureHouseUtilitySettingsTable();
  const pool = await getPool();
  const [rows] = await pool.query(
    'SELECT * FROM house_utility_settings WHERE house_id = ?',
    [houseId]
  );
  if (rows.length === 0) {
    return {
      houseId: Number(houseId),
      electricRate: 3500,
      waterRate: 15000,
      internetFee: 100000,
      trashFee: 30000,
    };
  }
  const r = rows[0];
  return {
    id: r.id,
    houseId: r.house_id,
    electricRate: Number(r.electric_rate) || 3500,
    waterRate: Number(r.water_rate) || 15000,
    internetFee: Number(r.internet_fee) || 100000,
    trashFee: Number(r.trash_fee) || 30000,
    updatedAt: r.updated_at,
  };
}

async function saveHouseUtilitySettings(houseId, settings) {
  await ensureHouseUtilitySettingsTable();
  const pool = await getPool();

  const electricRate = settings.electricRate !== undefined ? Number(settings.electricRate) : 3500;
  const waterRate = settings.waterRate !== undefined ? Number(settings.waterRate) : 15000;
  const internetFee = settings.internetFee !== undefined ? Number(settings.internetFee) : 100000;
  const trashFee = settings.trashFee !== undefined ? Number(settings.trashFee) : 30000;

  await pool.query(
    `INSERT INTO house_utility_settings (house_id, electric_rate, water_rate, internet_fee, trash_fee)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       electric_rate = VALUES(electric_rate),
       water_rate = VALUES(water_rate),
       internet_fee = VALUES(internet_fee),
       trash_fee = VALUES(trash_fee),
       updated_at = CURRENT_TIMESTAMP`,
    [houseId, electricRate, waterRate, internetFee, trashFee]
  );

  return await getHouseUtilitySettings(houseId);
}

async function listAllHouses(filters = {}) {
  await ensureHousesTable();
  const pool = await getPool();

  let query = `
    SELECT h.*, 
           COUNT(r.id) AS total_rooms,
           u.full_name AS owner_name, u.email AS owner_email, u.phone AS owner_phone
    FROM boarding_houses h
    LEFT JOIN rooms r ON h.id = r.boarding_house_id
    LEFT JOIN landlords l ON h.landlord_id = l.id
    LEFT JOIN users u ON l.user_id = u.id
    WHERE 1=1
  `;
  const values = [];

  if (filters.userId) {
    query += ' AND l.user_id = ?';
    values.push(filters.userId);
  } else if (filters.landlordId) {
    query += ' AND h.landlord_id = ?';
    values.push(filters.landlordId);
  }

  query += ' GROUP BY h.id ORDER BY h.id ASC';

  const [rows] = await pool.query(query, values);
  return rows.map((row) => ({
    id: String(row.id),
    name: row.name,
    address: row.address,
    city: row.city,
    district: row.district || 'Liên Chiểu',
    description: row.description || '',
    totalRooms: Number(row.total_rooms) || 0,
    ownerName: row.owner_name || 'Chủ trọ',
    ownerEmail: row.owner_email || 'nam.owner@example.com',
    ownerPhone: row.owner_phone || '0905 888 999',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

module.exports = {
  createHouse,
  findHouseById,
  findHousesByLandlord,
  listAllHouses,
  updateHouse,
  deleteHouse,
  getHouseUtilitySettings,
  saveHouseUtilitySettings,
};
