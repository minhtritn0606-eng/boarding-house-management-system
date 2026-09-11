const { getPool } = require('../config/database');

async function ensureBillsTable() {
  const pool = await getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS utility_bills (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      bill_number VARCHAR(50),
      room_id BIGINT NOT NULL,
      tenant_id BIGINT NOT NULL,
      landlord_id BIGINT NULL,
      month DATE NOT NULL,
      room_fee DECIMAL(12,2) DEFAULT 0.00,
      old_electric_meter INT DEFAULT 0,
      new_electric_meter INT DEFAULT 0,
      electricity_units INT DEFAULT 0,
      electric_rate DECIMAL(10,2) DEFAULT 3500.00,
      electricity_amount DECIMAL(12,2) DEFAULT 0.00,
      old_water_meter INT DEFAULT 0,
      new_water_meter INT DEFAULT 0,
      water_units INT DEFAULT 0,
      water_rate DECIMAL(10,2) DEFAULT 15000.00,
      water_amount DECIMAL(12,2) DEFAULT 0.00,
      internet_fee DECIMAL(10,2) DEFAULT 100000.00,
      trash_fee DECIMAL(10,2) DEFAULT 30000.00,
      service_fee DECIMAL(12,2) DEFAULT 0.00,
      other_fee DECIMAL(12,2) DEFAULT 0.00,
      other_fee_note VARCHAR(255),
      total_amount DECIMAL(12,2) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'unpaid',
      payment_method VARCHAR(50),
      due_date DATE,
      paid_at TIMESTAMP NULL,
      note TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
}

async function createBill(data) {
  await ensureBillsTable();
  const pool = await getPool();

  let targetRoomId = null;
  let targetTenantId = null;

  if (data.roomId && !isNaN(Number(data.roomId))) {
    targetRoomId = Number(data.roomId);
  } else if (data.roomNumber) {
    const cleanNum = String(data.roomNumber).replace(/[^\d]/g, '');
    const [matchingRooms] = await pool.query(
      `SELECT r.id FROM rooms r
       LEFT JOIN boarding_houses h ON r.boarding_house_id = h.id
       WHERE (h.landlord_id = ? OR ? IS NULL)
         AND (LOWER(r.title) LIKE ? OR r.id = ?)
       LIMIT 1`,
      [data.landlordId || 1, data.landlordId || 1, `%${String(data.roomNumber).toLowerCase()}%`, cleanNum || 0]
    );
    if (matchingRooms.length > 0) {
      targetRoomId = matchingRooms[0].id;
    }
  }

  if (data.tenantId && !isNaN(Number(data.tenantId))) {
    targetTenantId = Number(data.tenantId);
  } else if (targetRoomId) {
    const [contracts] = await pool.query(
      "SELECT tenant_id FROM contracts WHERE room_id = ? AND status = 'active' LIMIT 1",
      [targetRoomId]
    );
    if (contracts.length > 0) {
      targetTenantId = contracts[0].tenant_id;
    }
  }

  if (!targetTenantId && (data.tenantPhone || data.tenantName)) {
    const [tenants] = await pool.query(
      "SELECT id FROM tenants WHERE (phone = ? OR full_name LIKE ?) LIMIT 1",
      [data.tenantPhone || '', `%${data.tenantName || ''}%`]
    );
    if (tenants.length > 0) {
      targetTenantId = tenants[0].id;
    }
  }

  // Fallback to existing first room/tenant if none matched
  if (!targetRoomId) {
    const [firstRoom] = await pool.query('SELECT id FROM rooms LIMIT 1');
    targetRoomId = firstRoom.length > 0 ? firstRoom[0].id : 101;
  }
  if (!targetTenantId) {
    const [firstTenant] = await pool.query('SELECT id FROM tenants LIMIT 1');
    targetTenantId = firstTenant.length > 0 ? firstTenant[0].id : 1;
  }

  let monthVal = data.month;
  if (data.year && data.month && !String(data.month).includes('-')) {
    monthVal = `${data.year}-${String(data.month).padStart(2, '0')}-01`;
  } else if (!monthVal) {
    monthVal = '2026-08-01';
  }

  const billNumber = data.billNumber || `BILL-${Date.now().toString().slice(-6)}`;
  const elUnits = data.electricityUnits !== undefined ? Number(data.electricityUnits) : Math.max(0, (Number(data.newElectricMeter) || 0) - (Number(data.oldElectricMeter) || 0));
  const elRate = Number(data.electricRate) || 3500;
  const elAmt = data.electricityAmount !== undefined ? Number(data.electricityAmount) : elUnits * elRate;

  const wUnits = data.waterUnits !== undefined ? Number(data.waterUnits) : Math.max(0, (Number(data.newWaterMeter) || 0) - (Number(data.oldWaterMeter) || 0));
  const wRate = Number(data.waterRate) || 15000;
  const wAmt = data.waterAmount !== undefined ? Number(data.waterAmount) : wUnits * wRate;

  const rFee = Number(data.roomFee) || 0;
  const netFee = Number(data.internetFee) || 0;
  const trFee = Number(data.trashFee) || 0;
  const oFee = Number(data.otherFee) || 0;
  const totAmt = data.totalAmount ? Number(data.totalAmount) : (rFee + elAmt + wAmt + netFee + trFee + oFee);

  const [result] = await pool.query(
    `INSERT INTO utility_bills (
      bill_number, room_id, tenant_id, landlord_id, month,
      room_fee, old_electric_meter, new_electric_meter, electricity_units, electric_rate, electricity_amount,
      old_water_meter, new_water_meter, water_units, water_rate, water_amount,
      internet_fee, trash_fee, other_fee, other_fee_note, total_amount, status, due_date, note
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      billNumber,
      targetRoomId,
      targetTenantId,
      data.landlordId || 1,
      monthVal,
      rFee,
      Number(data.oldElectricMeter) || 0,
      Number(data.newElectricMeter) || 0,
      elUnits,
      elRate,
      elAmt,
      Number(data.oldWaterMeter) || 0,
      Number(data.newWaterMeter) || 0,
      wUnits,
      wRate,
      wAmt,
      netFee,
      trFee,
      oFee,
      data.otherFeeNote || null,
      totAmt,
      data.status || 'unpaid',
      data.dueDate || '2026-08-25',
      data.note || null,
    ]
  );

  return await findBillById(result.insertId);
}

async function findBillById(id) {
  await ensureBillsTable();
  const pool = await getPool();
  const [rows] = await pool.query(
    `SELECT b.*, 
            r.title AS room_title, r.price AS room_price,
            h.name AS house_name, h.address AS house_address,
            t.full_name AS tenant_name, t.phone AS tenant_phone
     FROM utility_bills b
     LEFT JOIN rooms r ON b.room_id = r.id
     LEFT JOIN boarding_houses h ON r.boarding_house_id = h.id
     LEFT JOIN tenants t ON b.tenant_id = t.id
     WHERE b.id = ?`,
    [id]
  );
  if (rows.length === 0) return null;
  return formatBillRow(rows[0]);
}

async function listBills(filters = {}) {
  await ensureBillsTable();
  const pool = await getPool();

  let query = `
    SELECT b.*, 
           r.title AS room_title, r.price AS room_price,
           h.name AS house_name, h.address AS house_address,
           t.full_name AS tenant_name, t.phone AS tenant_phone
    FROM utility_bills b
    LEFT JOIN rooms r ON b.room_id = r.id
    LEFT JOIN boarding_houses h ON r.boarding_house_id = h.id
    LEFT JOIN tenants t ON b.tenant_id = t.id
    LEFT JOIN landlords l ON b.landlord_id = l.id
    WHERE 1=1
  `;
  const values = [];

  if (filters.userId) {
    query += ' AND (l.user_id = ? OR b.landlord_id = ?)';
    values.push(filters.userId, filters.userId);
  } else if (filters.landlordId) {
    query += ' AND (b.landlord_id = ?)';
    values.push(filters.landlordId);
  }

  if (filters.status) {
    query += ' AND b.status = ?';
    values.push(filters.status);
  }

  query += ' ORDER BY b.id DESC';
  const [rows] = await pool.query(query, values);
  return rows.map(formatBillRow);
}

function formatBillRow(row) {
  const monthDate = row.month ? new Date(row.month) : new Date('2026-08-01');
  let roomNum = 'P.101';
  if (row.room_title) {
    const raw = row.room_title.split(' - ')[0].replace(/^Phòng\s+/i, '').trim();
    roomNum = raw && raw.includes('P.') ? raw : (raw ? `P.${raw.replace(/[^\d]/g, '')}` : `P.${row.room_id}`);
  } else if (row.room_id) {
    roomNum = `P.${row.room_id}`;
  }

  return {
    id: String(row.id),
    billNumber: row.bill_number || `BILL-${row.id}`,
    roomId: row.room_id,
    roomNumber: roomNum,
    houseName: row.house_name || '',
    tenantName: row.tenant_name || 'Khách thuê',
    tenantPhone: row.tenant_phone || '0905 888 999',
    month: monthDate.getMonth() + 1,
    year: monthDate.getFullYear(),
    roomFee: Number(row.room_fee) || 2500000,
    oldElectricMeter: row.old_electric_meter || 0,
    newElectricMeter: row.new_electric_meter || 0,
    electricUsage: row.electricity_units || Math.max(0, (row.new_electric_meter || 0) - (row.old_electric_meter || 0)),
    electricRate: Number(row.electric_rate) || 3500,
    electricAmount: Number(row.electricity_amount) || 0,
    oldWaterMeter: row.old_water_meter || 0,
    newWaterMeter: row.new_water_meter || 0,
    waterUsage: row.water_units || Math.max(0, (row.new_water_meter || 0) - (row.old_water_meter || 0)),
    waterRate: Number(row.water_rate) || 15000,
    waterAmount: Number(row.water_amount) || 0,
    internetFee: Number(row.internet_fee) || 100000,
    trashFee: Number(row.trash_fee) || 30000,
    otherFee: Number(row.other_fee) || 0,
    otherFeeNote: row.other_fee_note || '',
    totalAmount: Number(row.total_amount) || 2500000,
    status: row.status || 'unpaid',
    dueDate: row.due_date ? new Date(row.due_date).toISOString().split('T')[0] : '2026-08-25',
    paidDate: row.paid_at ? new Date(row.paid_at).toISOString().split('T')[0] : undefined,
    paymentMethod: row.payment_method || undefined,
    note: row.note || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function updateBill(id, updates) {
  await ensureBillsTable();
  const pool = await getPool();
  const fields = [];
  const values = [];

  if (updates.status) {
    fields.push('status = ?');
    values.push(updates.status);
    if (updates.status === 'paid') {
      fields.push('paid_at = CURRENT_TIMESTAMP');
    }
  }
  if (updates.paymentMethod) {
    fields.push('payment_method = ?');
    values.push(updates.paymentMethod);
  }
  if (updates.totalAmount !== undefined) {
    fields.push('total_amount = ?');
    values.push(updates.totalAmount);
  }
  if (updates.note !== undefined) {
    fields.push('note = ?');
    values.push(updates.note);
  }

  if (fields.length > 0) {
    values.push(id);
    await pool.query(`UPDATE utility_bills SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  return await findBillById(id);
}

async function deleteBill(id) {
  await ensureBillsTable();
  const pool = await getPool();
  await pool.query('DELETE FROM utility_bills WHERE id = ?', [id]);
}

module.exports = {
  createBill,
  findBillById,
  listBills,
  updateBill,
  deleteBill,
};
