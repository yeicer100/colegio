const r = require('express').Router();
const pool = require('../db');
const { h, err, requerir, t } = require('../util');
const { crearCuenta } = require('../cuentas');
const { listarCursos } = require('../servicios');

r.get('/', h(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT d.id_docente, d.documento, d.nombres, d.apellidos, d.especialidad, d.telefono, d.correo,
            CASE WHEN u.id_usuario IS NULL THEN 'pendiente' WHEN u.activo = 1 THEN 'activo' ELSE 'inactivo' END AS cuenta
     FROM docente d LEFT JOIN usuario u ON u.id_docente = d.id_docente
     ORDER BY d.apellidos, d.nombres`);
  res.json(rows);
}));

r.get('/:id', h(async (req, res) => {
  const [[d]] = await pool.query('SELECT * FROM docente WHERE id_docente = ?', [req.params.id]);
  if (!d) throw err(404, 'Docente no encontrado');
  res.json(d);
}));

r.get('/:id/cursos', h(async (req, res) =>
  res.json(await listarCursos('WHERE cu.id_docente = ?', [req.params.id]))));

r.post('/', h(async (req, res) => {
  const b = req.body;
  requerir(b, 'documento', 'nombres', 'apellidos', 'correo');
  const [x] = await pool.query(
    'INSERT INTO docente (documento, nombres, apellidos, especialidad, telefono, correo) VALUES (?,?,?,?,?,?)',
    [t(b.documento), t(b.nombres), t(b.apellidos), t(b.especialidad), t(b.telefono), t(b.correo)]);
  res.status(201).json({ id: x.insertId });
}));

r.put('/:id', h(async (req, res) => {
  const b = req.body, id = req.params.id;
  requerir(b, 'documento', 'nombres', 'apellidos', 'correo');
  await pool.tx(async c => {
    await c.query(
      'UPDATE docente SET documento=?, nombres=?, apellidos=?, especialidad=?, telefono=?, correo=? WHERE id_docente=?',
      [t(b.documento), t(b.nombres), t(b.apellidos), t(b.especialidad), t(b.telefono), t(b.correo), id]);
    // el correo del docente es también su usuario de acceso
    await c.query('UPDATE usuario SET correo = ? WHERE id_docente = ?', [t(b.correo), id]);
  });
  res.json({ ok: true });
}));

// Activar / desactivar la cuenta del docente
r.patch('/:id/activo', h(async (req, res) => {
  const [[u]] = await pool.query('SELECT id_usuario FROM usuario WHERE id_docente = ?', [req.params.id]);
  if (!u) throw err(400, 'Este docente aún no tiene cuenta. Créala primero.');
  await pool.query('UPDATE usuario SET activo = ? WHERE id_usuario = ?', [req.body.activo ? 1 : 0, u.id_usuario]);
  res.json({ ok: true });
}));

r.post('/:id/cuenta', h(async (req, res) => {
  const [[d]] = await pool.query('SELECT id_docente, correo FROM docente WHERE id_docente = ?', [req.params.id]);
  if (!d) throw err(404, 'Docente no encontrado');
  if (!d.correo) throw err(400, 'El docente necesita un correo para crear su cuenta');
  await crearCuenta({ correo: d.correo, password: req.body.password, rol: 'docente', id: d.id_docente });
  res.status(201).json({ ok: true });
}));

module.exports = r;
