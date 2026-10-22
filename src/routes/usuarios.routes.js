const r = require('express').Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { h, err } = require('../util');

r.get('/', h(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT u.id_usuario, u.correo, u.rol, u.activo, u.ultimo_acceso, (u.id_usuario = ?) AS es_yo,
            COALESCE(CONCAT(d.nombres,' ',d.apellidos), CONCAT(e.nombres,' ',e.apellidos),
                     CONCAT(a.nombres,' ',a.apellidos), 'Administrador') AS persona
     FROM usuario u
     LEFT JOIN docente d ON d.id_docente = u.id_docente
     LEFT JOIN estudiante e ON e.id_estudiante = u.id_estudiante
     LEFT JOIN acudiente a ON a.id_acudiente = u.id_acudiente
     ORDER BY u.rol, u.correo`, [req.user.id_usuario]);
  res.json(rows);
}));

r.patch('/:id/activo', h(async (req, res) => {
  if (Number(req.params.id) === req.user.id_usuario) throw err(400, 'No puedes desactivar tu propia cuenta');
  await pool.query('UPDATE usuario SET activo = ? WHERE id_usuario = ?', [req.body.activo ? 1 : 0, req.params.id]);
  res.json({ ok: true });
}));

r.patch('/:id/password', h(async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) throw err(400, 'La contraseña debe tener al menos 6 caracteres');
  await pool.query('UPDATE usuario SET password_hash = ? WHERE id_usuario = ?',
    [await bcrypt.hash(password, 10), req.params.id]);
  res.json({ ok: true });
}));

module.exports = r;
