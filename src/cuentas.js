const bcrypt = require('bcryptjs');
const pool = require('./db');
const { err } = require('./util');

// Solo el administrador llama a esta función. Crea la cuenta ya ACTIVA.
async function crearCuenta({ correo, password, rol, id }) {
  const col = rol === 'docente' ? 'id_docente' : 'id_estudiante';
  const [[ya]] = await pool.query(`SELECT 1 AS x FROM usuario WHERE ${col} = ?`, [id]);
  if (ya) throw err(400, 'Esta persona ya tiene una cuenta');
  if (!password || password.length < 6) throw err(400, 'La contraseña debe tener al menos 6 caracteres');
  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO usuario (correo, password_hash, rol, ${col}, activo) VALUES (?, ?, ?, ?, 1)`,
    [correo, hash, rol, id]);
}

module.exports = { crearCuenta };
