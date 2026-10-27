/* Modo demostración: simula el backend con datos de ejemplo (no usa MySQL).
   demo.html?rol=admin | docente | estudiante  entra directo con ese rol.
   Si abres index.html con este archivo, el rol se elige según el correo escrito. */
(() => {
  const NOMBRES = { admin: 'Administrador', docente: 'Ana Rodriguez', estudiante: 'Juan Gomez' };
  const urlRol = new URLSearchParams(location.search).get('rol');
  if (urlRol) { localStorage.setItem('demoRol', urlRol); localStorage.setItem('token', 'demo'); }
  let rol = localStorage.getItem('demoRol') || 'admin';
  let nombre = NOMBRES[rol];

  const GR = [[1, 6, 'Sexto'], [2, 7, 'Septimo'], [3, 8, 'Octavo'], [4, 9, 'Noveno'], [5, 10, 'Decimo'], [6, 11, 'Once']];
  const DOC = ['Ana Rodriguez|Matematicas', 'Carlos Perez|Espanol', 'Laura Gonzalez|Ingles', 'Jorge Martinez|Ciencias Naturales',
    'Diana Lopez|Ciencias Sociales', 'Andres Torres|Educacion Fisica', 'Paula Ramirez|Informatica', 'Miguel Castro|Filosofia']
    .map((x, i) => { const [n, e] = x.split('|'), [a, b] = n.split(' ');
      return { id_docente: i + 1, documento: '5245' + (6789 + i), nombres: a, apellidos: b, especialidad: e, telefono: '3201234567',
        correo: a.toLowerCase() + '@gmail.com', cuenta: i === 0 ? 'activo' : i === 3 ? 'inactivo' : 'pendiente' }; });
  const ASIG = ['Matematicas', 'Espanol', 'Ingles', 'Ciencias Naturales', 'Informatica'];

  const salones = []; let sid = 0;
  GR.forEach(([idg, niv, nom]) => ['A', 'B', 'C'].forEach(g => { sid++;
    salones.push({ id_salon: sid, nombre: nom + ' ' + g, grupo: g, anio_lectivo: 2026, cupo_maximo: 30, id_sede: 1, id_grado: idg, id_director_grupo: (sid % 8) + 1,
      nivel: niv, codigo: niv + g, grado: nom, sede: 'Sede Principal', director_grupo: DOC[sid % 8].nombres + ' ' + DOC[sid % 8].apellidos }); }));

  const NOM = ['Juan', 'Camila', 'Mateo', 'Valentina', 'Santiago', 'Isabella', 'Daniel', 'Sofia', 'Nicolas', 'Mariana', 'Samuel', 'Luciana'];
  const APE = ['Gomez', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Torres', 'Ramirez', 'Castro', 'Morales', 'Vargas', 'Perez', 'Rojas'];
  const est = [];
  for (let i = 0; i < 54; i++) { const s = salones[(i * 5) % 18];
    est.push({ id_estudiante: i + 1, documento: '10987' + (65432 + i), nombres: NOM[i % 12], apellidos: APE[(i * 7 + 3) % 12], fecha_nacimiento: '2010-05-15',
      estado: i % 17 === 0 ? 'inactivo' : 'activo', id_salon: s.id_salon, codigo: s.codigo, salon: s.nombre, nivel: s.nivel, correo_cuenta: null,
      cuenta: i === 0 ? 'activo' : i % 6 === 0 ? 'inactivo' : 'pendiente' }); }
  salones.forEach(s => { s.total_estudiantes = est.filter(e => e.id_salon === s.id_salon).length; s.cupos_disponibles = 30 - s.total_estudiantes; });

  const cursos = []; let cid = 0;
  salones.forEach(s => ASIG.slice(0, 3).forEach((a, k) => { cid++; const d = DOC[(s.id_salon + k) % 8];
    cursos.push({ id_curso: cid, id_asignatura: k + 1, id_docente: d.id_docente, id_periodo_academico: 1, id_salon: s.id_salon, aula: 'A1' + k, cupo_maximo: 30,
      asignatura: a, docente: d.nombres + ' ' + d.apellidos, salon: s.nombre, codigo: s.codigo, id_grado: s.id_grado, nivel: s.nivel, grado: s.grado,
      periodo: 'Primer Periodo', matriculados: s.total_estudiantes }); }));

  // Del docente demo (Ana) mostramos sus cursos; el resto del catálogo es general
  const cursosDe = rolActual => rolActual === 'docente' ? cursos.filter(c => c.id_docente === 1) : cursos;
  const docs = DOC.map(d => { const mis = cursos.filter(c => c.id_docente === d.id_docente), por = {};
    mis.forEach(c => (por[c.asignatura] = por[c.asignatura] || []).push(c.codigo));
    const dir = salones.find(s => s.id_director_grupo === d.id_docente);
    return { ...d, materias: Object.entries(por).map(([a, l]) => a + ': ' + l.join(', ')).join(' · '), director_de: dir ? dir.codigo : null }; });

  const ficha = { datos: { documento: '1098765432', nombres: 'Juan', apellidos: 'Gomez', fecha_nacimiento: '2010-05-15', direccion: 'Cra 10 # 20-30',
      telefono: '3109876543', estado: 'activo', salon: '10A · Decimo A (2026)', ac_nombres: 'Carlos', ac_apellidos: 'Gomez', ac_telefono: '3001234567', ac_correo: 'carlos@gmail.com' },
    materias: ASIG.map((a, i) => ({ asignatura: a, docente: DOC[i].nombres + ' ' + DOC[i].apellidos, periodo: 'Primer Periodo', aula: 'A10' + (i + 1) })),
    boletin: [['Matematicas', 80, 4.3], ['Espanol', 25, 4.0], ['Ingles', 60, 2.7]].map(b => ({ asignatura: b[0], periodo: 'Primer Periodo', porcentaje_evaluado: b[1], nota_definitiva: b[2] })),
    notas: [['Matematicas', 'Examen parcial', 30, 4.2, '2026-02-10'], ['Matematicas', 'Quiz', 20, 4.5, '2026-02-20'], ['Ingles', 'Taller', 60, 2.7, '2026-02-22']]
      .map(n => ({ asignatura: n[0], periodo: 'Primer Periodo', descripcion_evaluacion: n[1], porcentaje: n[2], calificacion: n[3], fecha: n[4] })),
    asistencia: [['Matematicas', 10, 8, 1, 1, 0, 80], ['Espanol', 10, 10, 0, 0, 0, 100]].map(a => ({ asignatura: a[0], dias_registrados: a[1], dias_presente: a[2],
      dias_ausente: a[3], dias_tarde: a[4], dias_excusa: a[5], porcentaje_asistencia: a[6] })) };

  const notasCurso = [{ id_matricula: 1, id_estudiante: 1, nombres: 'Juan', apellidos: 'Gomez', porcentaje_evaluado: 50, nota_definitiva: 4.3,
      notas: [{ id_nota: 1, descripcion_evaluacion: 'Examen parcial', porcentaje: 30, calificacion: 4.2, fecha: '2026-02-10' }, { id_nota: 2, descripcion_evaluacion: 'Quiz', porcentaje: 20, calificacion: 4.5, fecha: '2026-02-20' }] },
    { id_matricula: 2, id_estudiante: 2, nombres: 'Camila', apellidos: 'Rodriguez', porcentaje_evaluado: 30, nota_definitiva: 2.8,
      notas: [{ id_nota: 3, descripcion_evaluacion: 'Examen parcial', porcentaje: 30, calificacion: 2.8, fecha: '2026-02-10' }] },
    { id_matricula: 3, id_estudiante: 3, nombres: 'Mateo', apellidos: 'Martinez', porcentaje_evaluado: 0, nota_definitiva: null, notas: [] }];

  const ruta = p => {
    if (p === '/auth/me') return { usuario: { rol, correo: 'demo@colegio.edu.co', nombre }, periodo: { id_periodo: 1, nombre: 'Primer Periodo' } };
    if (p === '/dashboard') return { estudiantes: est.length, docentes: DOC.length, salones: salones.length, asignaturas: 10, pendientes: 18, rendimiento: [
      { nombre: 'Primer Periodo', promedio: 3.9 }, { nombre: 'Segundo Periodo', promedio: 4.1 }, { nombre: 'Tercer Periodo', promedio: 3.6 },
      { nombre: 'Cuarto Periodo', promedio: null }, { nombre: 'Nivelacion 2026', promedio: null }] };
    if (p === '/estudiantes') return est;
    if (/^\/estudiantes\/\d+\/ficha$/.test(p) || p === '/yo/ficha') return JSON.parse(JSON.stringify(ficha));
    if (/^\/estudiantes\/\d+$/.test(p)) return { ...est[0], direccion: 'Cra 10 # 20-30', telefono: '3109876543', ac_documento: '1234567890', ac_nombres: 'Carlos', ac_apellidos: 'Gomez', ac_telefono: '3001234567', ac_correo: 'carlos@gmail.com' };
    if (p === '/docentes') return docs;
    if (/^\/docentes\/\d+\/asignaciones$/.test(p)) return cursos.filter(c => c.id_docente === +p.split('/')[2]).slice(0, 4).map(c => ({ asignatura: c.asignatura, codigo: c.codigo, periodos: 1 }));
    if (/^\/docentes\/\d+$/.test(p)) return { ...DOC[0], id_salon_director: 13 };
    if (p === '/salones') return salones;
    if (/^\/salones\/\d+\/estudiantes$/.test(p)) return est.slice(0, 5).map(e => ({ ...e, estado_estudiante: e.estado }));
    if (p === '/asignaturas') return ASIG.map((a, i) => ({ id_asignatura: i + 1, nombre: a, descripcion: 'Asignatura de ' + a.toLowerCase(), intensidad_horaria: 3 + (i % 3) }));
    if (p === '/cursos') return cursos;
    if (p === '/docencia/cursos') return cursosDe(rol);
    if (/^\/docencia\/cursos\/\d+\/notas$/.test(p)) return notasCurso.map(n => ({ id_matricula: n.id_matricula, id_estudiante: n.id_estudiante, nombres: n.nombres, apellidos: n.apellidos,
      nota_definitiva: n.nota_definitiva, max_notas: 5, slots: [0, 1, 2, 3, 4].map(k => n.notas[k] ? { id_nota: n.notas[k].id_nota, valor: n.notas[k].calificacion } : null) }));
    if (/^\/docencia\/cursos\/\d+\/asistencia$/.test(p)) return [{ id_matricula: 1, nombres: 'Juan', apellidos: 'Gomez', estado: 'presente' },
      { id_matricula: 2, nombres: 'Camila', apellidos: 'Rodriguez', estado: null }, { id_matricula: 3, nombres: 'Mateo', apellidos: 'Martinez', estado: 'ausente' }];
    if (p === '/matriculas') return [1, 2, 3].map(i => ({ id_matricula: i, id_estudiante: i, documento: est[i - 1].documento, nombres: est[i - 1].nombres, apellidos: est[i - 1].apellidos, estado: i === 3 ? 'retirada' : 'activa', fecha_matricula: '2026-01-20 09:00:00' }));
    if (p.startsWith('/matriculas/elegibles')) return est.slice(3, 5).map(e => ({ id_estudiante: e.id_estudiante, nombres: e.nombres, apellidos: e.apellidos }));
    if (p === '/usuarios') return [{ id_usuario: 1, correo: 'admin@colegio.edu.co', persona: 'Administrador', rol: 'admin', activo: 1, ultimo_acceso: '2026-02-20 08:10:00', es_yo: rol === 'admin' },
      { id_usuario: 2, correo: 'ana@gmail.com', persona: 'Ana Rodriguez', rol: 'docente', activo: 1, ultimo_acceso: null, es_yo: false },
      { id_usuario: 4, correo: 'juan@colegio.edu.co', persona: 'Juan Gomez', rol: 'estudiante', activo: 0, ultimo_acceso: null, es_yo: false }];
    if (p === '/catalogos') return { sedes: [{ id_sede: 1, nombre: 'Sede Principal' }], grados: GR.map(g => ({ id_grado: g[0], nombre: g[2] })),
      docentes: DOC.map(d => ({ id_docente: d.id_docente, nombre: d.nombres + ' ' + d.apellidos })), asignaturas: ASIG.map((a, i) => ({ id_asignatura: i + 1, nombre: a })),
      periodos: [{ id_periodo: 1, nombre: 'Primer Periodo' }], salones: salones.map(s => ({ id_salon: s.id_salon, nombre: s.nombre, anio_lectivo: 2026, nivel: s.nivel, codigo: s.codigo })) };
    return {};
  };

  const json = d => new Response(JSON.stringify(d), { status: 200, headers: { 'Content-Type': 'application/json' } });
  window.fetch = async (url, o = {}) => {
    const p = String(url).replace('/api', '').split('?')[0];
    if (p === '/auth/login') {   // el rol se elige según el correo escrito
      const c = (JSON.parse(o.body).correo || '').toLowerCase();
      rol = c.startsWith('admin') ? 'admin' : (c.startsWith('ana') || c.includes('docente')) ? 'docente' : 'estudiante';
      nombre = NOMBRES[rol]; localStorage.setItem('demoRol', rol);
      return json({ token: 'demo', usuario: { rol, nombre } });
    }
    if (o.method && o.method !== 'GET') return json({ ok: true, id: 99, matriculas: 10, matriculados: 10, creados: 2, omitidos: [], aviso: null });
    return json(ruta(p));
  };
})();
