const { getPool } = require('../config/database');

async function ensureTenantsTable() {
  const pool = await getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tenants (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT NULL,
      landlord_id BIGINT NULL,
      full_name VARCHAR(100) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      email VARCHAR(100),
      id_card VARCHAR(50),
      identity_number VARCHAR(50),
      hometown VARCHAR(150),
      job VARCHAR(100),
      emergency_contact VARCHAR(100),
      note TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
}

async function createTenant({
  landlordId = 1,
  fullName,
  email,
  phone,
  idCard,
  identityNumber,
  hometown,
  job,
  emergencyContact,
  note,
  roomId,
  roomNumber,
  rentStartDate,
  rentEndDate,
  deposit,
  monthlyRent,
}) {
  await ensureTenantsTable();
  const pool = await getPool();
  const [result] = await pool.query(
    `INSERT INTO tenants (landlord_id, full_name, email, phone, id_card, identity_number, hometown, job, emergency_contact, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      landlordId,
      fullName,
      email || null,
      phone || '0905 111 222',
      idCard || identityNumber || null,
      identityNumber || idCard || null,
      hometown || 'Đà Nẵng',
      job || 'Người đi làm',
      emergencyContact || null,
      note || null,
    ]
  );

  const tenantId = result.insertId;

  // Resolve target roomId if provided
  let targetRoomId = null;
  if (roomId && !isNaN(Number(roomId))) {
    targetRoomId = Number(roomId);
  } else if (roomNumber) {
    const cleanNum = roomNumber.replace(/[^\d]/g, '');
    const [matchingRooms] = await pool.query(
      `SELECT r.id FROM rooms r
       LEFT JOIN boarding_houses h ON r.boarding_house_id = h.id
       WHERE (h.landlord_id = ? OR ? IS NULL)
         AND (LOWER(r.title) LIKE ? OR r.id = ?)
       LIMIT 1`,
      [landlordId, landlordId, `%${roomNumber.toLowerCase()}%`, cleanNum || 0]
    );
    if (matchingRooms.length > 0) {
      targetRoomId = matchingRooms[0].id;
    }
  }

  // Create contract record and occupy room
  if (targetRoomId) {
    const contractNum = `HD-${new Date().getFullYear()}-${targetRoomId}`;
    const startDate = rentStartDate || new Date().toISOString().split('T')[0];
    const endDate = rentEndDate || '2027-12-31';
    const depAmt = Number(deposit) || Number(monthlyRent) || 2500000;
    const rentAmt = Number(monthlyRent) || Number(deposit) || 2500000;

    try {
      await pool.query(
        "UPDATE contracts SET status = 'cancelled' WHERE room_id = ? AND status = 'active'",
        [targetRoomId]
      );

      await pool.query(
        `INSERT INTO contracts (contract_number, landlord_id, tenant_id, room_id, start_date, end_date, deposit_amount, rent_amount, status, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
        [contractNum, landlordId, tenantId, targetRoomId, startDate, endDate, depAmt, rentAmt, note || null]
      );

      await pool.query("UPDATE rooms SET status = 'rented' WHERE id = ?", [targetRoomId]);
    } catch (err) {
      console.warn('Error creating contract for tenant:', err.message);
    }
  }

  return await findTenantById(tenantId);
}

async function findTenantById(id) {
  await ensureTenantsTable();
  const pool = await getPool();
  const [rows] = await pool.query(
    `SELECT t.*, 
            c.contract_number, c.start_date, c.end_date, c.deposit_amount, c.rent_amount, c.status AS contract_status,
            r.id AS room_id, r.title AS room_title, r.price AS room_price,
            h.name AS house_name, h.address AS house_address
     FROM tenants t
     LEFT JOIN (
       SELECT c1.*
       FROM contracts c1
       INNER JOIN (
         SELECT tenant_id, MAX(id) as max_id
         FROM contracts
         GROUP BY tenant_id
       ) c2 ON c1.id = c2.max_id
     ) c ON t.id = c.tenant_id
     LEFT JOIN rooms r ON c.room_id = r.id
     LEFT JOIN boarding_houses h ON r.boarding_house_id = h.id
     WHERE t.id = ?`,
    [id]
  );
  if (rows.length === 0) return null;
  return formatTenantRow(rows[0]);
}

