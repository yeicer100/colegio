const r = require('express').Router();
const pool = require('../db');
const { h, err, requerir } = require('../util');

// Matrículas de un curso
r.get('/', h(async (req, res) => {
  requerir(req.query, 'id_curso');
  const [rows] = await pool.query(
    `SELECT m.id_matricula, m.id_estudiante, e.documento, e.nombres, e.apellidos, m.estado, m.fecha_matricula
     FROM matricula m JOIN estudiante e ON e.id_estudiante = m.id_estudiante
     WHERE m.id_curso = ? ORDER BY e.apellidos, e.nombres`, [req.query.id_curso]);
  res.json(rows);
}));

// Estudiantes del salón del curso que todavía no están matriculados en él
async function elegibles(idCurso) {
  const [rows] = await pool.query(
    `SELECT e.id_estudiante, e.documento, e.nombres, e.apellidos
     FROM curso cu
     JOIN salon_estudiante se ON se.id_salon = cu.id_salon AND se.estado = 'activo'
     JOIN estudiante e ON e.id_estudiante = se.id_estudiante
     WHERE cu.id_curso = ? AND e.estado = 'activo'
       AND NOT EXISTS (SELECT 1 FROM matricula m WHERE m.id_curso = cu.id_curso AND m.id_estudiante = e.id_estudiante)
     ORDER BY e.apellidos, e.nombres`, [idCurso]);
  return rows;
}

r.get('/elegibles/:idCurso', h(async (req, res) => res.json(await elegibles(req.params.idCurso))));

// Matricular un estudiante (procedimiento transaccional: valida salón y cupo, y llena la bitácora)
r.post('/', h(async (req, res) => {
  requerir(req.body, 'id_estudiante', 'id_curso');
  await pool.query('CALL sp_matricular_estudiante_tx(?, ?)', [req.body.id_estudiante, req.body.id_curso]);
  res.status(201).json({ ok: true });
}));

// Matricular a todo el salón en un curso
r.post('/salon', h(async (req, res) => {
  requerir(req.body, 'id_curso');
  let matriculados = 0, aviso = null;
  for (const e of await elegibles(req.body.id_curso)) {
    try {
      await pool.query('CALL sp_matricular_estudiante_tx(?, ?)', [e.id_estudiante, req.body.id_curso]);
      matriculados++;
    } catch (ex) {
      aviso = ex.sqlMessage || ex.message;   // por ejemplo: cupo máximo alcanzado
      break;
    }
  }
  res.json({ matriculados, aviso });
}));

r.patch('/:id', h(async (req, res) => {
  if (!['activa', 'retirada', 'finalizada'].includes(req.body.estado)) throw err(400, 'Estado no válido');
  await pool.query('UPDATE matricula SET estado = ? WHERE id_matricula = ?', [req.body.estado, req.params.id]);
  res.json({ ok: true });
}));

module.exports = r;
