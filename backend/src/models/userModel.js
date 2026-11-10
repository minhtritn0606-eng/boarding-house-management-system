const bcrypt = require('bcrypt');
const { getPool } = require('../config/database');

const inMemoryUsers = [];

function toPublicUser(user) {
  const { password, password_hash, ...safeUser } = user;
  return safeUser;
}

async function ensureUsersTable() {
  try {
    const pool = await getPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NULL,
        password VARCHAR(255) NULL,
        phone VARCHAR(50) NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'visitor',
        approval_status VARCHAR(50) NOT NULL DEFAULT 'pending',
        approved_at TIMESTAMP NULL DEFAULT NULL,
        rejection_reason VARCHAR(255) NULL DEFAULT NULL,
        avatar VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Tự động kiểm tra và bổ sung cột approval_status nếu bảng users đã tồn tại từ trước
    try {
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN approval_status VARCHAR(50) NOT NULL DEFAULT 'pending' AFTER role
      `);
    } catch (colErr) {
      // Bỏ qua nếu cột đã tồn tại
    }

    try {
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN approved_at TIMESTAMP NULL DEFAULT NULL AFTER approval_status
      `);
    } catch (colErr) {}

    try {
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN rejection_reason VARCHAR(255) NULL DEFAULT NULL AFTER approved_at
      `);
    } catch (colErr) {}

    try {
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN property_name VARCHAR(150) NULL DEFAULT NULL AFTER role
      `);
    } catch (colErr) {}

    try {
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN property_address VARCHAR(255) NULL DEFAULT NULL AFTER property_name
      `);
    } catch (colErr) {}

    try {
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN property_image LONGTEXT NULL DEFAULT NULL AFTER property_address
      `);
    } catch (colErr) {}

    return true;
  } catch (error) {
    return false;
  }
}

async function createUser({ fullName, email, password, phone, role = 'visitor', approvalStatus = null, propertyName = null, propertyAddress = null, propertyImage = null }) {
  const normalizedEmail = email.toLowerCase();
  const hashedPassword = await bcrypt.hash(password, 10);

  // Mặc định tài khoản admin được duyệt ngay, còn landlord/poster chờ duyệt
  const status = approvalStatus || (role === 'admin' ? 'approved' : 'pending');
  const approvedAt = status === 'approved' ? new Date() : null;

  const dbReady = await ensureUsersTable();
  if (dbReady) {
    try {
      const pool = await getPool();
      const [result] = await pool.query(
        'INSERT INTO users (full_name, email, password_hash, phone, role, property_name, property_address, property_image, approval_status, approved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [fullName, normalizedEmail, hashedPassword, phone || null, role, propertyName || null, propertyAddress || null, propertyImage || null, status, approvedAt]
      );

      return {
        id: result.insertId,
        fullName,
        email: normalizedEmail,
        phone,
        role,
        propertyName,
        propertyAddress,
        propertyImage,
        approval_status: status,
        approved_at: approvedAt,
        password: hashedPassword,
        password_hash: hashedPassword,
      };
    } catch (error) {
      console.warn('Database insert user failed, using in-memory store:', error.message);
    }
  }

  const user = {
    id: Date.now(),
    fullName,
    email: normalizedEmail,
    phone,
    password: hashedPassword,
    password_hash: hashedPassword,
    role,
    propertyName,
    propertyAddress,
    propertyImage,
    approval_status: status,
    approved_at: approvedAt,
    rejection_reason: null,
  };

  inMemoryUsers.push(user);
  return user;
}

async function findUserByEmail(email) {
  const normalizedEmail = email.toLowerCase();

  const dbReady = await ensureUsersTable();
  if (dbReady) {
    try {
      const pool = await getPool();
      const [rows] = await pool.query('SELECT * FROM users WHERE LOWER(email) = ?', [normalizedEmail]);
      if (rows.length > 0) {
        const row = rows[0];
        return {
          id: row.id,
          fullName: row.full_name,
          email: row.email,
          phone: row.phone,
          password: row.password_hash || row.password,
          password_hash: row.password_hash || row.password,
          role: row.role,
          propertyName: row.property_name,
          propertyAddress: row.property_address,
          propertyImage: row.property_image,
          // Mặc định các tài khoản admin hoặc tài khoản cũ chưa có status coi như approved
          approval_status: row.approval_status || (row.role === 'admin' ? 'approved' : 'approved'),
          approved_at: row.approved_at,
          rejection_reason: row.rejection_reason,
        };
      }
    } catch (error) {
      console.warn('Database find user failed:', error.message);
    }
  }

  return inMemoryUsers.find((user) => user.email === normalizedEmail) || null;
}

async function findUserById(id) {
  const dbReady = await ensureUsersTable();
  if (dbReady) {
    try {
      const pool = await getPool();
      const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
      if (rows.length > 0) {
        const row = rows[0];
        return {
          id: row.id,
          fullName: row.full_name,
          email: row.email,
          phone: row.phone,
          role: row.role,
          propertyName: row.property_name,
          propertyAddress: row.property_address,
          propertyImage: row.property_image,
          approval_status: row.approval_status || 'approved',
          approved_at: row.approved_at,
          rejection_reason: row.rejection_reason,
        };
      }
    } catch (error) {
      console.warn('Database find user by ID failed:', error.message);
    }
  }

  return inMemoryUsers.find((user) => String(user.id) === String(id)) || null;
}

async function updateUserApprovalStatus(userId, status, reason = null) {
  const dbReady = await ensureUsersTable();
  if (dbReady) {
    try {
      const pool = await getPool();
      const approvedAt = status === 'approved' ? new Date() : null;
      await pool.query(
        'UPDATE users SET approval_status = ?, approved_at = ?, rejection_reason = ? WHERE id = ?',
        [status, approvedAt, reason || null, userId]
      );
      return true;
    } catch (error) {
      console.warn('Database update approval status failed:', error.message);
    }
  }

  const memUser = inMemoryUsers.find((u) => String(u.id) === String(userId));
  if (memUser) {
    memUser.approval_status = status;
    memUser.approved_at = status === 'approved' ? new Date() : null;
    memUser.rejection_reason = reason;
    return true;
  }
  return false;
}

async function getPendingUsers() {
  const dbReady = await ensureUsersTable();
  if (dbReady) {
    try {
      const pool = await getPool();
      const [rows] = await pool.query(
        `SELECT id, full_name, email, phone, role, property_name, property_address, property_image, approval_status, created_at 
         FROM users 
         WHERE approval_status = 'pending' 
         ORDER BY id DESC`
      );
      return rows;
    } catch (error) {
      console.warn('Database get pending users failed:', error.message);
    }
  }

  return inMemoryUsers.filter((u) => u.approval_status === 'pending');
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  updateUserApprovalStatus,
  getPendingUsers,
  toPublicUser,
};
