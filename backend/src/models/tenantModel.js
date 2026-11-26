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

  // Tạo bảng quan hệ 1-N chuẩn RDBMS cho Người ở cùng (không lưu JSON)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tenant_roommates (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      tenant_id BIGINT NOT NULL,
      name VARCHAR(100) NOT NULL,
      phone VARCHAR(20) NULL,
      id_card VARCHAR(50) NULL,
      hometown VARCHAR(150) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tenant_id (tenant_id)
    )
  `);

  // Dọn dẹp cột JSON cũ nếu có trong bảng tenants để đồng bộ chuẩn quan hệ
  try {
    const [cols] = await pool.query("SHOW COLUMNS FROM tenants LIKE 'roommates'");
    if (cols.length > 0) {
      await pool.query('ALTER TABLE tenants DROP COLUMN roommates');
    }
  } catch (err) {
    // Bỏ qua nếu không có quyền drop
  }
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
  roommates = [],
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

  // Lưu danh sách người ở cùng vào bảng quan hệ riêng tenant_roommates
  if (Array.isArray(roommates) && roommates.length > 0) {
    for (const rm of roommates) {
      if (rm && rm.name) {
        await pool.query(
          `INSERT INTO tenant_roommates (tenant_id, name, phone, id_card, hometown)
           VALUES (?, ?, ?, ?, ?)`,
          [tenantId, rm.name, rm.phone || null, rm.idCard || rm.id_card || null, rm.hometown || null]
        );
      }
    }
  }

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
  const tenant = formatTenantRow(rows[0]);
  const [roommates] = await pool.query(
    'SELECT * FROM tenant_roommates WHERE tenant_id = ? ORDER BY id ASC',
    [id]
  );
  tenant.roommates = roommates.map(formatRoommateRow);
  return tenant;
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
  const tenants = rows.map(formatTenantRow);

  if (tenants.length > 0) {
    const tenantIds = tenants.map((t) => Number(t.id));
    const [roommateRows] = await pool.query(
      'SELECT * FROM tenant_roommates WHERE tenant_id IN (?) ORDER BY id ASC',
      [tenantIds]
    );
    const map = new Map();
    for (const rm of roommateRows) {
      const key = String(rm.tenant_id);
      const arr = map.get(key) || [];
      arr.push(formatRoommateRow(rm));
      map.set(key, arr);
    }
    for (const t of tenants) {
      t.roommates = map.get(t.id) || [];
    }
  }

  return tenants;
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

function formatRoommateRow(row) {
  return {
    id: String(row.id),
    name: row.name,
    phone: row.phone || '',
    idCard: row.id_card || '',
    hometown: row.hometown || '',
  };
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
    roommates: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function updateTenant(id, updates) {
  await ensureTenantsTable();
  const pool = await getPool();
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

  if (fields.length > 0) {
    values.push(id);
    await pool.query(`UPDATE tenants SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  // Đồng bộ danh sách người ở cùng vào bảng quan hệ riêng tenant_roommates
  if (updates.roommates !== undefined && Array.isArray(updates.roommates)) {
    await pool.query('DELETE FROM tenant_roommates WHERE tenant_id = ?', [id]);
    for (const rm of updates.roommates) {
      if (rm && rm.name) {
        await pool.query(
          `INSERT INTO tenant_roommates (tenant_id, name, phone, id_card, hometown)
           VALUES (?, ?, ?, ?, ?)`,
          [id, rm.name, rm.phone || null, rm.idCard || rm.id_card || null, rm.hometown || null]
        );
      }
    }
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
      const startDate = updates.rentStartDate || new Date().toISOString().split('T')[0];
      const endDate = updates.rentEndDate || '2027-12-31';
      const depAmt = Number(updates.deposit) || Number(updates.monthlyRent) || 2500000;
      const rentAmt = Number(updates.monthlyRent) || Number(updates.deposit) || 2500000;

      await pool.query(
        `INSERT INTO contracts (contract_number, landlord_id, tenant_id, room_id, start_date, end_date, deposit_amount, rent_amount, status)
         VALUES (?, 1, ?, ?, ?, ?, ?, ?, 'active')`,
        [contractNum, id, targetRoomId, startDate, endDate, depAmt, rentAmt]
      );
      await pool.query("UPDATE rooms SET status = 'rented' WHERE id = ?", [targetRoomId]);
    }
  }

  if (updates.status === 'active') {
    await pool.query("UPDATE contracts SET status = 'active' WHERE tenant_id = ? ORDER BY id DESC LIMIT 1", [id]);
  }

  if (updates.status === 'terminated' || updates.status === 'expired' || updates.status === 'cancelled') {
    try {
    await pool.query('DELETE FROM tenant_roommates WHERE tenant_id = ?', [id]);
  } catch (e) {
    // ignore
  }
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
  try {
    await pool.query('DELETE FROM tenant_roommates WHERE tenant_id = ?', [id]);
  } catch (e) {
    // ignore
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
