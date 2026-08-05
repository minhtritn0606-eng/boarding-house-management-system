const mysql = require('mysql2/promise');

let pool = null;

async function getPool() {
  if (!pool) {
    const host = process.env.DB_HOST || 'localhost';
    const user = process.env.DB_USER || 'root';
    const password = process.env.DB_PASSWORD || '';
    const database = process.env.DB_NAME || 'boarding_house_db';
    const port = Number(process.env.DB_PORT || 3306);

    pool = mysql.createPool({
      host,
      user,
      password,
      database,
      port,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }

  return pool;
}

async function testConnection() {
  try {
    const connection = await getPool();
    await connection.query('SELECT 1');

    return {
      connected: true,
      database: process.env.DB_NAME || 'boarding_house_db',
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message,
    };
  }
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  getPool,
  testConnection,
  closePool,
};
