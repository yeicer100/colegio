const r = require('express').Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { firmar, auth } = require('../auth');
const { h, err } = require('../util');

async function nombreDe(u) {
  if (u.rol === 'docente') {
    const [[d]] = await pool.query('SELECT nombres, apellidos FROM docente WHERE id_docente = ?', [u.id_docente]);
    if (d) return `${d.nombres} ${d.apellidos}`;
  }
  if (u.rol === 'estudiante') {
    const [[e]] = await pool.query('SELECT nombres, apellidos FROM estudiante WHERE id_estudiante = ?', [u.id_estudiante]);
    if (e) return `${e.nombres} ${e.apellidos}`;
  }
  return 'Administrador';
}

r.post('/login', h(async (req, res) => {
  const { correo, password } = req.body;
  if (!correo || !password) throw err(400, 'Ingresa tu correo y contraseña');

  const [[u]] = await pool.query('SELECT * FROM usuario WHERE correo = ?', [correo.trim()]);
  const ok = u && await bcrypt.compare(password, u.password_hash).catch(() => false);
  if (!ok) throw err(401, 'Correo o contraseña incorrectos');
  if (!u.activo) throw err(403, 'Tu cuenta está inactiva. Comunícate con la institución.');
  if (!['admin', 'docente', 'estudiante'].includes(u.rol)) throw err(403, 'Este tipo de usuario no tiene panel disponible');

  await pool.query('UPDATE usuario SET ultimo_acceso = NOW() WHERE id_usuario = ?', [u.id_usuario]);
  res.json({ token: firmar(u), usuario: { rol: u.rol, correo: u.correo, nombre: await nombreDe(u) } });
}));

r.get('/me', auth, h(async (req, res) => {
  const [[periodo]] = await pool.query(
    "SELECT id_periodo, nombre FROM periodo_academico WHERE estado = 'en_curso' ORDER BY fecha_inicio DESC LIMIT 1");
  res.json({
    usuario: { rol: req.user.rol, correo: req.user.correo, nombre: await nombreDe(req.user) },
    periodo: periodo || null
  });
}));

module.exports = r;
