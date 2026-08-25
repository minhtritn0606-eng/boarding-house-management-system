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
        avatar VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    return true;
  } catch (error) {
    return false;
  }
}

async function createUser({ fullName, email, password, phone, role = 'visitor' }) {
  const normalizedEmail = email.toLowerCase();
  const hashedPassword = await bcrypt.hash(password, 10);

  const dbReady = await ensureUsersTable();
  if (dbReady) {
    try {
      const pool = await getPool();
      const [result] = await pool.query(
        'INSERT INTO users (full_name, email, password_hash, phone, role) VALUES (?, ?, ?, ?, ?)',
        [fullName, normalizedEmail, hashedPassword, phone || null, role]
      );

      return {
        id: result.insertId,
        fullName,
        email: normalizedEmail,
        phone,
        role,
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
        };
      }
    } catch (error) {
      console.warn('Database find user failed:', error.message);
    }
  }

  return inMemoryUsers.find((user) => user.email === normalizedEmail) || null;
}

module.exports = {
  createUser,
  findUserByEmail,
  toPublicUser,
};
