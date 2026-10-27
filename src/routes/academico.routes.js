// Salones, asignaturas y cursos (solo administrador)
const r = require('express').Router();
const pool = require('../db');
const { h, err, requerir, t } = require('../util');
const { COD, listarCursos, matricularSalonEnCurso } = require('../servicios');

// Listas para llenar los <select> de los formularios
r.get('/catalogos', h(async (req, res) => {
  const q = async s => (await pool.query(s))[0];
  res.json({
    sedes: await q('SELECT id_sede, nombre FROM sede ORDER BY nombre'),
    grados: await q('SELECT id_grado, nombre FROM grado ORDER BY nivel'),
    docentes: await q("SELECT id_docente, CONCAT(nombres,' ',apellidos) AS nombre FROM docente ORDER BY apellidos, nombres"),
    asignaturas: await q('SELECT id_asignatura, nombre FROM asignatura ORDER BY nombre'),
    periodos: await q('SELECT id_periodo, nombre FROM periodo_academico ORDER BY fecha_inicio DESC'),
    salones: await q(`SELECT s.id_salon, s.nombre, s.anio_lectivo, g.nivel, ${COD} AS codigo FROM salon s JOIN grado g ON g.id_grado = s.id_grado ORDER BY s.anio_lectivo DESC, g.nivel, s.grupo`)
  });
}));

// ---------- SALONES ----------
r.get('/salones', h(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT s.id_salon, s.nombre, s.grupo, s.anio_lectivo, s.cupo_maximo, s.id_sede, s.id_grado, s.id_director_grupo,
            g.nivel, ${COD} AS codigo,
            v.grado, v.sede, v.director_grupo, v.total_estudiantes, v.cupos_disponibles
     FROM salon s
     JOIN grado g ON g.id_grado = s.id_grado
     JOIN vista_salon_resumen v ON v.id_salon = s.id_salon
     ORDER BY s.anio_lectivo DESC, g.nivel, s.grupo`);
  res.json(rows);
}));

r.get('/salones/:id/estudiantes', h(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT documento, nombres, apellidos, estado_estudiante
     FROM vista_estudiantes_por_salon
     WHERE id_salon = ? AND estado_en_salon = 'activo' ORDER BY apellidos, nombres`, [req.params.id]);
  res.json(rows);
}));

async function datosSalon(b) {
  requerir(b, 'id_sede', 'id_grado', 'grupo', 'anio_lectivo');
  const [[g]] = await pool.query('SELECT nombre FROM grado WHERE id_grado = ?', [b.id_grado]);
  if (!g) throw err(400, 'Grado no válido');
  const grupo = String(b.grupo).trim().toUpperCase();
  return [b.id_sede, b.id_grado, b.id_director_grupo || null, grupo, `${g.nombre} ${grupo}`,
    b.anio_lectivo, b.cupo_maximo || 30];
}

r.post('/salones', h(async (req, res) => {
  const d = await datosSalon(req.body);
  const [x] = await pool.query(
    `INSERT INTO salon (id_sede, id_grado, id_director_grupo, grupo, nombre, anio_lectivo, cupo_maximo)
     VALUES (?,?,?,?,?,?,?)`, d);
  res.status(201).json({ id: x.insertId });
}));

r.put('/salones/:id', h(async (req, res) => {
  const d = await datosSalon(req.body);
  await pool.query(
    `UPDATE salon SET id_sede=?, id_grado=?, id_director_grupo=?, grupo=?, nombre=?, anio_lectivo=?, cupo_maximo=?
     WHERE id_salon=?`, [...d, req.params.id]);
  res.json({ ok: true });
}));

// ---------- ASIGNATURAS ----------
r.get('/asignaturas', h(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM asignatura ORDER BY nombre');
  res.json(rows);
}));

r.post('/asignaturas', h(async (req, res) => {
  requerir(req.body, 'nombre');
  const b = req.body;
  const [x] = await pool.query('INSERT INTO asignatura (nombre, descripcion, intensidad_horaria) VALUES (?,?,?)',
    [t(b.nombre), t(b.descripcion), b.intensidad_horaria || null]);
  res.status(201).json({ id: x.insertId });
}));

r.put('/asignaturas/:id', h(async (req, res) => {
  requerir(req.body, 'nombre');
  const b = req.body;
  await pool.query('UPDATE asignatura SET nombre=?, descripcion=?, intensidad_horaria=? WHERE id_asignatura=?',
    [t(b.nombre), t(b.descripcion), b.intensidad_horaria || null, req.params.id]);
  res.json({ ok: true });
}));

// ---------- CURSOS (asignatura dictada a un salón en un período) ----------
r.get('/cursos', h(async (req, res) => res.json(await listarCursos())));

r.post('/cursos', h(async (req, res) => {
  const b = req.body;
  requerir(b, 'id_asignatura', 'id_docente', 'id_periodo_academico', 'id_salon');
  const [x] = await pool.query(
    `INSERT INTO curso (id_asignatura, id_docente, id_periodo_academico, id_salon, aula, cupo_maximo)
     VALUES (?,?,?,?,?,?)`,
    [b.id_asignatura, b.id_docente, b.id_periodo_academico, b.id_salon, t(b.aula), b.cupo_maximo || 30]);
  const matriculados = await matricularSalonEnCurso(x.insertId);   // matrícula automática
  res.status(201).json({ id: x.insertId, matriculados });
}));

r.put('/cursos/:id', h(async (req, res) => {
  const b = req.body;
  requerir(b, 'id_docente');
  await pool.query('UPDATE curso SET id_docente=?, aula=?, cupo_maximo=? WHERE id_curso=?',
    [b.id_docente, t(b.aula), b.cupo_maximo || 30, req.params.id]);
  res.json({ ok: true });
}));

module.exports = r;
