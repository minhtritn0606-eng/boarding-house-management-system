const { getPool } = require('../config/database');

/**
 * Lấy số liệu thống kê tổng quan toàn sàn cho Admin
 */
async function getAdminStats(req, res) {
  try {
    const pool = await getPool();

    // 1. Thống kê người dùng
    const [userStats] = await pool.query(`
      SELECT 
        COUNT(*) AS total_users,
        SUM(CASE WHEN role = 'landlord' THEN 1 ELSE 0 END) AS total_landlords,
        SUM(CASE WHEN role = 'tenant' THEN 1 ELSE 0 END) AS total_tenants,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) AS total_admins,
        SUM(CASE WHEN role = 'visitor' THEN 1 ELSE 0 END) AS total_visitors
      FROM users
    `);

    // 2. Thống kê phòng trọ
    const [roomStats] = await pool.query(`
      SELECT 
        COUNT(*) AS total_rooms,
        SUM(CASE WHEN is_published = 1 THEN 1 ELSE 0 END) AS published_rooms,
        SUM(CASE WHEN is_published = 0 OR is_published IS NULL THEN 1 ELSE 0 END) AS hidden_rooms,
        SUM(CASE WHEN status = 'rented' THEN 1 ELSE 0 END) AS rented_rooms,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) AS available_rooms,
        AVG(price) AS average_price
      FROM rooms
    `);

    // 3. Thống kê dãy trọ / cơ sở
    const [houseStats] = await pool.query(`
      SELECT COUNT(*) AS total_houses FROM boarding_houses
    `);

    // 4. Thống kê hóa đơn & giao dịch
    let billStats = [{ total_bills: 0, paid_bills: 0, unpaid_bills: 0, total_revenue: 0 }];
    try {
      const [bills] = await pool.query(`
        SELECT 
          COUNT(*) AS total_bills,
          SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paid_bills,
          SUM(CASE WHEN status != 'paid' THEN 1 ELSE 0 END) AS unpaid_bills,
          SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END) AS total_revenue
        FROM utility_bills
      `);
      if (bills.length > 0) {
        billStats = bills;
      }
    } catch (err) {
      console.warn('Could not query utility_bills stats:', err.message);
    }

    return res.status(200).json({
      users: userStats[0] || {},
      rooms: roomStats[0] || {},
      houses: houseStats[0] || { total_houses: 0 },
      bills: billStats[0] || {},
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return res.status(500).json({ message: 'Không thể lấy dữ liệu thống kê quản trị', error: error.message });
  }
}

/**
 * Lấy danh sách tất cả người dùng kèm bộ lọc
 */
async function getAllUsers(req, res) {
  try {
    const pool = await getPool();
    const { search, role, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT 
        u.id, 
        u.full_name, 
        u.email, 
        u.phone, 
        u.role, 
        u.avatar, 
        u.created_at,
        (SELECT COUNT(*) FROM boarding_houses bh 
         JOIN landlords l ON bh.landlord_id = l.id 
         WHERE l.user_id = u.id) AS houses_count,
        (SELECT COUNT(*) FROM rooms r 
         JOIN boarding_houses bh ON r.boarding_house_id = bh.id 
         JOIN landlords l ON bh.landlord_id = l.id 
         WHERE l.user_id = u.id) AS rooms_count
      FROM users u
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND (u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    if (role && role !== 'all') {
      query += ` AND u.role = ?`;
      params.push(role);
    }

    query += ` ORDER BY u.id DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const [users] = await pool.query(query, params);

    return res.status(200).json({ users });
  } catch (error) {
    console.error('Error fetching users for admin:', error);
    return res.status(500).json({ message: 'Không thể lấy danh sách người dùng', error: error.message });
  }
}

/**
 * Cập nhật vai trò (Role) của người dùng
 */
async function updateUserRole(req, res) {
  try {
    const pool = await getPool();
    const userId = Number(req.params.id);
    const { role } = req.body;

    const validRoles = ['admin', 'landlord', 'tenant', 'visitor'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Vai trò không hợp lệ' });
    }

    // Không cho phép tự giáng cấp tài khoản admin của chính mình nếu là admin duy nhất
    if (req.user && req.user.id === userId && role !== 'admin') {
      return res.status(400).json({ message: 'Bạn không thể tự hạ quyền Admin của chính mình' });
    }

    await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, userId]);

    // Nếu nâng cấp lên landlord, đảm bảo có bản ghi trong bảng landlords
    if (role === 'landlord') {
      const [existingLandlord] = await pool.query('SELECT id FROM landlords WHERE user_id = ?', [userId]);
      if (existingLandlord.length === 0) {
        await pool.query('INSERT INTO landlords (user_id, company_name) VALUES (?, ?)', [
          userId,
          'Chủ trọ mới',
        ]);
      }
    }

    return res.status(200).json({ message: 'Cập nhật vai trò thành công', userId, role });
  } catch (error) {
    console.error('Error updating user role:', error);
    return res.status(500).json({ message: 'Lỗi khi cập nhật vai trò', error: error.message });
  }
}

/**
 * Xóa người dùng khỏi hệ thống
 */
async function deleteUser(req, res) {
  try {
    const pool = await getPool();
    const userId = Number(req.params.id);

    if (req.user && req.user.id === userId) {
      return res.status(400).json({ message: 'Không thể xóa tài khoản Admin đang đăng nhập' });
    }

    await pool.query('DELETE FROM users WHERE id = ?', [userId]);

    return res.status(200).json({ message: 'Xóa tài khoản thành công', userId });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ message: 'Lỗi khi xóa người dùng', error: error.message });
  }
}

/**
 * Lấy toàn bộ danh sách phòng trọ phục vụ kiểm duyệt
 */
async function getAllRoomsAdmin(req, res) {
  try {
    const pool = await getPool();
    const { search, status, isPublished, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT 
        r.id,
        r.title,
        r.price,
        r.area,
        r.floor,
        r.room_type,
        r.status,
        r.is_published,
        r.created_at,
        bh.name AS house_name,
        bh.address AS house_address,
        bh.city AS house_city,
        bh.district AS house_district,
        u.full_name AS landlord_name,
        u.email AS landlord_email,
        u.phone AS landlord_phone,
        (SELECT image_url FROM room_images WHERE room_id = r.id ORDER BY is_primary DESC, id ASC LIMIT 1) AS primary_image
      FROM rooms r
      JOIN boarding_houses bh ON r.boarding_house_id = bh.id
      JOIN landlords l ON bh.landlord_id = l.id
      JOIN users u ON l.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND (r.title LIKE ? OR bh.name LIKE ? OR u.full_name LIKE ? OR u.phone LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    if (status && status !== 'all') {
      query += ` AND r.status = ?`;
      params.push(status);
    }

    if (isPublished !== undefined && isPublished !== 'all') {
      query += ` AND r.is_published = ?`;
      params.push(isPublished === 'true' || isPublished === '1' ? 1 : 0);
    }

    query += ` ORDER BY r.id DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const [rooms] = await pool.query(query, params);

    return res.status(200).json({ rooms });
  } catch (error) {
    console.error('Error fetching admin rooms:', error);
    return res.status(500).json({ message: 'Không thể lấy danh sách phòng', error: error.message });
  }
}

/**
 * Kiểm duyệt / Bật tắt trạng thái hiển thị của phòng trọ
 */
async function toggleRoomPublishAdmin(req, res) {
  try {
    const pool = await getPool();
    const roomId = Number(req.params.id);

    const [rooms] = await pool.query('SELECT id, is_published FROM rooms WHERE id = ?', [roomId]);
    if (rooms.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy phòng trọ' });
    }

    const currentStatus = Boolean(rooms[0].is_published);
    const nextStatus = !currentStatus;

    await pool.query('UPDATE rooms SET is_published = ? WHERE id = ?', [nextStatus ? 1 : 0, roomId]);

    return res.status(200).json({
      message: nextStatus ? 'Đã duyệt và hiển thị bài đăng' : 'Đã ẩn bài đăng khỏi website',
      roomId,
      isPublished: nextStatus,
    });
  } catch (error) {
    console.error('Error toggling room publish:', error);
    return res.status(500).json({ message: 'Lỗi khi cập nhật trạng thái bài đăng', error: error.message });
  }
}

/**
 * Xóa phòng trọ (Admin cưỡng chế xóa khi vi phạm)
 */
async function deleteRoomAdmin(req, res) {
  try {
    const pool = await getPool();
    const roomId = Number(req.params.id);

    await pool.query('DELETE FROM rooms WHERE id = ?', [roomId]);

    return res.status(200).json({ message: 'Đã xóa bài đăng phòng trọ thành công', roomId });
  } catch (error) {
    console.error('Error deleting room by admin:', error);
    return res.status(500).json({ message: 'Lỗi khi xóa bài đăng phòng trọ', error: error.message });
  }
}

/**
 * Lấy danh sách toàn bộ hóa đơn toàn hệ thống
 */
async function getAllBillsAdmin(req, res) {
  try {
    const pool = await getPool();
    const { status, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT 
        b.id,
        b.bill_number,
        b.month,
        b.total_amount,
        b.status,
        b.payment_method,
        b.created_at,
        r.title AS room_title,
        bh.name AS house_name,
        t.full_name AS tenant_name,
        t.phone AS tenant_phone,
        u.full_name AS landlord_name
      FROM utility_bills b
      JOIN rooms r ON b.room_id = r.id
      JOIN boarding_houses bh ON r.boarding_house_id = bh.id
      JOIN landlords l ON bh.landlord_id = l.id
      JOIN users u ON l.user_id = u.id
      LEFT JOIN tenants t ON b.tenant_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      query += ` AND b.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY b.id DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const [bills] = await pool.query(query, params);

    return res.status(200).json({ bills });
  } catch (error) {
    console.error('Error fetching bills for admin:', error);
    return res.status(500).json({ message: 'Không thể lấy danh sách hóa đơn', error: error.message });
  }
}

module.exports = {
  getAdminStats,
  getAllUsers,
  updateUserRole,
  deleteUser,
  getAllRoomsAdmin,
  toggleRoomPublishAdmin,
  deleteRoomAdmin,
  getAllBillsAdmin,
};
