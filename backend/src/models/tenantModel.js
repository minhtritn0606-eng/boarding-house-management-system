const { getPool } = require('../config/database');

async function ensureTenantsTable() {
  const pool = await getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tenants (
      id INT AUTO_INCREMENT PRIMARY KEY,
      landlord_id INT NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(50),
      identity_number VARCHAR(100),
      note TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
}

async function createTenant({ landlordId, fullName, email, phone, identityNumber, note }) {
  await ensureTenantsTable();
  const pool = await getPool();
  const [result] = await pool.query(
    'INSERT INTO tenants (landlord_id, full_name, email, phone, identity_number, note) VALUES (?, ?, ?, ?, ?, ?)',
    [landlordId, fullName, email || null, phone || null, identityNumber || null, note || null]
  );

  return {
    id: result.insertId,
    landlordId,
    fullName,
    email,
    phone,
    identityNumber,
    note,
  };
}

async function findTenantById(id) {
  await ensureTenantsTable();
  const pool = await getPool();
  const [rows] = await pool.query('SELECT * FROM tenants WHERE id = ?', [id]);
  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  return {
    id: row.id,
    landlordId: row.landlord_id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    identityNumber: row.identity_number,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listTenantsByLandlord(landlordId) {
  await ensureTenantsTable();
  const pool = await getPool();
  const [rows] = await pool.query('SELECT * FROM tenants WHERE landlord_id = ?', [landlordId]);
  return rows.map((row) => ({
    id: row.id,
    landlordId: row.landlord_id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    identityNumber: row.identity_number,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

async function updateTenant(id, updates) {
  await ensureTenantsTable();
  const fields = [];
  const values = [];

  if (updates.fullName) {
    fields.push('full_name = ?');
    values.push(updates.fullName);
  }
  if (updates.email !== undefined) {
    fields.push('email = ?');
    values.push(updates.email);
  }
  if (updates.phone !== undefined) {
    fields.push('phone = ?');
    values.push(updates.phone);
  }
  if (updates.identityNumber !== undefined) {
    fields.push('identity_number = ?');
    values.push(updates.identityNumber);
  }
  if (updates.note !== undefined) {
    fields.push('note = ?');
    values.push(updates.note);
  }

  if (fields.length === 0) {
    return await findTenantById(id);
  }

  values.push(id);
  const pool = await getPool();
  await pool.query(`UPDATE tenants SET ${fields.join(', ')} WHERE id = ?`, values);
  return await findTenantById(id);
}

async function deleteTenant(id) {
  await ensureTenantsTable();
  const pool = await getPool();
  await pool.query('DELETE FROM tenants WHERE id = ?', [id]);
}

module.exports = {
  createTenant,
  findTenantById,
  listTenantsByLandlord,
  updateTenant,
  deleteTenant,
};