async function listTenants(filters = {}) {
  await ensureTenantsTable();
  const pool = await getPool();

  let query = `
    SELECT t.*, 
           c.contract_number, c.start_date, c.end_date, c.deposit_amount, c.rent_amount, c.status AS contract_status,
           r.id AS room_id, r.title AS room_title, r.price AS room_price,
           h.name AS house_name, h.address AS house_address
    FROM tenants t
    LEFT JOIN (
      SELECT c1.*
      FROM contracts c1
      INNER JOIN (
        SELECT tenant_id, MAX(id) as max_id
        FROM contracts
        GROUP BY tenant_id
      ) c2 ON c1.id = c2.max_id
    ) c ON t.id = c.tenant_id
    LEFT JOIN rooms r ON c.room_id = r.id
    LEFT JOIN boarding_houses h ON r.boarding_house_id = h.id
    LEFT JOIN landlords l ON t.landlord_id = l.id
    WHERE 1=1
  `;
  const values = [];

  if (filters.userId) {
    query += ' AND (l.user_id = ? OR t.user_id = ?)';
    values.push(filters.userId, filters.userId);
  } else if (filters.landlordId) {
    query += ' AND (t.landlord_id = ?)';
    values.push(filters.landlordId);
  }

  query += ' ORDER BY t.id ASC';
  const [rows] = await pool.query(query, values);
  return rows.map(formatTenantRow);
}

function parseRoomNumber(title, roomId) {
  if (!title) return roomId ? `P.${roomId}` : 'Chưa xếp phòng';
  const t = String(title).trim();

  // 1. Format "SốPhòng - Tiêu đề" (VD: "201 - Phòng 201", "P.101 - Studio", "Ps2 - Q", "1 - 1")
  if (t.includes(' - ')) {
    const prefix = t.split(' - ')[0].trim();
    const stripped = prefix.replace(/^Phòng\s+/i, '').trim();
    if (stripped) return stripped;
    if (prefix) return prefix;
  }

  // 2. Format "Phòng 101", "P.102", "Phòng A1"
  const prefixMatch = t.match(/^(?:Phòng\s*)?([A-Za-z0-9._-]+)/i);
  if (prefixMatch && prefixMatch[1]) {
    return prefixMatch[1].trim();
  }

  // 3. Nếu tên phòng ngắn (VD: "201", "A1", "P1")
  if (t.length <= 15) {
    return t;
  }

  return roomId ? `P.${roomId}` : t.slice(0, 15);
}

