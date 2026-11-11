const { getPool } = require('../config/database');
const { sendApprovalEmail, sendRejectionEmail } = require('../services/emailService');
const { moderatePost } = require('../services/aiModeratorService');
const { findPostById, updatePost } = require('../models/postModel');
const { createNotification, getLandlordUserIdByPostId } = require('../models/notificationModel');

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
        SUM(CASE WHEN role = 'poster' THEN 1 ELSE 0 END) AS total_posters,
        SUM(CASE WHEN role = 'tenant' THEN 1 ELSE 0 END) AS total_tenants,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) AS total_admins,
        SUM(CASE WHEN role = 'visitor' THEN 1 ELSE 0 END) AS total_visitors,
        SUM(CASE WHEN approval_status = 'pending' THEN 1 ELSE 0 END) AS pending_approvals
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
 * Lấy danh sách tất cả người dùng kèm bộ lọc vai trò và trạng thái duyệt
 */
async function getAllUsers(req, res) {
  try {
    const pool = await getPool();
    const { search, role, approvalStatus, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT 
        u.id, 
        u.full_name, 
        u.email, 
        u.phone, 
        u.role, 
        u.property_name,
        u.property_address,
        u.property_image,
        u.approval_status,
        u.approved_at,
        u.rejection_reason,
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

    if (approvalStatus && approvalStatus !== 'all') {
      query += ` AND u.approval_status = ?`;
      params.push(approvalStatus);
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
 * Lấy danh sách các tài khoản đang chờ Admin phê duyệt (approval_status = 'pending')
 */
async function getPendingUsers(req, res) {
  try {
    const pool = await getPool();
    const [users] = await pool.query(`
      SELECT 
        id, 
        full_name, 
        email, 
        phone, 
        role, 
        property_name,
        property_address,
        property_image,
        approval_status, 
        created_at 
      FROM users 
      WHERE approval_status = 'pending' 
      ORDER BY id DESC
    `);

    return res.status(200).json({ users });
  } catch (error) {
    console.error('Error fetching pending users:', error);
    return res.status(500).json({ message: 'Không thể lấy danh sách tài khoản chờ duyệt', error: error.message });
  }
}

/**
 * Phê duyệt hoặc từ chối tài khoản và tự động gửi email thông báo
 */
async function updateUserApproval(req, res) {
  try {
    const pool = await getPool();
    const userId = Number(req.params.id);
    const { status, reason } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Trạng thái phê duyệt không hợp lệ (approved hoặc rejected)' });
    }

    const [userRows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (userRows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }
    const targetUser = userRows[0];

    const approvedAt = status === 'approved' ? new Date() : null;
    await pool.query(
      'UPDATE users SET approval_status = ?, approved_at = ?, rejection_reason = ? WHERE id = ?',
      [status, approvedAt, reason || null, userId]
    );

    // Nếu phê duyệt chủ trọ, đảm bảo bản ghi landlords và default boarding_house tồn tại với thông tin nhà trọ
    if (status === 'approved' && targetUser.role === 'landlord') {
      try {
        const houseName = targetUser.property_name || `Nhà trọ ${targetUser.full_name}`;
        const houseAddress = targetUser.property_address || 'TP. Đà Nẵng';
        const houseImage = targetUser.property_image || null;

        const [existingLandlord] = await pool.query('SELECT id FROM landlords WHERE user_id = ?', [userId]);
        if (existingLandlord.length === 0) {
          const [lResult] = await pool.query(
            'INSERT INTO landlords (user_id, company_name, address) VALUES (?, ?, ?)',
            [userId, houseName, houseAddress]
          );
          await pool.query(
            'INSERT INTO boarding_houses (landlord_id, name, address, image_url, city, district) VALUES (?, ?, ?, ?, ?, ?)',
            [lResult.insertId, houseName, houseAddress, houseImage, 'Đà Nẵng', 'Liên Chiểu']
          );
        } else {
          // Cập nhật tên và địa chỉ nếu chủ trọ đã cung cấp thông tin
          await pool.query(
            'UPDATE landlords SET company_name = ?, address = ? WHERE id = ?',
            [houseName, houseAddress, existingLandlord[0].id]
          );
          await pool.query(
            'UPDATE boarding_houses SET name = ?, address = ?, image_url = COALESCE(?, image_url) WHERE landlord_id = ?',
            [houseName, houseAddress, houseImage, existingLandlord[0].id]
          );
        }
      } catch (lErr) {
        console.warn('Auto sync landlord profile note:', lErr.message);
      }
    }

    // Gửi email thông báo tự động cho người dùng
    let emailResult = { success: true };
    if (status === 'approved') {
      emailResult = await sendApprovalEmail({
        toEmail: targetUser.email,
        fullName: targetUser.full_name,
        role: targetUser.role,
      });
    } else {
      emailResult = await sendRejectionEmail({
        toEmail: targetUser.email,
        fullName: targetUser.full_name,
        reason: reason || 'Thông tin đăng ký chưa hợp lệ theo quy chế hệ thống',
      });
    }

    return res.status(200).json({
      message: `Đã ${status === 'approved' ? 'phê duyệt' : 'từ chối'} tài khoản thành công!`,
      userId,
      status,
      emailSent: emailResult.success,
      emailMode: emailResult.mode,
      emailError: emailResult.error || null,
    });
  } catch (error) {
    console.error('Error updating user approval:', error);
    return res.status(500).json({ message: 'Lỗi khi cập nhật trạng thái phê duyệt', error: error.message });
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

    const validRoles = ['admin', 'landlord', 'poster', 'tenant', 'visitor'];
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
 * Lấy toàn bộ danh sách phòng trọ & bài đăng phục vụ kiểm duyệt AI
 */
async function getAllRoomsAdmin(req, res) {
  try {
    const pool = await getPool();
    const { search, status, isPublished, aiReviewStatus, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT 
        p.id,
        p.title,
        p.price,
        p.area,
        1 AS floor,
        p.room_type,
        p.status,
        (CASE WHEN p.status = 'active' THEN 1 ELSE 0 END) AS is_published,
        p.created_at,
        COALESCE(bh.name, 'Nhà trọ') AS house_name,
        p.address AS house_address,
        p.city AS house_city,
        p.district AS house_district,
        COALESCE(p.contact_name, u.full_name, 'Chủ trọ') AS landlord_name,
        u.email AS landlord_email,
        COALESCE(p.contact_phone, u.phone) AS landlord_phone,
        (SELECT image_url FROM post_images WHERE post_id = p.id ORDER BY is_primary DESC, id ASC LIMIT 1) AS primary_image,
        COALESCE(p.ai_risk_score, 0) AS ai_risk_score,
        COALESCE(p.ai_review_status, 'approved') AS ai_review_status,
        p.ai_flags,
        p.ai_summary
      FROM posts p
      LEFT JOIN boarding_houses bh ON p.boarding_house_id = bh.id
      LEFT JOIN landlords l ON p.landlord_id = l.id
      LEFT JOIN users u ON l.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND (p.title LIKE ? OR p.address LIKE ? OR u.full_name LIKE ? OR p.contact_name LIKE ? OR p.contact_phone LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }

    if (status && status !== 'all') {
      query += ` AND p.status = ?`;
      params.push(status);
    }

    if (aiReviewStatus && aiReviewStatus !== 'all') {
      query += ` AND p.ai_review_status = ?`;
      params.push(aiReviewStatus);
    }

    if (isPublished !== undefined && isPublished !== 'all') {
      if (isPublished === 'true' || isPublished === '1') {
        query += ` AND p.status = 'active'`;
      } else {
        query += ` AND p.status != 'active'`;
      }
    }

    query += ` ORDER BY p.id DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const [rawRooms] = await pool.query(query, params);

    const rooms = rawRooms.map((r) => {
      let parsedFlags = [];
      if (r.ai_flags) {
        try {
          parsedFlags = typeof r.ai_flags === 'string'
            ? (r.ai_flags.startsWith('[') ? JSON.parse(r.ai_flags) : [r.ai_flags])
            : r.ai_flags;
        } catch (e) {
          parsedFlags = [r.ai_flags];
        }
      }
      return {
        ...r,
        ai_flags: parsedFlags,
      };
    });

    return res.status(200).json({ rooms });
  } catch (error) {
    console.error('Error fetching admin rooms:', error);
    return res.status(500).json({ message: 'Không thể lấy danh sách phòng', error: error.message });
  }
}

/**
 * Kiểm duyệt / Bật tắt trạng thái hiển thị của bài đăng
 */
async function toggleRoomPublishAdmin(req, res) {
  try {
    const pool = await getPool();
    const roomId = Number(req.params.id);

    const [posts] = await pool.query('SELECT id, status FROM posts WHERE id = ?', [roomId]);
    if (posts.length > 0) {
      const nextStatus = posts[0].status === 'active' ? 'pending' : 'active';
      await pool.query('UPDATE posts SET status = ? WHERE id = ?', [nextStatus, roomId]);
      return res.status(200).json({
        message: nextStatus === 'active' ? 'Đã duyệt và hiển thị bài đăng' : 'Đã ẩn bài đăng khỏi website',
        roomId,
        isPublished: nextStatus === 'active',
        status: nextStatus,
      });
    }

    // Fallback nếu bài đăng nằm ở bảng rooms
    const [rooms] = await pool.query('SELECT id, is_published FROM rooms WHERE id = ?', [roomId]);
    if (rooms.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy bài đăng phòng trọ' });
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
 * Admin duyệt bài đăng (Approve Post)
 */
async function approvePostAdmin(req, res) {
  try {
    const pool = await getPool();
    const roomId = Number(req.params.id);

    await pool.query(
      "UPDATE posts SET status = 'active', ai_review_status = 'approved' WHERE id = ?",
      [roomId]
    );

    // Gửi thông báo đến chủ sở hữu bài đăng
    try {
      const ownerInfo = await getLandlordUserIdByPostId(roomId);
      if (ownerInfo?.userId) {
        await createNotification({
          userId: ownerInfo.userId,
          title: 'Bài đăng đã được duyệt',
          message: `Bài đăng "${ownerInfo.postTitle}" đã được Quản trị viên phê duyệt và xuất bản công khai trên website.`,
          type: 'approved',
          link: `/rooms/${roomId}`,
        });
      }
    } catch (notifErr) {
      console.warn('Lỗi gửi thông báo duyệt bài:', notifErr.message);
    }

    return res.status(200).json({ message: 'Đã phê duyệt và xuất bản bài đăng thành công!', roomId });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi khi phê duyệt bài đăng', error: error.message });
  }
}

/**
 * Admin từ chối bài đăng (Reject Post)
 */
async function rejectPostAdmin(req, res) {
  try {
    const pool = await getPool();
    const roomId = Number(req.params.id);
    const { reason } = req.body || {};

    let aiSummary = reason || 'Admin từ chối bài đăng do vi phạm quy định sàn.';

    await pool.query(
      "UPDATE posts SET status = 'rejected', ai_review_status = 'rejected', ai_summary = ? WHERE id = ?",
      [aiSummary, roomId]
    );

    // Gửi thông báo đến chủ sở hữu bài đăng
    try {
      const ownerInfo = await getLandlordUserIdByPostId(roomId);
      if (ownerInfo?.userId) {
        await createNotification({
          userId: ownerInfo.userId,
          title: 'Bài đăng bị từ chối phê duyệt',
          message: `Bài đăng "${ownerInfo.postTitle}" đã bị từ chối phê duyệt. Lý do: ${aiSummary}`,
          type: 'rejected',
          link: null,
        });
      }
    } catch (notifErr) {
      console.warn('Lỗi gửi thông báo từ chối bài:', notifErr.message);
    }

    return res.status(200).json({ message: 'Đã từ chối bài đăng vi phạm', roomId });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi khi từ chối bài đăng', error: error.message });
  }
}

/**
 * Admin yêu cầu AI quét kiểm duyệt lại bài đăng
 */
async function recheckPostAIAdmin(req, res) {
  try {
    const roomId = Number(req.params.id);
    const post = await findPostById(roomId);
    if (!post) {
      return res.status(404).json({ message: 'Không tìm thấy bài đăng' });
    }

    const moderation = await moderatePost({
      id: roomId,
      landlordId: post.landlordId || 1,
      title: post.title,
      description: post.description,
      price: post.price,
      area: post.area,
      roomType: post.roomType,
      address: post.address,
      city: post.city,
      district: post.district,
      images: post.images,
    });

    const updatedPost = await updatePost(roomId, {
      aiRiskScore: moderation.riskScore,
      aiReviewStatus: moderation.reviewStatus,
      aiFlags: moderation.flags,
      aiSummary: moderation.summary,
      status: moderation.postStatus,
    });

    return res.status(200).json({
      message: 'Đã hoàn tất quét AI kiểm duyệt lại bài đăng',
      moderation,
      post: updatedPost,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi khi quét lại AI cho bài đăng', error: error.message });
  }
}

/**
 * Xóa phòng trọ (Admin cưỡng chế xóa khi vi phạm)
 */
async function deleteRoomAdmin(req, res) {
  try {
    const pool = await getPool();
    const roomId = Number(req.params.id);

    await pool.query('DELETE FROM posts WHERE id = ?', [roomId]);
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
  getPendingUsers,
  updateUserApproval,
  updateUserRole,
  deleteUser,
  getAllRoomsAdmin,
  toggleRoomPublishAdmin,
  approvePostAdmin,
  rejectPostAdmin,
  recheckPostAIAdmin,
  deleteRoomAdmin,
  getAllBillsAdmin,
};
