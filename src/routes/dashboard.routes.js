const r = require('express').Router();
const pool = require('../db');
const { h } = require('../util');

const contar = async sql => (await pool.query(sql))[0][0].n;

r.get('/', h(async (req, res) => {
  const estudiantes = await contar("SELECT COUNT(*) AS n FROM estudiante WHERE estado = 'activo'");
  const docentes = await contar('SELECT COUNT(*) AS n FROM docente');
  const salones = await contar('SELECT COUNT(*) AS n FROM salon');
  const asignaturas = await contar('SELECT COUNT(*) AS n FROM asignatura');

  // Personas registradas que todavía no tienen cuenta = estado "Pendiente"
  const pendientes = await contar(
    `SELECT (SELECT COUNT(*) FROM estudiante e WHERE NOT EXISTS (SELECT 1 FROM usuario u WHERE u.id_estudiante = e.id_estudiante))
          + (SELECT COUNT(*) FROM docente d WHERE NOT EXISTS (SELECT 1 FROM usuario u WHERE u.id_docente = d.id_docente)) AS n`);

  // Promedio de notas definitivas (vista_boletin) por período del año actual
  const [rendimiento] = await pool.query(
    `SELECT p.id_periodo, p.nombre, ROUND(AVG(b.nota_definitiva), 1) AS promedio
     FROM periodo_academico p
     LEFT JOIN vista_boletin b ON b.id_periodo = p.id_periodo AND b.nota_definitiva IS NOT NULL
     WHERE YEAR(p.fecha_inicio) = COALESCE(
        (SELECT YEAR(fecha_inicio) FROM periodo_academico WHERE estado = 'en_curso' ORDER BY fecha_inicio DESC LIMIT 1),
        YEAR(CURDATE()))
     GROUP BY p.id_periodo, p.nombre, p.fecha_inicio
     ORDER BY p.fecha_inicio`);

  res.json({ estudiantes, docentes, salones, asignaturas, pendientes, rendimiento });
}));

module.exports = r;
