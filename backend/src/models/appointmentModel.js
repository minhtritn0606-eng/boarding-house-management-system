const { getPool } = require('../config/database');

async function ensureAppointmentsTable() {
  const pool = await getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS viewing_requests (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      room_id BIGINT NOT NULL,
      landlord_id BIGINT,
      visitor_name VARCHAR(150) NOT NULL,
      phone VARCHAR(30) NOT NULL,
      viewing_date DATE NOT NULL,
      viewing_time VARCHAR(50) NOT NULL,
      note TEXT,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_viewing_requests_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT NOT NULL,
      title VARCHAR(150) NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function createAppointment({ roomId, visitorName, phone, viewingDate, viewingTime, note }) {
  await ensureAppointmentsTable();
  const pool = await getPool();

  // Find landlord and room details
  const [roomRows] = await pool.query(
    `SELECT r.id, r.title, h.landlord_id, l.user_id AS landlord_user_id, h.address AS house_address
     FROM rooms r
     LEFT JOIN boarding_houses h ON r.boarding_house_id = h.id
     LEFT JOIN landlords l ON h.landlord_id = l.id
     WHERE r.id = ?`,
    [roomId]
  );

  let landlordId = null;
  let landlordUserId = null;
  let roomTitle = 'Phòng trọ';

  if (roomRows.length > 0) {
    landlordId = roomRows[0].landlord_id;
    landlordUserId = roomRows[0].landlord_user_id;
    roomTitle = roomRows[0].title;
  }

  const [result] = await pool.query(
    `INSERT INTO viewing_requests (room_id, landlord_id, visitor_name, phone, viewing_date, viewing_time, note, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [roomId, landlordId, visitorName, phone, viewingDate, viewingTime, note || null]
  );

  const appointmentId = result.insertId;

  // Insert a notification for the landlord
  if (landlordUserId) {
    try {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message)
         VALUES (?, ?, ?)`,
        [
          landlordUserId,
          'Lịch hẹn xem phòng mới',
          `Khách hàng ${visitorName} (SĐT: ${phone}) vừa đặt lịch xem "${roomTitle}" vào ngày ${viewingDate} (${viewingTime}).`,
        ]
      );
    } catch (e) {
      console.warn('Could not insert notification:', e.message);
    }
  }

  return await getAppointmentById(appointmentId);
}

async function getAppointmentById(id) {
  await ensureAppointmentsTable();
  const pool = await getPool();
  const [rows] = await pool.query(
    `SELECT v.*, r.title AS room_title, r.price AS room_price,
            h.name AS house_name, h.address AS house_address
     FROM viewing_requests v
     LEFT JOIN rooms r ON v.room_id = r.id
     LEFT JOIN boarding_houses h ON r.boarding_house_id = h.id
     WHERE v.id = ?`,
    [id]
  );
  if (rows.length === 0) return null;
  return formatAppointmentRow(rows[0]);
}

async function listAppointments({ landlordId, userId, roomId, status }) {
  await ensureAppointmentsTable();
  const pool = await getPool();

  let query = `
    SELECT v.*, r.title AS room_title, r.price AS room_price,
           h.name AS house_name, h.address AS house_address,
           u.full_name AS landlord_name, u.phone AS landlord_phone
    FROM viewing_requests v
    LEFT JOIN rooms r ON v.room_id = r.id
    LEFT JOIN boarding_houses h ON r.boarding_house_id = h.id
    LEFT JOIN landlords l ON h.landlord_id = l.id
    LEFT JOIN users u ON l.user_id = u.id
    WHERE 1=1
  `;
  const values = [];

  if (userId) {
    query += ' AND l.user_id = ?';
    values.push(userId);
  } else if (landlordId) {
    query += ' AND v.landlord_id = ?';
    values.push(landlordId);
  }

  if (roomId) {
    query += ' AND v.room_id = ?';
    values.push(roomId);
  }

  if (status && status !== 'all') {
    query += ' AND v.status = ?';
    values.push(status);
  }

  query += ' ORDER BY v.created_at DESC';

  const [rows] = await pool.query(query, values);
  return rows.map(formatAppointmentRow);
}

async function updateAppointmentStatus(id, status) {
  await ensureAppointmentsTable();
  const pool = await getPool();
  await pool.query('UPDATE viewing_requests SET status = ? WHERE id = ?', [status, id]);
  return await getAppointmentById(id);
}

async function deleteAppointment(id) {
  await ensureAppointmentsTable();
  const pool = await getPool();
  await pool.query('DELETE FROM viewing_requests WHERE id = ?', [id]);
}

function formatAppointmentRow(row) {
  return {
    id: row.id,
    roomId: row.room_id,
    roomTitle: row.room_title || 'Phòng trọ',
    roomPrice: row.room_price ? Number(row.room_price) : 0,
    houseName: row.house_name || 'Dãy trọ',
    houseAddress: row.house_address || '',
    visitorName: row.visitor_name,
    phone: row.phone,
    viewingDate: row.viewing_date ? new Date(row.viewing_date).toISOString().split('T')[0] : '',
    viewingTime: row.viewing_time,
    note: row.note || '',
    status: row.status || 'pending',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

module.exports = {
  ensureAppointmentsTable,
  createAppointment,
  getAppointmentById,
  listAppointments,
  updateAppointmentStatus,
  deleteAppointment,
};