function formatTenantRow(row) {
  const roomNum = parseRoomNumber(row.room_title, row.room_id);

  return {
    id: String(row.id),
    contractNumber: row.contract_number || `HD-2026-${String(row.id).padStart(3, '0')}`,
    name: row.full_name,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email || `${row.phone}@example.com`,
    idCard: row.identity_number || row.id_card || '048200000000',
    identityNumber: row.identity_number || row.id_card || '048200000000',
    hometown: row.hometown || 'Đà Nẵng',
    job: row.job || 'Người đi làm',
    emergencyContact: row.emergency_contact,
    roomId: row.room_id ? String(row.room_id) : `room_${row.id}`,
    roomNumber: roomNum,
    roomTitle: row.room_title || '',
    houseName: row.house_name || '',
    rentStartDate: row.start_date ? new Date(row.start_date).toISOString().split('T')[0] : '2026-01-01',
    rentEndDate: row.end_date ? new Date(row.end_date).toISOString().split('T')[0] : '2026-12-31',
    deposit: Number(row.deposit_amount) || Number(row.room_price) || 2500000,
    monthlyRent: Number(row.rent_amount) || Number(row.room_price) || 2500000,
    status: row.contract_status === 'active' ? 'active' : (row.contract_status === 'expired' ? 'expired' : 'terminated'),
    notes: row.note || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function updateTenant(id, updates) {
  await ensureTenantsTable();
  const fields = [];
  const values = [];

  if (updates.fullName || updates.name) {
    fields.push('full_name = ?');
    values.push(updates.fullName || updates.name);
  }
  if (updates.phone !== undefined) {
    fields.push('phone = ?');
    values.push(updates.phone);
  }
  if (updates.email !== undefined) {
    fields.push('email = ?');
    values.push(updates.email);
  }
  if (updates.idCard || updates.identityNumber) {
    fields.push('identity_number = ?', 'id_card = ?');
    values.push(updates.idCard || updates.identityNumber, updates.idCard || updates.identityNumber);
  }
  if (updates.hometown !== undefined) {
    fields.push('hometown = ?');
    values.push(updates.hometown);
  }
  if (updates.job !== undefined) {
    fields.push('job = ?');
    values.push(updates.job);
  }
  if (updates.note !== undefined || updates.notes !== undefined) {
    fields.push('note = ?');
    values.push(updates.note || updates.notes);
  }

  const pool = await getPool();
  if (fields.length > 0) {
    values.push(id);
    await pool.query(`UPDATE tenants SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  // Handle room reassignment if roomId or roomNumber provided
  if (updates.roomId || updates.roomNumber) {
    let targetRoomId = null;
    if (updates.roomId && !isNaN(Number(updates.roomId))) {
      targetRoomId = Number(updates.roomId);
    } else if (updates.roomNumber) {
      const cleanNum = updates.roomNumber.replace(/[^\d]/g, '');
      const [matchingRooms] = await pool.query(
        `SELECT r.id FROM rooms r WHERE LOWER(r.title) LIKE ? OR r.id = ? LIMIT 1`,
        [`%${updates.roomNumber.toLowerCase()}%`, cleanNum || 0]
      );
      if (matchingRooms.length > 0) {
        targetRoomId = matchingRooms[0].id;
      }
    }

    if (targetRoomId) {
      // Deactivate older contracts
      const [oldContracts] = await pool.query('SELECT room_id FROM contracts WHERE tenant_id = ?', [id]);
      await pool.query("UPDATE contracts SET status = 'cancelled' WHERE tenant_id = ?", [id]);
      for (const c of oldContracts) {
        if (c.room_id) {
          await pool.query("UPDATE rooms SET status = 'available' WHERE id = ?", [c.room_id]);
        }
      }

      const contractNum = `HD-${new Date().getFullYear()}-${targetRoomId}`;
      await pool.query(
        `INSERT INTO contracts (contract_number, landlord_id, tenant_id, room_id, start_date, end_date, deposit_amount, rent_amount, status)
         VALUES (?, 1, ?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 YEAR), 2500000, 2500000, 'active')`,
        [contractNum, id, targetRoomId]
      );
      await pool.query("UPDATE rooms SET status = 'rented' WHERE id = ?", [targetRoomId]);
    }
  }

  if (updates.status === 'terminated' || updates.status === 'expired' || updates.status === 'cancelled') {
    const [contracts] = await pool.query('SELECT room_id FROM contracts WHERE tenant_id = ?', [id]);
    await pool.query("UPDATE contracts SET status = 'cancelled' WHERE tenant_id = ?", [id]);
    for (const c of contracts) {
      if (c.room_id) {
        await pool.query("UPDATE rooms SET status = 'available' WHERE id = ?", [c.room_id]);
      }
    }
  }

  return await findTenantById(id);
}

async function deleteTenant(id) {
  await ensureTenantsTable();
  const pool = await getPool();
  try {
    await pool.query('DELETE FROM payments WHERE tenant_id = ?', [id]);
  } catch (e) {
    // ignore if payments table does not exist or empty
  }
  try {
    await pool.query('DELETE FROM utility_bills WHERE tenant_id = ?', [id]);
  } catch (e) {
    // ignore if utility_bills does not exist or empty
  }
  const [contracts] = await pool.query('SELECT room_id FROM contracts WHERE tenant_id = ?', [id]);
  await pool.query('DELETE FROM contracts WHERE tenant_id = ?', [id]);
  for (const c of contracts) {
    if (c.room_id) {
      await pool.query("UPDATE rooms SET status = 'available' WHERE id = ?", [c.room_id]);
    }
  }
  await pool.query('DELETE FROM tenants WHERE id = ?', [id]);
}

module.exports = {
  createTenant,
  findTenantById,
  listTenants,
  updateTenant,
  deleteTenant,
};
