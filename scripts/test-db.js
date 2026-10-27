require('dotenv').config();
const pool = require('../src/db');
(async () => {
  try {
    const [[r]] = await pool.query('SELECT DATABASE() AS base, NOW() AS fecha');
    console.log(`Conexion OK. Base: ${r.base} | Servidor: ${r.fecha}`);
  } catch (e) {
    console.error('No se pudo conectar a MySQL:', e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
