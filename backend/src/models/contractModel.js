const { getPool } = require('../config/database');

async function ensureContractsTable() {
  const pool = await getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS contracts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      landlord_id INT NOT NULL,
      tenant_id INT NOT NULL,
      room_id INT NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      rent_amount DECIMAL(10,2) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
}

async function createContract({ landlordId, tenantId, roomId, startDate, endDate, rentAmount }) {
  await ensureContractsTable();
  const pool = await getPool();
  const [result] = await pool.query(
    'INSERT INTO contracts (landlord_id, tenant_id, room_id, start_date, end_date, rent_amount) VALUES (?, ?, ?, ?, ?, ?)',
    [landlordId, tenantId, roomId, startDate, endDate, rentAmount]
  );

  return {
    id: result.insertId,
    landlordId,
    tenantId,
    roomId,
    startDate,
    endDate,
    rentAmount,
    status: 'active',
  };
}

async function findContractById(id) {
  await ensureContractsTable();
  const pool = await getPool();
  const [rows] = await pool.query('SELECT * FROM contracts WHERE id = ?', [id]);
  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  return {
    id: row.id,
    landlordId: row.landlord_id,
    tenantId: row.tenant_id,
    roomId: row.room_id,
    startDate: row.start_date,
    endDate: row.end_date,
    rentAmount: Number(row.rent_amount),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listContractsByLandlord(landlordId) {
  await ensureContractsTable();
  const pool = await getPool();
  const [rows] = await pool.query('SELECT * FROM contracts WHERE landlord_id = ?', [landlordId]);
  return rows.map((row) => ({
    id: row.id,
    landlordId: row.landlord_id,
    tenantId: row.tenant_id,
    roomId: row.room_id,
    startDate: row.start_date,
    endDate: row.end_date,
    rentAmount: Number(row.rent_amount),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

async function cancelContract(id) {
  await ensureContractsTable();
  const pool = await getPool();
  await pool.query('UPDATE contracts SET status = ? WHERE id = ?', ['cancelled', id]);
  return await findContractById(id);
}

module.exports = {
  createContract,
  findContractById,
  listContractsByLandlord,
  cancelContract,
};
