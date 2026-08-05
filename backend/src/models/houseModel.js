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
  await pool.query('DELETE FROM boarding_houses WHERE id = ?', [id]);
}

module.exports = {
  createHouse,
  findHouseById,
  findHousesByLandlord,
  updateHouse,
  deleteHouse,
};
