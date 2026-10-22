// Pone una contraseña real (hash bcrypt) a los usuarios de ejemplo del SQL.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../src/db');

(async () => {
  const hash = await bcrypt.hash('123456', 10);
  const [r] = await pool.query(
    "UPDATE usuario SET password_hash = ? WHERE password_hash LIKE '%REEMPLAZAR%'", [hash]);
  console.log(`Listo: ${r.affectedRows} usuarios de ejemplo ahora tienen la clave 123456`);
  process.exit(0);
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
