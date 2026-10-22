// Calificaciones y asistencias: las usan el administrador y el docente.
// El docente SOLO puede trabajar con sus propios cursos.
const r = require('express').Router();
const pool = require('../db');
const { h, err, requerir } = require('../util');
const { listarCursos } = require('../servicios');

async function permitirCurso(user, idCurso) {
  const [[c]] = await pool.query('SELECT id_docente FROM curso WHERE id_curso = ?', [idCurso]);
  if (!c) throw err(404, 'Curso no encontrado');
  if (user.rol === 'docente' && c.id_docente !== user.id_docente) throw err(403, 'Este curso no está asignado a ti');
}

// Cursos disponibles: todos (admin) o los del docente
r.get('/cursos', h(async (req, res) => {
  res.json(req.user.rol === 'admin'
    ? await listarCursos()
    : await listarCursos('WHERE cu.id_docente = ?', [req.user.id_docente]));
}));

// ---------- CALIFICACIONES ----------
r.get('/cursos/:id/notas', h(async (req, res) => {
  const id = req.params.id;
  await permitirCurso(req.user, id);
  const [est] = await pool.query(
    `SELECT m.id_matricula, e.id_estudiante, e.nombres, e.apellidos
     FROM matricula m JOIN estudiante e ON e.id_estudiante = m.id_estudiante
     WHERE m.id_curso = ? AND m.estado = 'activa' ORDER BY e.apellidos, e.nombres`, [id]);
  const [notas] = await pool.query(
    `SELECT c.id_nota, c.id_matricula, c.descripcion_evaluacion, c.porcentaje, c.calificacion, c.fecha
     FROM calificacion c JOIN matricula m ON m.id_matricula = c.id_matricula
     WHERE m.id_curso = ? ORDER BY c.fecha, c.id_nota`, [id]);
  // La nota definitiva ponderada la calcula la vista vista_boletin
  const [bol] = await pool.query(
    'SELECT id_estudiante, porcentaje_evaluado, nota_definitiva FROM vista_boletin WHERE id_curso = ?', [id]);

  res.json(est.map(e => ({
    ...e,
    notas: notas.filter(n => n.id_matricula === e.id_matricula),
    ...(bol.find(b => b.id_estudiante === e.id_estudiante) || { porcentaje_evaluado: 0, nota_definitiva: null })
  })));
}));

function validarNota(b) {
  requerir(b, 'descripcion_evaluacion', 'porcentaje', 'calificacion', 'fecha');
  if (b.porcentaje <= 0 || b.porcentaje > 100) throw err(400, 'El porcentaje debe estar entre 1 y 100');
  if (b.calificacion < 0 || b.calificacion > 5) throw err(400, 'La calificación debe estar entre 0.0 y 5.0');
}

r.post('/notas', h(async (req, res) => {
  const b = req.body;
  requerir(b, 'id_matricula');
  validarNota(b);
  const [[m]] = await pool.query('SELECT id_curso FROM matricula WHERE id_matricula = ?', [b.id_matricula]);
  if (!m) throw err(404, 'Matrícula no encontrada');
  await permitirCurso(req.user, m.id_curso);
  // Procedimiento transaccional: valida que los porcentajes no pasen de 100
  await pool.query('CALL sp_registrar_calificacion_tx(?,?,?,?,?)',
    [b.id_matricula, b.descripcion_evaluacion.trim(), b.porcentaje, b.calificacion, b.fecha]);
  res.status(201).json({ ok: true });
}));

async function notaDe(id) {
  const [[n]] = await pool.query(
    `SELECT c.id_matricula, m.id_curso FROM calificacion c JOIN matricula m ON m.id_matricula = c.id_matricula
     WHERE c.id_nota = ?`, [id]);
  if (!n) throw err(404, 'Nota no encontrada');
  return n;
}

r.put('/notas/:id', h(async (req, res) => {
  const b = req.body, id = req.params.id;
  validarNota(b);
  const n = await notaDe(id);
  await permitirCurso(req.user, n.id_curso);
  const [[s]] = await pool.query(
    'SELECT COALESCE(SUM(porcentaje),0) AS suma FROM calificacion WHERE id_matricula = ? AND id_nota <> ?',
    [n.id_matricula, id]);
  if (s.suma + Number(b.porcentaje) > 100) throw err(400, 'La suma de porcentajes supera el 100% para esta matricula');
  await pool.query(
    'UPDATE calificacion SET descripcion_evaluacion=?, porcentaje=?, calificacion=?, fecha=? WHERE id_nota=?',
    [b.descripcion_evaluacion.trim(), b.porcentaje, b.calificacion, b.fecha, id]);
  res.json({ ok: true });
}));

r.delete('/notas/:id', h(async (req, res) => {
  const n = await notaDe(req.params.id);
  await permitirCurso(req.user, n.id_curso);
  await pool.query('DELETE FROM calificacion WHERE id_nota = ?', [req.params.id]);
  res.json({ ok: true });
}));

// ---------- ASISTENCIAS ----------
r.get('/cursos/:id/asistencia', h(async (req, res) => {
  requerir(req.query, 'fecha');
  await permitirCurso(req.user, req.params.id);
  const [rows] = await pool.query(
    `SELECT m.id_matricula, e.nombres, e.apellidos, a.estado
     FROM matricula m
     JOIN estudiante e ON e.id_estudiante = m.id_estudiante
     LEFT JOIN asistencia a ON a.id_matricula = m.id_matricula AND a.fecha = ?
     WHERE m.id_curso = ? AND m.estado = 'activa' ORDER BY e.apellidos, e.nombres`,
    [req.query.fecha, req.params.id]);
  res.json(rows);
}));

r.post('/cursos/:id/asistencia', h(async (req, res) => {
  const { fecha, registros } = req.body;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || '') || !Array.isArray(registros)) throw err(400, 'Datos no válidos');
  await permitirCurso(req.user, req.params.id);

  const [validas] = await pool.query(
    "SELECT id_matricula FROM matricula WHERE id_curso = ? AND estado = 'activa'", [req.params.id]);
  const ids = new Set(validas.map(v => v.id_matricula));
  const estados = ['presente', 'ausente', 'tarde', 'excusa'];

  await pool.tx(async c => {
    for (const x of registros) {
      if (!ids.has(x.id_matricula) || !estados.includes(x.estado)) throw err(400, 'Registro de asistencia no válido');
      // La tabla tiene UNIQUE (matrícula, fecha): si ya existe, se actualiza
      await c.query(
        `INSERT INTO asistencia (id_matricula, fecha, estado) VALUES (?,?,?)
         ON DUPLICATE KEY UPDATE estado = VALUES(estado)`, [x.id_matricula, fecha, x.estado]);
    }
  });
  res.json({ ok: true });
}));

module.exports = r;
