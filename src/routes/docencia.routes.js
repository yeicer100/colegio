// Calificaciones y asistencias: las usan el administrador y el docente.
// El docente SOLO puede trabajar con sus propios cursos.
const r = require('express').Router();
const pool = require('../db');
const { h, err, requerir } = require('../util');
const { listarCursos } = require('../servicios');

// Máximo de notas por estudiante en cada materia y período (se cambia en .env)
const MAX_NOTAS = Number(process.env.MAX_NOTAS) || 5;

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
// Cada estudiante tiene MAX_NOTAS casillas (Nota 1 ... Nota 5). No hay porcentajes en la pantalla:
// la nota definitiva es el promedio de las notas escritas. (La columna "porcentaje" de la BD es
// obligatoria, así que se guarda 100 / MAX_NOTAS en cada nota: el promedio ponderado de la vista
// vista_boletin queda igual a un promedio simple.)
const PCT = Math.floor(10000 / MAX_NOTAS) / 100;

r.get('/cursos/:id/notas', h(async (req, res) => {
  const id = req.params.id;
  await permitirCurso(req.user, id);
  const [est] = await pool.query(
    `SELECT m.id_matricula, e.id_estudiante, e.nombres, e.apellidos
     FROM matricula m JOIN estudiante e ON e.id_estudiante = m.id_estudiante
     WHERE m.id_curso = ? AND m.estado = 'activa' ORDER BY e.apellidos, e.nombres`, [id]);
  const [notas] = await pool.query(
    `SELECT c.id_nota, c.id_matricula, c.descripcion_evaluacion, c.calificacion
     FROM calificacion c JOIN matricula m ON m.id_matricula = c.id_matricula
     WHERE m.id_curso = ? ORDER BY c.fecha, c.id_nota`, [id]);
  // La nota definitiva la calcula la vista vista_boletin
  const [bol] = await pool.query('SELECT id_estudiante, nota_definitiva FROM vista_boletin WHERE id_curso = ?', [id]);

  res.json(est.map(e => {
    const slots = Array(MAX_NOTAS).fill(null);
    const propias = notas.filter(n => n.id_matricula === e.id_matricula);
    const sinLugar = [];
    for (const n of propias) {                       // "Nota 3" va en la casilla 3
      const m = /^Nota (\d+)$/.exec(n.descripcion_evaluacion), k = m ? Number(m[1]) - 1 : -1;
      if (k >= 0 && k < MAX_NOTAS && !slots[k]) slots[k] = { id_nota: n.id_nota, valor: n.calificacion };
      else sinLugar.push(n);
    }
    for (const n of sinLugar) {                      // notas con otro nombre ocupan casillas libres
      const k = slots.indexOf(null);
      if (k >= 0) slots[k] = { id_nota: n.id_nota, valor: n.calificacion };
    }
    const b = bol.find(x => x.id_estudiante === e.id_estudiante);
    return { ...e, slots, max_notas: MAX_NOTAS, nota_definitiva: b ? b.nota_definitiva : null };
  }));
}));

// Guarda todas las casillas de un curso de una vez
r.put('/cursos/:id/notas', h(async (req, res) => {
  const id = req.params.id;
  await permitirCurso(req.user, id);
  if (!Array.isArray(req.body.notas)) throw err(400, 'Datos no válidos');
  const [mats] = await pool.query("SELECT id_matricula FROM matricula WHERE id_curso = ? AND estado = 'activa'", [id]);
  const validas = new Set(mats.map(m => m.id_matricula));

  await pool.tx(async c => {
    for (const est of req.body.notas) {
      if (!validas.has(est.id_matricula) || !Array.isArray(est.slots) || est.slots.length > MAX_NOTAS) throw err(400, 'Datos no válidos');
      for (let k = 0; k < est.slots.length; k++) {
        const { id_nota, valor } = est.slots[k];
        const vacio = valor === '' || valor === null || valor === undefined;
        if (id_nota) {
          const [[n]] = await c.query('SELECT id_nota FROM calificacion WHERE id_nota = ? AND id_matricula = ?', [id_nota, est.id_matricula]);
          if (!n) throw err(400, 'Datos no válidos');
        }
        if (vacio) {
          if (id_nota) await c.query('DELETE FROM calificacion WHERE id_nota = ?', [id_nota]);
          continue;
        }
        const v = Math.round(Number(valor) * 10) / 10;
        if (Number.isNaN(v) || v < 0 || v > 5) throw err(400, 'Las notas deben estar entre 0.0 y 5.0');
        if (id_nota) {
          await c.query('UPDATE calificacion SET descripcion_evaluacion=?, porcentaje=?, calificacion=? WHERE id_nota=?',
            [`Nota ${k + 1}`, PCT, v, id_nota]);
        } else {
          // el trigger trg_validar_calificacion revisa el rango 0.0 a 5.0
          await c.query(
            'INSERT INTO calificacion (id_matricula, descripcion_evaluacion, porcentaje, calificacion, fecha) VALUES (?,?,?,?,CURDATE())',
            [est.id_matricula, `Nota ${k + 1}`, PCT, v]);
        }
      }
    }
  });
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
