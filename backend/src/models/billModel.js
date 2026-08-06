const { getPool } = require('../config/database');

async function ensureBillsTable() {
  const pool = await getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bills (
      id INT AUTO_INCREMENT PRIMARY KEY,
      landlord_id INT NOT NULL,
      contract_id INT NOT NULL,
      tenant_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      due_date DATE,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      bill_type VARCHAR(100) NOT NULL DEFAULT 'rent',
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
}

async function createBill({ landlordId, contractId, tenantId, title, amount, dueDate, status = 'pending', billType = 'rent', description = '' }) {
  await ensureBillsTable();
  const pool = await getPool();
  const [result] = await pool.query(
    'INSERT INTO bills (landlord_id, contract_id, tenant_id, title, amount, due_date, status, bill_type, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [landlordId, contractId, tenantId, title, amount, dueDate || null, status, billType, description]
  );

  return {
    id: result.insertId,
    landlordId,
    contractId,
    tenantId,
    title,
    amount,
    dueDate,
    status,
    billType,
    description,
  };
}

async function findBillById(id) {
  await ensureBillsTable();
  const pool = await getPool();
  const [rows] = await pool.query('SELECT * FROM bills WHERE id = ?', [id]);
  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  return {
    id: row.id,
    landlordId: row.landlord_id,
    contractId: row.contract_id,
    tenantId: row.tenant_id,
    title: row.title,
    amount: Number(row.amount),
    dueDate: row.due_date,
    status: row.status,
    billType: row.bill_type,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listBills({ landlordId, contractId, tenantId }) {
  await ensureBillsTable();
  const pool = await getPool();

  let query = 'SELECT * FROM bills WHERE landlord_id = ?';
  const values = [landlordId];

  if (contractId) {
    query += ' AND contract_id = ?';
    values.push(contractId);
  }

  if (tenantId) {
    query += ' AND tenant_id = ?';
    values.push(tenantId);
  }

  query += ' ORDER BY created_at DESC';
  const [rows] = await pool.query(query, values);

  return rows.map((row) => ({
    id: row.id,
    landlordId: row.landlord_id,
    contractId: row.contract_id,
    tenantId: row.tenant_id,
    title: row.title,
    amount: Number(row.amount),
    dueDate: row.due_date,
    status: row.status,
    billType: row.bill_type,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

async function updateBill(id, updates) {
  await ensureBillsTable();
  const fields = [];
  const values = [];

  if (updates.title) {
    fields.push('title = ?');
    values.push(updates.title);
  }
  if (updates.amount !== undefined) {
    fields.push('amount = ?');
    values.push(updates.amount);
  }
  if (updates.dueDate !== undefined) {
    fields.push('due_date = ?');
    values.push(updates.dueDate);
  }
  if (updates.status) {
    fields.push('status = ?');
    values.push(updates.status);
  }
  if (updates.billType) {
    fields.push('bill_type = ?');
    values.push(updates.billType);
  }
  if (updates.description !== undefined) {
    fields.push('description = ?');
    values.push(updates.description);
  }

  if (fields.length === 0) {
    return await findBillById(id);
  }

  values.push(id);
  const pool = await getPool();
  await pool.query(`UPDATE bills SET ${fields.join(', ')} WHERE id = ?`, values);
  return await findBillById(id);
}

async function deleteBill(id) {
  await ensureBillsTable();
  const pool = await getPool();
  await pool.query('DELETE FROM bills WHERE id = ?', [id]);
}

module.exports = {
  createBill,
  findBillById,
  listBills,
  updateBill,
  deleteBill,
};
