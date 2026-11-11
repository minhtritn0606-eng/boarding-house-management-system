const { getPool } = require('../config/database');

/**
 * Đảm bảo bảng notifications tồn tại và có các cột cần thiết
 */
async function ensureNotificationsTable() {
  const pool = await getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT NOT NULL,
      title VARCHAR(150) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(50) DEFAULT 'system',
      link VARCHAR(255) DEFAULT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_notifications_user_read (user_id, is_read)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  try {
    await pool.query(`ALTER TABLE notifications ADD COLUMN type VARCHAR(50) DEFAULT 'system'`);
  } catch (e) {
    // Column already exists
  }

  try {
    await pool.query(`ALTER TABLE notifications ADD COLUMN link VARCHAR(255) DEFAULT NULL`);
  } catch (e) {
    // Column already exists
  }
}

/**
 * Thêm một thông báo mới cho người dùng
 */
async function createNotification({ userId, title, message, type = 'system', link = null }) {
  if (!userId || !title || !message) return null;
  try {
    await ensureNotificationsTable();
    const pool = await getPool();
    const [res] = await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, link, is_read) VALUES (?, ?, ?, ?, ?, FALSE)`,
      [userId, title, message, type, link]
    );
    return res.insertId;
  } catch (error) {
    console.error('Lỗi khi tạo thông báo:', error.message);
    return null;
  }
}

/**
 * Lấy danh sách thông báo của người dùng
 */
async function getUserNotifications(userId, limit = 30) {
  await ensureNotificationsTable();
  const pool = await getPool();
  const [rows] = await pool.query(
    `SELECT id, user_id, title, message, type, link, is_read, created_at 
     FROM notifications 
     WHERE user_id = ? 
     ORDER BY created_at DESC 
     LIMIT ?`,
    [userId, Number(limit)]
  );
  return rows;
}

/**
 * Đánh dấu một thông báo đã đọc
 */
async function markNotificationAsRead(id, userId) {
  await ensureNotificationsTable();
  const pool = await getPool();
  await pool.query(
    `UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?`,
    [id, userId]
  );
}

/**
 * Đánh dấu tất cả thông báo của người dùng là đã đọc
 */
async function markAllNotificationsAsRead(userId) {
  await ensureNotificationsTable();
  const pool = await getPool();
  await pool.query(
    `UPDATE notifications SET is_read = TRUE WHERE user_id = ?`,
    [userId]
  );
}

/**
 * Đếm số lượng thông báo chưa đọc
 */
async function getUnreadCount(userId) {
  await ensureNotificationsTable();
  const pool = await getPool();
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = FALSE`,
    [userId]
  );
  return rows[0]?.count || 0;
}

/**
 * Tìm user_id của chủ sở hữu bài đăng
 */
async function getLandlordUserIdByPostId(postId) {
  const pool = await getPool();
  const [rows] = await pool.query(
    `SELECT l.user_id, p.title 
     FROM posts p 
     JOIN landlords l ON p.landlord_id = l.id 
     WHERE p.id = ?`,
    [postId]
  );
  if (rows.length > 0) {
    return { userId: rows[0].user_id, postTitle: rows[0].title };
  }
  return null;
}

module.exports = {
  ensureNotificationsTable,
  createNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadCount,
  getLandlordUserIdByPostId,
};
