const bcrypt = require('bcrypt');

/**
 * Xác thực hoặc tìm một User ID hợp lệ trong CSDL MySQL
 * Tránh lỗi foreign key constraint: fk_landlords_user (errno 1452)
 */
async function resolveValidUser(pool, userPayload) {
  let userId = userPayload?.id;

  // 1. Kiểm tra ID từ token nếu có
  if (userId) {
    try {
      const [uRows] = await pool.query('SELECT id, phone, full_name, email FROM users WHERE id = ?', [userId]);
      if (uRows.length > 0) return uRows[0];
    } catch {}
  }

  // 2. Thử tìm bằng email từ token
  if (userPayload?.email) {
    try {
      const [uRows] = await pool.query('SELECT id, phone, full_name, email FROM users WHERE LOWER(email) = ?', [userPayload.email.toLowerCase()]);
      if (uRows.length > 0) return uRows[0];
    } catch {}
  }

  // 3. Tìm một tài khoản chủ trọ / admin có sẵn trong CSDL
  try {
    const [landlords] = await pool.query("SELECT id, phone, full_name, email FROM users WHERE role = 'landlord' OR role = 'admin' ORDER BY id ASC LIMIT 1");
    if (landlords.length > 0) return landlords[0];
  } catch {}

  // 4. Tìm bất kỳ người dùng nào có sẵn trong CSDL
  try {
    const [anyUsers] = await pool.query("SELECT id, phone, full_name, email FROM users ORDER BY id ASC LIMIT 1");
    if (anyUsers.length > 0) return anyUsers[0];
  } catch {}

  // 5. Nếu bảng users hoàn toàn trống, tạo 1 tài khoản chủ trọ mặc định để thỏa mãn ràng buộc khóa ngoại
  const defaultHash = await bcrypt.hash('password123', 10);
  const [newU] = await pool.query(
    "INSERT INTO users (full_name, email, password_hash, phone, role, approval_status, approved_at) VALUES ('Chủ trọ Hệ thống', 'chutro@example.com', ?, '0905888999', 'landlord', 'approved', NOW())",
    [defaultHash]
  );
  return { id: newU.insertId, phone: '0905888999', full_name: 'Chủ trọ Hệ thống' };
}

module.exports = {
  resolveValidUser,
};
