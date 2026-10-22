// Conexión a MySQL (pool). Todas las consultas del sistema pasan por aquí.
require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'colegio_web',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'colegio',
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,      // las fechas llegan como texto 'YYYY-MM-DD'
  decimalNumbers: true    // los DECIMAL llegan como números
});

// Ejecuta varias consultas como una sola transacción (todo o nada)
async function tx(fn) {
  const c = await pool.getConnection();
  try {
    await c.beginTransaction();
    const r = await fn(c);
    await c.commit();
    return r;
  } catch (e) {
    await c.rollback();
    throw e;
  } finally {
    c.release();
  }
}

pool.tx = tx;
module.exports = pool;
