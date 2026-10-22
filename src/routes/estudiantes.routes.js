const r = require('express').Router();
const pool = require('../db');
const { h, err, requerir, t } = require('../util');
const { crearCuenta } = require('../cuentas');
const { ficha } = require('../servicios');

// Lista: el estado de la cuenta se deduce de la tabla usuario
//   sin fila en usuario -> pendiente | activo=1 -> activo | activo=0 -> inactivo
r.get('/', h(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT e.id_estudiante, e.documento, e.nombres, e.apellidos, e.fecha_nacimiento, e.estado,
            s.nombre AS salon, u.correo AS correo_cuenta,
            CASE WHEN u.id_usuario IS NULL THEN 'pendiente' WHEN u.activo = 1 THEN 'activo' ELSE 'inactivo' END AS cuenta
     FROM estudiante e
     LEFT JOIN salon_estudiante se ON se.id_estudiante = e.id_estudiante AND se.estado = 'activo'
     LEFT JOIN salon s ON s.id_salon = se.id_salon
     LEFT JOIN usuario u ON u.id_estudiante = e.id_estudiante
     ORDER BY e.apellidos, e.nombres`);
  res.json(rows);
}));

r.get('/:id', h(async (req, res) => {
  const [[e]] = await pool.query(
    `SELECT e.*, a.documento AS ac_documento, a.nombres AS ac_nombres, a.apellidos AS ac_apellidos,
            a.telefono AS ac_telefono, a.correo AS ac_correo
     FROM estudiante e JOIN acudiente a ON a.id_acudiente = e.id_acudiente
     WHERE e.id_estudiante = ?`, [req.params.id]);
  if (!e) throw err(404, 'Estudiante no encontrado');
  res.json(e);
}));

r.get('/:id/ficha', h(async (req, res) => res.json(await ficha(req.params.id))));

// REGISTRAR estudiante: acudiente + estudiante + salón en una sola transacción
r.post('/', h(async (req, res) => {
  const b = req.body;
  requerir(b, 'documento', 'nombres', 'apellidos', 'fecha_nacimiento', 'id_salon',
    'ac_documento', 'ac_nombres', 'ac_apellidos');

  const id = await pool.tx(async c => {
    // Si el acudiente ya existe (mismo documento) se reutiliza
    const [[ac]] = await c.query('SELECT id_acudiente FROM acudiente WHERE documento = ?', [t(b.ac_documento)]);
    const idAc = ac ? ac.id_acudiente : (await c.query(
      'INSERT INTO acudiente (documento, nombres, apellidos, telefono, correo) VALUES (?,?,?,?,?)',
      [t(b.ac_documento), t(b.ac_nombres), t(b.ac_apellidos), t(b.ac_telefono), t(b.ac_correo)]))[0].insertId;

    const [e] = await c.query(
      `INSERT INTO estudiante (id_acudiente, documento, nombres, apellidos, fecha_nacimiento, direccion, telefono)
       VALUES (?,?,?,?,?,?,?)`,
      [idAc, t(b.documento), t(b.nombres), t(b.apellidos), b.fecha_nacimiento, t(b.direccion), t(b.telefono)]);

    // El trigger trg_validar_salon_estudiante valida el cupo
    await c.query('INSERT INTO salon_estudiante (id_salon, id_estudiante) VALUES (?, ?)', [b.id_salon, e.insertId]);
    return e.insertId;
  });
  res.status(201).json({ id });
}));

r.put('/:id', h(async (req, res) => {
  const b = req.body, id = req.params.id;
  requerir(b, 'documento', 'nombres', 'apellidos', 'fecha_nacimiento', 'ac_nombres', 'ac_apellidos');
  const estado = ['activo', 'inactivo', 'retirado', 'graduado'].includes(b.estado) ? b.estado : 'activo';

  await pool.tx(async c => {
    const [[e]] = await c.query('SELECT id_acudiente FROM estudiante WHERE id_estudiante = ?', [id]);
    if (!e) throw err(404, 'Estudiante no encontrado');
    await c.query(
      `UPDATE estudiante SET documento=?, nombres=?, apellidos=?, fecha_nacimiento=?, direccion=?, telefono=?, estado=?
       WHERE id_estudiante=?`,
      [t(b.documento), t(b.nombres), t(b.apellidos), b.fecha_nacimiento, t(b.direccion), t(b.telefono), estado, id]);
    await c.query('UPDATE acudiente SET nombres=?, apellidos=?, telefono=?, correo=? WHERE id_acudiente=?',
      [t(b.ac_nombres), t(b.ac_apellidos), t(b.ac_telefono), t(b.ac_correo), e.id_acudiente]);
    // Solo un estudiante "activo" puede tener la cuenta activa
    await c.query('UPDATE usuario SET activo = ? WHERE id_estudiante = ?', [estado === 'activo' ? 1 : 0, id]);
  });
  res.json({ ok: true });
}));

// Activar / desactivar (cambia el estado del estudiante y de su cuenta, si la tiene)
r.patch('/:id/estado', h(async (req, res) => {
  const estado = req.body.estado === 'activo' ? 'activo' : 'inactivo';
  await pool.tx(async c => {
    await c.query('UPDATE estudiante SET estado = ? WHERE id_estudiante = ?', [estado, req.params.id]);
    await c.query('UPDATE usuario SET activo = ? WHERE id_estudiante = ?', [estado === 'activo' ? 1 : 0, req.params.id]);
  });
  res.json({ ok: true });
}));

// Crear la cuenta de acceso (solo el administrador puede hacerlo)
r.post('/:id/cuenta', h(async (req, res) => {
  requerir(req.body, 'correo', 'password');
  const [[e]] = await pool.query('SELECT id_estudiante FROM estudiante WHERE id_estudiante = ?', [req.params.id]);
  if (!e) throw err(404, 'Estudiante no encontrado');
  await crearCuenta({ correo: t(req.body.correo), password: req.body.password, rol: 'estudiante', id: e.id_estudiante });
  res.status(201).json({ ok: true });
}));

module.exports = r;
