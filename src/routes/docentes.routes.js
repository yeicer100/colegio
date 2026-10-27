const r = require('express').Router();
const pool = require('../db');
const { h, err, requerir, t } = require('../util');
const { crearCuenta } = require('../cuentas');
const { COD, ANIO, matricularSalonEnCurso } = require('../servicios');

// Deja al docente como director de UN salón del año actual (o de ninguno si idSalon viene vacío)
async function fijarDirector(c, idDocente, idSalon) {
  const [[a]] = await c.query('SELECT MAX(anio_lectivo) AS anio FROM salon');
  await c.query('UPDATE salon SET id_director_grupo = NULL WHERE id_director_grupo = ? AND anio_lectivo = ?', [idDocente, a.anio]);
  if (idSalon) await c.query('UPDATE salon SET id_director_grupo = ? WHERE id_salon = ?', [idDocente, idSalon]);
}

r.get('/', h(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT d.id_docente, d.documento, d.nombres, d.apellidos, d.especialidad, d.telefono, d.correo,
            CASE WHEN u.id_usuario IS NULL THEN 'pendiente' WHEN u.activo = 1 THEN 'activo' ELSE 'inactivo' END AS cuenta,
            (SELECT ${COD} FROM salon s JOIN grado g ON g.id_grado = s.id_grado
              WHERE s.id_director_grupo = d.id_docente AND s.anio_lectivo = ${ANIO} LIMIT 1) AS director_de
     FROM docente d LEFT JOIN usuario u ON u.id_docente = d.id_docente
     ORDER BY d.apellidos, d.nombres`);

  // Resumen "Matematicas: 10A, 10B · Espanol: 6A"
  const [cs] = await pool.query(
    `SELECT DISTINCT cu.id_docente, asg.nombre AS asignatura, ${COD} AS codigo, g.nivel, s.grupo
     FROM curso cu
     JOIN asignatura asg ON asg.id_asignatura = cu.id_asignatura
     JOIN salon s ON s.id_salon = cu.id_salon
     JOIN grado g ON g.id_grado = s.id_grado
     WHERE s.anio_lectivo = ${ANIO} ORDER BY g.nivel, s.grupo`);
  const por = {};
  for (const c of cs) {
    por[c.id_docente] = por[c.id_docente] || {};
    (por[c.id_docente][c.asignatura] = por[c.id_docente][c.asignatura] || []).push(c.codigo);
  }
  res.json(rows.map(d => ({
    ...d,
    materias: Object.entries(por[d.id_docente] || {}).map(([a, l]) => `${a}: ${l.join(', ')}`).join(' · ')
  })));
}));

r.get('/:id', h(async (req, res) => {
  const [[d]] = await pool.query(
    `SELECT d.*, (SELECT s.id_salon FROM salon s WHERE s.id_director_grupo = d.id_docente
                  AND s.anio_lectivo = ${ANIO} LIMIT 1) AS id_salon_director
     FROM docente d WHERE d.id_docente = ?`, [req.params.id]);
  if (!d) throw err(404, 'Docente no encontrado');
  res.json(d);
}));

r.post('/', h(async (req, res) => {
  const b = req.body;
  requerir(b, 'documento', 'nombres', 'apellidos', 'correo');
  const id = await pool.tx(async c => {
    const [x] = await c.query(
      'INSERT INTO docente (documento, nombres, apellidos, especialidad, telefono, correo) VALUES (?,?,?,?,?,?)',
      [t(b.documento), t(b.nombres), t(b.apellidos), t(b.especialidad), t(b.telefono), t(b.correo)]);
    if (b.id_salon_director) await fijarDirector(c, x.insertId, b.id_salon_director);
    return x.insertId;
  });
  res.status(201).json({ id });
}));

r.put('/:id', h(async (req, res) => {
  const b = req.body, id = req.params.id;
  requerir(b, 'documento', 'nombres', 'apellidos', 'correo');
  await pool.tx(async c => {
    await c.query(
      'UPDATE docente SET documento=?, nombres=?, apellidos=?, especialidad=?, telefono=?, correo=? WHERE id_docente=?',
      [t(b.documento), t(b.nombres), t(b.apellidos), t(b.especialidad), t(b.telefono), t(b.correo), id]);
    await c.query('UPDATE usuario SET correo = ? WHERE id_docente = ?', [t(b.correo), id]);
    if ('id_salon_director' in b) await fijarDirector(c, id, b.id_salon_director);
  });
  res.json({ ok: true });
}));

// ---------- Materias que dicta el docente ----------
r.get('/:id/asignaciones', h(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT asg.id_asignatura, asg.nombre AS asignatura, s.id_salon, ${COD} AS codigo, g.nivel, s.grupo,
            COUNT(*) AS periodos
     FROM curso cu
     JOIN asignatura asg ON asg.id_asignatura = cu.id_asignatura
     JOIN salon s ON s.id_salon = cu.id_salon
     JOIN grado g ON g.id_grado = s.id_grado
     WHERE cu.id_docente = ?
     GROUP BY asg.id_asignatura, asg.nombre, s.id_salon, g.nivel, s.grupo
     ORDER BY g.nivel, s.grupo, asg.nombre`, [req.params.id]);
  res.json(rows);
}));

// Asigna una materia a uno o varios grupos. Crea un curso por cada grupo y período
// y matricula automáticamente a los estudiantes del salón.
r.post('/:id/asignaciones', h(async (req, res) => {
  const idDoc = req.params.id;
  const { id_asignatura, salones, periodos } = req.body;
  requerir(req.body, 'id_asignatura');
  if (!Array.isArray(salones) || !salones.length) throw err(400, 'Elige al menos un grupo');

  let creados = 0;
  const omitidos = [];
  for (const idSalon of salones) {
    const [[s]] = await pool.query(
      `SELECT ${COD} AS codigo, s.cupo_maximo, s.anio_lectivo
       FROM salon s JOIN grado g ON g.id_grado = s.id_grado WHERE s.id_salon = ?`, [idSalon]);
    if (!s) continue;

    let per;
    if (periodos === 'todos') {
      // períodos regulares del año del salón (se excluyen nivelación y recuperación)
      [per] = await pool.query(
        `SELECT id_periodo FROM periodo_academico
         WHERE YEAR(fecha_inicio) = ? AND nombre NOT LIKE 'Nivelacion%' AND nombre NOT LIKE 'Recuperacion%'`, [s.anio_lectivo]);
    } else {
      [per] = await pool.query(
        "SELECT id_periodo FROM periodo_academico WHERE estado = 'en_curso' ORDER BY fecha_inicio DESC LIMIT 1");
    }
    if (!per.length) throw err(400, 'No hay un período académico en curso');

    for (const p of per) {
      const [[ya]] = await pool.query(
        'SELECT id_curso, id_docente FROM curso WHERE id_asignatura = ? AND id_periodo_academico = ? AND id_salon = ?',
        [id_asignatura, p.id_periodo, idSalon]);
      if (ya) {
        if (ya.id_docente !== Number(idDoc)) omitidos.push(`${s.codigo}: esa materia ya la dicta otro docente`);
        continue;
      }
      const [x] = await pool.query(
        'INSERT INTO curso (id_asignatura, id_docente, id_periodo_academico, id_salon, cupo_maximo) VALUES (?,?,?,?,?)',
        [id_asignatura, idDoc, p.id_periodo, idSalon, s.cupo_maximo]);
      await matricularSalonEnCurso(x.insertId);
      creados++;
    }
  }
  res.status(201).json({ creados, omitidos: [...new Set(omitidos)] });
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
