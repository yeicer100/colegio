const pool = require('./db');
const { err } = require('./util');

// Toda la información académica de un estudiante (usa los procedimientos del SQL)
async function ficha(id) {
  const [[datos]] = await pool.query(
    `SELECT e.*, a.documento AS ac_documento, a.nombres AS ac_nombres, a.apellidos AS ac_apellidos,
            a.telefono AS ac_telefono, a.correo AS ac_correo
     FROM estudiante e JOIN acudiente a ON a.id_acudiente = e.id_acudiente
     WHERE e.id_estudiante = ?`, [id]);
  if (!datos) throw err(404, 'Estudiante no encontrado');

  const [[salon]] = await pool.query(
    `SELECT s.nombre, s.anio_lectivo
     FROM salon_estudiante se JOIN salon s ON s.id_salon = se.id_salon
     WHERE se.id_estudiante = ? AND se.estado = 'activo'
     ORDER BY s.anio_lectivo DESC LIMIT 1`, [id]);

  const proc = async (sql, p) => (await pool.query(sql, p))[0][0];
  return {
    datos: { ...datos, salon: salon ? `${salon.nombre} (${salon.anio_lectivo})` : null },
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
            s.nombre AS salon, p.nombre AS periodo,
            (SELECT COUNT(*) FROM matricula m WHERE m.id_curso = cu.id_curso AND m.estado = 'activa') AS matriculados
     FROM curso cu
     JOIN asignatura asg ON asg.id_asignatura = cu.id_asignatura
     JOIN docente d ON d.id_docente = cu.id_docente
     JOIN salon s ON s.id_salon = cu.id_salon
     JOIN periodo_academico p ON p.id_periodo = cu.id_periodo_academico
     ${where}
     ORDER BY p.fecha_inicio DESC, s.nombre, asg.nombre`, params);
  return rows;
}

module.exports = { ficha, listarCursos };
