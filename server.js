require('dotenv').config();
const express = require('express');
const path = require('path');
const { auth, rol } = require('./src/auth');
const { h } = require('./src/util');
const { ficha } = require('./src/servicios');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rutas públicas
app.use('/api/auth', require('./src/routes/auth.routes'));

// Rutas solo del ADMINISTRADOR
app.use('/api/dashboard',   auth, rol('admin'), require('./src/routes/dashboard.routes'));
app.use('/api/estudiantes', auth, rol('admin'), require('./src/routes/estudiantes.routes'));
app.use('/api/docentes',    auth, rol('admin'), require('./src/routes/docentes.routes'));
app.use('/api/usuarios',    auth, rol('admin'), require('./src/routes/usuarios.routes'));

// ADMINISTRADOR y DOCENTE (el docente solo ve sus cursos)
app.use('/api/docencia', auth, rol('admin', 'docente'), require('./src/routes/docencia.routes'));

// ESTUDIANTE: solo su propia información (el id sale del token, no de la petición)
app.get('/api/yo/ficha', auth, rol('estudiante'),
  h(async (req, res) => res.json(await ficha(req.user.id_estudiante))));

// Salones, asignaturas, cursos y catálogos (solo administrador)
app.use('/api', auth, rol('admin'), require('./src/routes/academico.routes'));

app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// Manejo central de errores (incluye los mensajes de los triggers de MySQL)
app.use((e, req, res, next) => {
  if (e.status) return res.status(e.status).json({ error: e.message });
  if (e.sqlState === '45000') return res.status(400).json({ error: e.sqlMessage });
  if (e.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Ya existe un registro con esos datos (documento, correo o combinación repetida)' });
  if (e.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ error: 'Alguno de los datos relacionados no es válido' });
  console.error(e);
  res.status(500).json({ error: 'Error del servidor' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`EduGest en http://localhost:${PORT}`));
