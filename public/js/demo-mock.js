/* Modo demostración: simula el backend con datos de ejemplo (no usa MySQL).
   Cambia de rol con:  demo.html?rol=admin | docente | estudiante */
(() => {
  const rol = new URLSearchParams(location.search).get('rol') || 'admin';
  localStorage.setItem('token', 'demo');
  const nombre = { admin: 'Administrador', docente: 'Ana Rodriguez', estudiante: 'Juan Gomez' }[rol] || 'Administrador';

  const est = [
    [1,'1098765432','Juan','Gomez','2010-05-15','activo','Decimo A','activo'],
    [2,'1098765433','Camila','Rodriguez','2011-03-20','activo','Decimo A','pendiente'],
    [3,'1098765434','Mateo','Martinez','2009-08-10','activo','Decimo A','pendiente'],
    [4,'1098765435','Valentina','Hernandez','2010-11-05','activo','Decimo A','activo'],
    [6,'1098765437','Isabella','Torres','2010-07-18','inactivo','Decimo B','inactivo'],
    [7,'1098765438','Daniel','Ramirez','2009-12-12','activo','Decimo B','pendiente'],
    [8,'1098765439','Sofia','Castro','2011-06-30','retirado','Decimo B','pendiente']
  ].map(a => ({ id_estudiante:a[0], documento:a[1], nombres:a[2], apellidos:a[3], fecha_nacimiento:a[4], estado:a[5], salon:a[6], cuenta:a[7], correo_cuenta:null }));

  const doc = [
    [1,'52456789','Ana','Rodriguez','Matematicas','ana@gmail.com','activo'],
    [2,'52456790','Carlos','Perez','Espanol','carlos@gmail.com','pendiente'],
    [3,'52456791','Laura','Gonzalez','Ingles','laura@gmail.com','pendiente'],
    [4,'52456792','Jorge','Martinez','Ciencias Naturales','jorge@gmail.com','inactivo']
  ].map(a => ({ id_docente:a[0], documento:a[1], nombres:a[2], apellidos:a[3], especialidad:a[4], telefono:'3201234567', correo:a[5], cuenta:a[6] }));

  const asig = [['Matematicas',5],['Espanol',4],['Ingles',3],['Ciencias Naturales',4],['Informatica',3]]
    .map((a,i) => ({ id_asignatura:i+1, nombre:a[0], descripcion:'Asignatura de ' + a[0].toLowerCase(), intensidad_horaria:a[1] }));

  const salones = [
    { id_salon:1, nombre:'Decimo A', grupo:'A', anio_lectivo:2026, cupo_maximo:30, id_sede:1, id_grado:5, id_director_grupo:1, grado:'Decimo', sede:'Sede Principal', director_grupo:'Ana Rodriguez', total_estudiantes:5, cupos_disponibles:25 },
    { id_salon:2, nombre:'Decimo B', grupo:'B', anio_lectivo:2026, cupo_maximo:30, id_sede:1, id_grado:5, id_director_grupo:2, grado:'Decimo', sede:'Sede Principal', director_grupo:'Carlos Perez', total_estudiantes:5, cupos_disponibles:25 }
  ];

  const cursos = [
    [1,'Matematicas','Decimo A','Ana Rodriguez','A101',5],[2,'Espanol','Decimo A','Carlos Perez','A102',5],
    [3,'Ingles','Decimo A','Laura Gonzalez','A103',5],[11,'Matematicas','Decimo B','Ana Rodriguez','B101',5]
  ].map(a => ({ id_curso:a[0], asignatura:a[1], salon:a[2], docente:a[3], aula:a[4], matriculados:a[5], cupo_maximo:30,
    periodo:'Primer Periodo', id_docente:1, id_asignatura:1, id_periodo_academico:1, id_salon:1 }));

  const ficha = {
    datos: { documento:'1098765432', nombres:'Juan', apellidos:'Gomez', fecha_nacimiento:'2010-05-15', direccion:'Cra 10 # 20-30',
      telefono:'3109876543', estado:'activo', salon:'Decimo A (2026)', ac_nombres:'Carlos', ac_apellidos:'Gomez', ac_telefono:'3001234567', ac_correo:'carlos@gmail.com' },
    boletin: [
      { asignatura:'Matematicas', periodo:'Primer Periodo', porcentaje_evaluado:80, nota_definitiva:4.3 },
      { asignatura:'Espanol', periodo:'Primer Periodo', porcentaje_evaluado:25, nota_definitiva:4.0 },
      { asignatura:'Ingles', periodo:'Primer Periodo', porcentaje_evaluado:60, nota_definitiva:2.7 }],
    notas: [
      { asignatura:'Matematicas', descripcion_evaluacion:'Examen parcial', porcentaje:30, calificacion:4.2, fecha:'2026-02-10' },
      { asignatura:'Matematicas', descripcion_evaluacion:'Quiz', porcentaje:20, calificacion:4.5, fecha:'2026-02-20' },
      { asignatura:'Ingles', descripcion_evaluacion:'Taller', porcentaje:60, calificacion:2.7, fecha:'2026-02-22' }],
    asistencia: [
      { asignatura:'Matematicas', dias_registrados:10, dias_presente:8, dias_ausente:1, dias_tarde:1, dias_excusa:0, porcentaje_asistencia:80 },
      { asignatura:'Espanol', dias_registrados:10, dias_presente:10, dias_ausente:0, dias_tarde:0, dias_excusa:0, porcentaje_asistencia:100 }]
  };

  const notasCurso = [
    { id_matricula:1, id_estudiante:1, nombres:'Juan', apellidos:'Gomez', porcentaje_evaluado:50, nota_definitiva:4.3,
      notas:[{ id_nota:1, descripcion_evaluacion:'Examen parcial', porcentaje:30, calificacion:4.2, fecha:'2026-02-10' }, { id_nota:2, descripcion_evaluacion:'Quiz', porcentaje:20, calificacion:4.5, fecha:'2026-02-20' }] },
    { id_matricula:2, id_estudiante:2, nombres:'Camila', apellidos:'Rodriguez', porcentaje_evaluado:30, nota_definitiva:2.8,
      notas:[{ id_nota:3, descripcion_evaluacion:'Examen parcial', porcentaje:30, calificacion:2.8, fecha:'2026-02-10' }] },
    { id_matricula:3, id_estudiante:3, nombres:'Mateo', apellidos:'Martinez', porcentaje_evaluado:0, nota_definitiva:null, notas:[] }
  ];

  const usuarios = [
    { id_usuario:1, correo:'admin@colegio.edu.co', persona:'Administrador', rol:'admin', activo:1, ultimo_acceso:'2026-02-20 08:10:00', es_yo:rol === 'admin' },
    { id_usuario:2, correo:'ana@gmail.com', persona:'Ana Rodriguez', rol:'docente', activo:1, ultimo_acceso:null, es_yo:false },
    { id_usuario:4, correo:'juan@colegio.edu.co', persona:'Juan Gomez', rol:'estudiante', activo:0, ultimo_acceso:null, es_yo:false }
  ];

  const sel = (arr, id, n) => arr.map(x => ({ [id]: x[id], nombre: x[n] }));
  const ruta = (p, qs) => {
    if (p === '/auth/me') return { usuario:{ rol, correo:'demo@colegio.edu.co', nombre }, periodo:{ id_periodo:1, nombre:'Primer Periodo' } };
    if (p === '/auth/login') return { token:'demo', usuario:{ rol, nombre } };
    if (p === '/dashboard') return { estudiantes:10, docentes:10, salones:2, asignaturas:10, pendientes:18, rendimiento:[
      { nombre:'Primer Periodo', promedio:3.9 }, { nombre:'Segundo Periodo', promedio:4.1 }, { nombre:'Tercer Periodo', promedio:3.6 },
      { nombre:'Cuarto Periodo', promedio:null }, { nombre:'Nivelacion 2026', promedio:null }] };
    if (p === '/estudiantes') return est;
    if (/^\/estudiantes\/\d+\/ficha$/.test(p) || p === '/yo/ficha') return ficha;
    if (/^\/estudiantes\/\d+$/.test(p)) return { ...est[0], direccion:'Cra 10 # 20-30', telefono:'3109876543', ac_documento:'1234567890', ac_nombres:'Carlos', ac_apellidos:'Gomez', ac_telefono:'3001234567', ac_correo:'carlos@gmail.com' };
    if (p === '/docentes') return doc;
    if (/^\/docentes\/\d+\/cursos$/.test(p)) return cursos.slice(0, 2);
    if (/^\/docentes\/\d+$/.test(p)) return doc[0];
    if (p === '/salones') return salones;
    if (/^\/salones\/\d+\/estudiantes$/.test(p)) return est.slice(0, 4).map(e => ({ ...e, estado_estudiante:e.estado }));
    if (p === '/asignaturas') return asig;
    if (p === '/cursos') return cursos;
    if (p === '/docencia/cursos') return cursos;
    if (/^\/docencia\/cursos\/\d+\/notas$/.test(p)) return notasCurso;
    if (/^\/docencia\/cursos\/\d+\/asistencia$/.test(p)) return [
      { id_matricula:1, nombres:'Juan', apellidos:'Gomez', estado:'presente' }, { id_matricula:2, nombres:'Camila', apellidos:'Rodriguez', estado:null },
      { id_matricula:3, nombres:'Mateo', apellidos:'Martinez', estado:'ausente' }];
    if (p === '/matriculas') return [1, 2, 3].map(i => ({ id_matricula:i, id_estudiante:i, documento:est[i-1].documento, nombres:est[i-1].nombres, apellidos:est[i-1].apellidos, estado:i === 3 ? 'retirada' : 'activa', fecha_matricula:'2026-01-20 09:00:00' }));
    if (p.startsWith('/matriculas/elegibles')) return est.slice(3, 5).map(e => ({ id_estudiante:e.id_estudiante, nombres:e.nombres, apellidos:e.apellidos }));
    if (p === '/usuarios') return usuarios;
    if (p === '/catalogos') return { sedes:[{ id_sede:1, nombre:'Sede Principal' }], grados:[{ id_grado:5, nombre:'Decimo' }], docentes:sel(doc, 'id_docente', 'nombres'),
      asignaturas:sel(asig, 'id_asignatura', 'nombre'), periodos:[{ id_periodo:1, nombre:'Primer Periodo' }], salones:salones.map(s => ({ id_salon:s.id_salon, nombre:s.nombre, anio_lectivo:2026 })) };
    return {};
  };

  window.fetch = async (url, o = {}) => {
    const [p, qs] = String(url).replace('/api', '').split('?');
    const d = (o.method && o.method !== 'GET') ? { ok:true, matriculados:5, aviso:null } : ruta(p, qs);
    return new Response(JSON.stringify(d), { status:200, headers:{ 'Content-Type':'application/json' } });
  };
})();
