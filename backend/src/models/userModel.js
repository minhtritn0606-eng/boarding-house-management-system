const bcrypt = require('bcrypt');
const { getPool } = require('../config/database');

const inMemoryUsers = [];

function toPublicUser(user) {
  const { password, ...safeUser } = user;
  return safeUser;
}

async function ensureUsersTable() {
  try {
    const pool = await getPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'visitor',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    return true;
  } catch (error) {
    return false;
  }
}

async function createUser({ fullName, email, password, role = 'visitor' }) {
  const normalizedEmail = email.toLowerCase();
  const hashedPassword = await bcrypt.hash(password, 10);

  const dbReady = await ensureUsersTable();
  if (dbReady) {
    try {
      const pool = await getPool();
      const [result] = await pool.query(
        'INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)',
        [fullName, normalizedEmail, hashedPassword, role]
      );

      return {
        id: result.insertId,
        fullName,
        email: normalizedEmail,
        role,
        password: hashedPassword,
      };
    } catch (error) {
      // fall back to in-memory store if database insert fails
    }
  }

  const user = {
    id: Date.now(),
    fullName,
    email: normalizedEmail,
    password: hashedPassword,
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
      const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
      if (rows.length > 0) {
        const row = rows[0];
        return {
          id: row.id,
          fullName: row.full_name,
          email: row.email,
          password: row.password,
          role: row.role,
        };
      }
    } catch (error) {
      // fall back to in-memory lookup if database query fails
    }
  }

  return inMemoryUsers.find((user) => user.email === normalizedEmail) || null;
}

module.exports = {
  createUser,
  findUserByEmail,
  toPublicUser,
};
