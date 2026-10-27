const pool = require('./db');
const { err } = require('./util');

// Código corto del salón: grado + grupo -> 10A, 6B. Si el grupo es número -> 10.1, 6.2
// (se usa dentro de consultas que tengan los alias  s = salon  y  g = grado)
const COD = "IF(s.grupo REGEXP '^[0-9]+$', CONCAT(g.nivel, '.', s.grupo), CONCAT(g.nivel, s.grupo))";
// Año lectivo más reciente registrado
const ANIO = '(SELECT MAX(anio_lectivo) FROM salon)';

// Toda la información académica de un estudiante (usa los procedimientos del SQL)
async function ficha(id) {
  const [[datos]] = await pool.query(
    `SELECT e.*, a.documento AS ac_documento, a.nombres AS ac_nombres, a.apellidos AS ac_apellidos,
            a.telefono AS ac_telefono, a.correo AS ac_correo
     FROM estudiante e JOIN acudiente a ON a.id_acudiente = e.id_acudiente
     WHERE e.id_estudiante = ?`, [id]);
  if (!datos) throw err(404, 'Estudiante no encontrado');

  const [[salon]] = await pool.query(
    `SELECT ${COD} AS codigo, s.nombre, s.anio_lectivo
     FROM salon_estudiante se JOIN salon s ON s.id_salon = se.id_salon JOIN grado g ON g.id_grado = s.id_grado
     WHERE se.id_estudiante = ? AND se.estado = 'activo'
     ORDER BY s.anio_lectivo DESC LIMIT 1`, [id]);

  // Materias en las que está matriculado, con su docente
  const [materias] = await pool.query(
    `SELECT asg.nombre AS asignatura, CONCAT(d.nombres, ' ', d.apellidos) AS docente,
            p.nombre AS periodo, cu.aula, m.estado
     FROM matricula m
     JOIN curso cu ON cu.id_curso = m.id_curso
     JOIN asignatura asg ON asg.id_asignatura = cu.id_asignatura
     JOIN docente d ON d.id_docente = cu.id_docente
     JOIN periodo_academico p ON p.id_periodo = cu.id_periodo_academico
     WHERE m.id_estudiante = ? ORDER BY p.fecha_inicio, asg.nombre`, [id]);

  const proc = async (sql, p) => (await pool.query(sql, p))[0][0];
  return {
    datos: { ...datos, salon: salon ? `${salon.codigo} · ${salon.nombre} (${salon.anio_lectivo})` : null },
    materias,
    boletin: await proc('CALL sp_boletin_estudiante(?, NULL)', [id]),
    notas: await proc('CALL sp_notas_estudiante(?, NULL)', [id]),
    asistencia: await proc('CALL sp_asistencia_estudiante(?)', [id])
  };
}

// Cursos (asignatura + salón + período + docente)
async function listarCursos(where = '', params = []) {
  const [rows] = await pool.query(
    `SELECT cu.id_curso, cu.id_asignatura, cu.id_docente, cu.id_periodo_academico, cu.id_salon,
            cu.aula, cu.cupo_maximo,
            asg.nombre AS asignatura, CONCAT(d.nombres, ' ', d.apellidos) AS docente,
            s.nombre AS salon, ${COD} AS codigo, g.id_grado, g.nivel, g.nombre AS grado,
            p.nombre AS periodo,
            (SELECT COUNT(*) FROM matricula m WHERE m.id_curso = cu.id_curso AND m.estado = 'activa') AS matriculados
     FROM curso cu
     JOIN asignatura asg ON asg.id_asignatura = cu.id_asignatura
     JOIN docente d ON d.id_docente = cu.id_docente
     JOIN salon s ON s.id_salon = cu.id_salon
     JOIN grado g ON g.id_grado = s.id_grado
     JOIN periodo_academico p ON p.id_periodo = cu.id_periodo_academico
     ${where}
     ORDER BY g.nivel, s.grupo, p.fecha_inicio, asg.nombre`, params);
  return rows;
}

// ---------- Matrícula automática ----------
// Usa el procedimiento transaccional del SQL (valida salón y cupo, y llena la bitácora).
// Si falla (ya matriculado, cupo lleno) simplemente devuelve false.
async function matricular(idEstudiante, idCurso) {
  try { await pool.query('CALL sp_matricular_estudiante_tx(?, ?)', [idEstudiante, idCurso]); return true; }
  catch (e) { return false; }
}

// Un estudiante nuevo en un salón -> se matricula en todos los cursos de ese salón
async function matricularEstudianteEnSalon(idEstudiante, idSalon) {
  const [cursos] = await pool.query('SELECT id_curso FROM curso WHERE id_salon = ?', [idSalon]);
  let n = 0;
  for (const c of cursos) if (await matricular(idEstudiante, c.id_curso)) n++;
  return n;
}

// Un curso nuevo -> se matriculan todos los estudiantes activos del salón
async function matricularSalonEnCurso(idCurso) {
  const [est] = await pool.query(
    `SELECT se.id_estudiante
     FROM curso cu
     JOIN salon_estudiante se ON se.id_salon = cu.id_salon AND se.estado = 'activo'
     JOIN estudiante e ON e.id_estudiante = se.id_estudiante AND e.estado = 'activo'
     WHERE cu.id_curso = ?`, [idCurso]);
  let n = 0;
  for (const e of est) if (await matricular(e.id_estudiante, idCurso)) n++;
  return n;
}

module.exports = { COD, ANIO, ficha, listarCursos, matricularEstudianteEnSalon, matricularSalonEnCurso };
