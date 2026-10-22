/* =====================================================================
   EduGest - Frontend (HTML + JavaScript puro)
   Todo se pide al backend con fetch('/api/...'); nada de datos escritos a mano.
   ===================================================================== */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const ICONOS = {
  home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
  layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
  clip: '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'
};
const ic = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONOS[n]}</svg>`;

const MENUS = {
  admin: [['dashboard', 'Dashboard', 'home'], ['estudiantes', 'Estudiantes', 'user'], ['docentes', 'Docentes', 'users'],
    ['salones', 'Salones', 'grid'], ['asignaturas', 'Asignaturas', 'book'], ['cursos', 'Cursos', 'layers'],
    ['matriculas', 'Matrículas', 'clip'], ['calificaciones', 'Calificaciones', 'file'],
    ['asistencias', 'Asistencias', 'cal'], ['usuarios', 'Usuarios', 'lock']],
  docente: [['miscursos', 'Mis cursos', 'layers'], ['calificaciones', 'Calificaciones', 'file'], ['asistencias', 'Asistencias', 'cal']],
  estudiante: [['info', 'Mi información', 'user'], ['notas', 'Mis calificaciones', 'file'], ['asist', 'Mi asistencia', 'cal']]
};
const ROLES = { admin: 'Administrador', docente: 'Docente', estudiante: 'Estudiante', acudiente: 'Acudiente' };

let token = localStorage.getItem('token'), sesion = null, periodo = null, cursoSel = '';
const main = $('#main');
const PAGINAS = {};
const hoy = () => new Date().toLocaleDateString('en-CA');

/* ---------- Utilidades ---------- */
async function api(ruta, o = {}) {
  const r = await fetch('/api' + ruta, {
    method: o.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: o.body ? JSON.stringify(o.body) : undefined
  });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && token) { salir(); throw new Error(d.error || 'Sesión expirada'); }
  if (!r.ok) throw new Error(d.error || 'Ocurrió un error');
  return d;
}

function toast(m, mal) {
  const t = $('#toast');
  t.textContent = m; t.className = mal ? 'mal' : ''; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 3500);
}

const badge = e => `<span class="badge ${esc(e)}">${esc(e.charAt(0).toUpperCase() + e.slice(1))}</span>`;
const nt = n => n == null ? '—' : `<b class="${n < 3 ? 'bad' : 'good'}">${n}</b>`;
const nombreCompleto = r => `${esc(r.apellidos)} ${esc(r.nombres)}`;
const opciones = (arr, v, t, vacio = 'Seleccione...') => [{ v: '', t: vacio }, ...arr.map(x => ({ v: x[v], t: x[t] }))];
const cabecera = (titulo, sub, extra = '') =>
  `<div class="head"><div><h1>${titulo}</h1><p class="muted">${sub}</p></div>${extra}</div>`;
const tab = (heads, filas) =>
  `<div class="tw"><table><thead><tr>${heads.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${
    filas.map(f => `<tr>${f.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;

/* ---------- Ventanas y formularios ---------- */
function ventana(titulo, html) {
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="modal ancha"><h3>${titulo}</h3>${html}<div class="botones"><button class="btn sec">Cerrar</button></div></div>`;
  ov.querySelector('button').onclick = () => ov.remove();
  document.body.appendChild(ov);
}

function campo(c, v) {
  if (c.sep) return `<h4 class="sep">${c.sep}</h4>`;
  const val = v ?? c.def ?? '';
  const input = c.type === 'select'
    ? `<select name="${c.name}" ${c.req ? 'required' : ''}>${c.opciones.map(o =>
        `<option value="${esc(o.v)}" ${String(o.v) === String(val) ? 'selected' : ''}>${esc(o.t)}</option>`).join('')}</select>`
    : `<input name="${c.name}" type="${c.type || 'text'}" value="${esc(val)}" ${c.req ? 'required' : ''} ${c.ro ? 'readonly' : ''}
        ${c.min !== undefined ? `min="${c.min}"` : ''} ${c.max !== undefined ? `max="${c.max}"` : ''} ${c.step ? `step="${c.step}"` : ''}>`;
  return `<label class="${c.full ? 'full' : ''}">${c.label}${input}</label>`;
}

function formulario({ titulo, campos, valores = {}, guardar, texto = 'Guardar', eliminar }) {
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<form class="modal"><h3>${titulo}</h3>
    <div class="grid">${campos.map(c => campo(c, valores[c.name])).join('')}</div>
    <p class="err" hidden></p>
    <div class="botones">
      ${eliminar ? '<button type="button" class="btn mal" data-del>Eliminar</button>' : ''}
      <button type="button" class="btn sec" data-x>Cancelar</button>
      <button class="btn">${texto}</button>
    </div></form>`;
  document.body.appendChild(ov);
  const cerrar = () => ov.remove();
  ov.querySelector('[data-x]').onclick = cerrar;
  if (eliminar) ov.querySelector('[data-del]').onclick = async () => { if (await eliminar()) cerrar(); };
  ov.querySelector('form').onsubmit = async e => {
    e.preventDefault();
    try { await guardar(Object.fromEntries(new FormData(e.target))); cerrar(); }
    catch (err) { const p = ov.querySelector('.err'); p.textContent = err.message; p.hidden = false; }
  };
}

/* ---------- Lista genérica (buscar + filtrar + tabla + acciones) ---------- */
async function lista(cfg) {
  let rows = await cfg.cargar();
  main.innerHTML = cabecera(cfg.titulo, cfg.sub, cfg.nuevo ? `<button class="btn" id="nuevo">+ ${cfg.nuevo}</button>` : '') +
    `<div class="panel"><div class="tools"><input id="q" type="text" placeholder="Buscar...">
    ${(cfg.filtros || []).map((f, i) => `<select data-f="${i}"><option value="">${f.label}</option>${
      f.opciones.map(o => `<option>${esc(o)}</option>`).join('')}</select>`).join('')}</div><div id="tabla"></div></div>`;

  const pintar = () => {
    const q = $('#q').value.toLowerCase();
    const fv = [...main.querySelectorAll('[data-f]')].map(s => s.value);
    const vis = rows.filter(r => Object.values(r).join(' ').toLowerCase().includes(q) &&
      (cfg.filtros || []).every((f, i) => !fv[i] || f.test(r, fv[i])));
    $('#tabla').innerHTML = vis.length
      ? `<div class="tw"><table><thead><tr>${cfg.cols.map(c => `<th>${c.t}</th>`).join('')}${cfg.acciones ? '<th></th>' : ''}</tr></thead><tbody>${
          vis.map(r => `<tr>${cfg.cols.map(c => `<td>${c.f(r)}</td>`).join('')}${
            cfg.acciones ? `<td class="acc" data-i="${rows.indexOf(r)}">${cfg.acciones(r)}</td>` : ''}</tr>`).join('')}</tbody></table></div>`
      : '<p class="empty">No hay registros que coincidan.</p>';
  };
  const recargar = async () => { rows = await cfg.cargar(); pintar(); };

  $('#q').oninput = pintar;
  main.querySelectorAll('[data-f]').forEach(s => s.onchange = pintar);
  if (cfg.nuevo) $('#nuevo').onclick = () => cfg.onNuevo(recargar);
  $('#tabla').onclick = async e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    try { await cfg.onAccion(b.dataset.act, rows[b.closest('td').dataset.i], recargar); }
    catch (err) { toast(err.message, true); }
  };
  pintar();
}
const btnAcc = (act, txt, cls = '') => `<button class="link ${cls}" data-act="${act}">${txt}</button>`;

/* ---------- Sesión ---------- */
const MENU_INICIO = () => MENUS[sesion.rol][0][0];

function mostrarLogin() { $('#app').hidden = true; $('#login').hidden = false; }

function mostrarApp() {
  $('#login').hidden = true; $('#app').hidden = false;
  $('#uNombre').textContent = sesion.nombre;
  $('#uRol').textContent = ROLES[sesion.rol];
  $('#av').textContent = sesion.nombre[0];
  const f = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  $('#fecha').textContent = f.charAt(0).toUpperCase() + f.slice(1);
  $('#periodo').textContent = periodo ? 'Período actual: ' + periodo.nombre : 'Sin período en curso';
  $('#menu').innerHTML = MENUS[sesion.rol].map(i => `<button data-p="${i[0]}">${ic(i[2])}<span>${i[1]}</span></button>`).join('');
  $('#menu').onclick = e => { const b = e.target.closest('button'); if (b) ir(b.dataset.p); };
  ir(MENU_INICIO());
}

function salir() { token = null; sesion = null; localStorage.removeItem('token'); mostrarLogin(); }

async function iniciar() {
  if (!token) return mostrarLogin();
  try { const d = await api('/auth/me'); sesion = d.usuario; periodo = d.periodo; mostrarApp(); }
  catch { mostrarLogin(); }
}

async function ir(p) {
  document.querySelectorAll('#menu button').forEach(b => b.classList.toggle('on', b.dataset.p === p));
  main.innerHTML = '<p class="muted">Cargando...</p>'; main.onclick = null;
  try { await PAGINAS[p](); }
  catch (e) { main.innerHTML = `<p class="error">${esc(e.message)}</p>`; }
}

$('#salir').onclick = salir;
$('#formLogin').onsubmit = async e => {
  e.preventDefault();
  const p = $('#loginErr');
  try {
    const r = await api('/auth/login', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) });
    token = r.token; localStorage.setItem('token', token); p.hidden = true; e.target.reset();
    iniciar();
  } catch (err) { p.textContent = err.message; p.hidden = false; }
};

/* ---------- Ficha del estudiante (la usa el admin y el propio estudiante) ---------- */
function htmlFicha(f, sec = ['datos', 'notas', 'asist']) {
  const d = f.datos, dt = (a, b) => `<div><small>${a}</small><b>${esc(b || '—')}</b></div>`;
  let x = '';
  if (sec.includes('datos')) x += `<div class="info">${dt('Documento', d.documento)}${dt('Nombre', d.nombres + ' ' + d.apellidos)}
    ${dt('Fecha de nacimiento', d.fecha_nacimiento)}${dt('Salón', d.salon)}${dt('Teléfono', d.telefono)}${dt('Dirección', d.direccion)}
    ${dt('Estado', d.estado)}${dt('Acudiente', d.ac_nombres + ' ' + d.ac_apellidos)}${dt('Tel. acudiente', d.ac_telefono)}
    ${dt('Correo acudiente', d.ac_correo)}</div>`;
  if (sec.includes('notas')) {
    x += '<h4 class="sub">Boletín: nota definitiva por asignatura</h4>' + (f.boletin.length
      ? tab(['Asignatura', 'Período', '% evaluado', 'Nota definitiva'],
          f.boletin.map(b => [esc(b.asignatura), esc(b.periodo), b.porcentaje_evaluado + '%', nt(b.nota_definitiva)]))
      : '<p class="empty">Aún no hay matrículas.</p>');
    x += '<h4 class="sub">Detalle de evaluaciones</h4>' + (f.notas.length
      ? tab(['Asignatura', 'Evaluación', 'Porcentaje', 'Nota', 'Fecha'],
          f.notas.map(n => [esc(n.asignatura), esc(n.descripcion_evaluacion), n.porcentaje + '%', nt(n.calificacion), esc(n.fecha)]))
      : '<p class="empty">Aún no hay calificaciones registradas.</p>');
  }
  if (sec.includes('asist')) {
    x += '<h4 class="sub">Asistencia por asignatura</h4>' + (f.asistencia.length
      ? tab(['Asignatura', 'Registrados', 'Presente', 'Ausente', 'Tarde', 'Excusa', '% asistencia'],
          f.asistencia.map(a => [esc(a.asignatura), a.dias_registrados, a.dias_presente ?? 0, a.dias_ausente ?? 0,
            a.dias_tarde ?? 0, a.dias_excusa ?? 0, a.porcentaje_asistencia == null ? '—' : a.porcentaje_asistencia + '%']))
      : '<p class="empty">Aún no hay matrículas.</p>');
  }
  return x;
}

/* =====================================================================
   PÁGINAS DEL ADMINISTRADOR
   ===================================================================== */
PAGINAS.dashboard = async () => {
  const d = await api('/dashboard');
  const tarjetas = [['Estudiantes', d.estudiantes, 'users', ''], ['Docentes', d.docentes, 'user', 'verde'],
    ['Salones', d.salones, 'grid', 'morado'], ['Asignaturas', d.asignaturas, 'book', 'amarillo']];
  main.innerHTML = cabecera(`¡Bienvenido, ${esc(sesion.nombre.split(' ')[0])}!`, 'Aquí tienes un resumen general de la institución educativa.') +
    (d.pendientes ? `<div class="aviso">Hay <b>${d.pendientes}</b> personas registradas sin cuenta de acceso (estado Pendiente).</div>` : '') +
    `<div class="cards">${tarjetas.map(t => `<div class="card ${t[3]}"><div class="ico">${ic(t[2])}</div><h4>${t[0]}</h4><strong>${t[1]}</strong></div>`).join('')}</div>
    <div class="panel"><h3>Rendimiento académico</h3><p class="muted">Promedio general por período (escala de 0 a 5)</p>
    <div class="barras">${d.rendimiento.length ? d.rendimiento.map((r, i) => `<div class="barra"><span>${esc(r.nombre)}</span>
      <div class="pista"><div class="relleno c${i % 4}" style="width:${r.promedio ? r.promedio / 5 * 100 : 0}%"></div></div>
      <b>${r.promedio ?? 'Sin notas'}</b></div>`).join('') : '<p class="empty">No hay períodos registrados.</p>'}</div></div>`;
};

/* --- Estudiantes --- */
const camposEstudiante = (edit, salones) => [
  { name: 'documento', label: 'Documento', req: 1 },
  { name: 'fecha_nacimiento', label: 'Fecha de nacimiento', type: 'date', req: 1 },
  { name: 'nombres', label: 'Nombres', req: 1 },
  { name: 'apellidos', label: 'Apellidos', req: 1 },
  { name: 'telefono', label: 'Teléfono' },
  { name: 'direccion', label: 'Dirección' },
  edit
    ? { name: 'estado', label: 'Estado', type: 'select', full: 1, opciones: ['activo', 'inactivo', 'retirado', 'graduado'].map(x => ({ v: x, t: x })) }
    : { name: 'id_salon', label: 'Salón', type: 'select', req: 1, full: 1,
        opciones: opciones(salones, 'id_salon', 'nombre').map((o, i) => i === 0 ? o : { v: o.v, t: o.t }) },
  { sep: 'Acudiente (si el documento ya existe, se reutiliza)' },
  { name: 'ac_documento', label: 'Documento del acudiente', req: 1, ro: edit },
  { name: 'ac_telefono', label: 'Teléfono' },
  { name: 'ac_nombres', label: 'Nombres', req: 1 },
  { name: 'ac_apellidos', label: 'Apellidos', req: 1 },
  { name: 'ac_correo', label: 'Correo', type: 'email', full: 1 }
];

PAGINAS.estudiantes = async () => {
  const salones = await api('/salones');
  const salonesOp = salones.map(s => ({ id_salon: s.id_salon, nombre: `${s.nombre} (${s.anio_lectivo}) · ${s.cupos_disponibles} cupos` }));
  await lista({
    titulo: 'Estudiantes', sub: 'Registro y consulta de estudiantes', nuevo: 'Registrar estudiante',
    cargar: () => api('/estudiantes'),
    cols: [{ t: 'Documento', f: r => esc(r.documento) }, { t: 'Nombre', f: nombreCompleto }, { t: 'Salón', f: r => esc(r.salon || '—') },
      { t: 'Estado', f: r => badge(r.estado) }, { t: 'Cuenta', f: r => badge(r.cuenta) }],
    filtros: [
      { label: 'Todos los salones', opciones: [...new Set(salones.map(s => s.nombre))], test: (r, v) => r.salon === v },
      { label: 'Toda cuenta', opciones: ['pendiente', 'activo', 'inactivo'], test: (r, v) => r.cuenta === v }],
    acciones: r => btnAcc('ver', 'Ver') + btnAcc('editar', 'Editar') +
      (r.cuenta === 'pendiente' ? btnAcc('cuenta', 'Crear cuenta', 'ok') : '') +
      (r.estado === 'activo' ? btnAcc('toggle', 'Desactivar', 'mal') : btnAcc('toggle', 'Activar', 'ok')),
    onNuevo: recargar => formulario({
      titulo: 'Registrar estudiante', campos: camposEstudiante(false, salonesOp),
      guardar: async v => { await api('/estudiantes', { method: 'POST', body: v }); toast('Estudiante registrado. Su cuenta queda Pendiente.'); recargar(); }
    }),
    onAccion: async (a, r, recargar) => {
      const id = r.id_estudiante;
      if (a === 'ver') return ventana(`${esc(r.nombres)} ${esc(r.apellidos)}`, htmlFicha(await api(`/estudiantes/${id}/ficha`)));
      if (a === 'editar') {
        const d = await api('/estudiantes/' + id);
        return formulario({ titulo: 'Editar estudiante', campos: camposEstudiante(true, salonesOp), valores: d,
          guardar: async v => { await api('/estudiantes/' + id, { method: 'PUT', body: v }); toast('Estudiante actualizado'); recargar(); } });
      }
      if (a === 'cuenta') return formulario({
        titulo: `Crear cuenta de acceso para ${esc(r.nombres)}`, texto: 'Crear cuenta',
        campos: [{ name: 'correo', label: 'Correo de acceso', type: 'email', req: 1, full: 1 },
          { name: 'password', label: 'Contraseña inicial (mínimo 6 caracteres)', type: 'password', req: 1, full: 1 }],
        guardar: async v => { await api(`/estudiantes/${id}/cuenta`, { method: 'POST', body: v }); toast('Cuenta creada y activa'); recargar(); }
      });
      if (a === 'toggle') {
        await api(`/estudiantes/${id}/estado`, { method: 'PATCH', body: { estado: r.estado === 'activo' ? 'inactivo' : 'activo' } });
        toast(r.estado === 'activo' ? 'Estudiante desactivado' : 'Estudiante activado'); recargar();
      }
    }
  });
};

/* --- Docentes --- */
const camposDocente = [
  { name: 'documento', label: 'Documento', req: 1 }, { name: 'especialidad', label: 'Especialidad' },
  { name: 'nombres', label: 'Nombres', req: 1 }, { name: 'apellidos', label: 'Apellidos', req: 1 },
  { name: 'telefono', label: 'Teléfono' }, { name: 'correo', label: 'Correo (será su usuario)', type: 'email', req: 1 }
];

PAGINAS.docentes = async () => {
  await lista({
    titulo: 'Docentes', sub: 'Registro y consulta de docentes', nuevo: 'Registrar docente',
    cargar: () => api('/docentes'),
    cols: [{ t: 'Documento', f: r => esc(r.documento) }, { t: 'Nombre', f: nombreCompleto }, { t: 'Especialidad', f: r => esc(r.especialidad || '—') },
      { t: 'Correo', f: r => esc(r.correo) }, { t: 'Cuenta', f: r => badge(r.cuenta) }],
    filtros: [{ label: 'Toda cuenta', opciones: ['pendiente', 'activo', 'inactivo'], test: (r, v) => r.cuenta === v }],
    acciones: r => btnAcc('ver', 'Ver cursos') + btnAcc('editar', 'Editar') +
      (r.cuenta === 'pendiente' ? btnAcc('cuenta', 'Crear cuenta', 'ok')
        : r.cuenta === 'activo' ? btnAcc('toggle', 'Desactivar', 'mal') : btnAcc('toggle', 'Activar', 'ok')),
    onNuevo: recargar => formulario({
      titulo: 'Registrar docente', campos: camposDocente,
      guardar: async v => { await api('/docentes', { method: 'POST', body: v }); toast('Docente registrado. Su cuenta queda Pendiente.'); recargar(); }
    }),
    onAccion: async (a, r, recargar) => {
      const id = r.id_docente;
      if (a === 'ver') {
        const c = await api(`/docentes/${id}/cursos`);
        return ventana(`Cursos de ${esc(r.nombres)} ${esc(r.apellidos)}`, c.length
          ? tab(['Salón', 'Asignatura', 'Período', 'Aula', 'Estudiantes'], c.map(x => [esc(x.salon), esc(x.asignatura), esc(x.periodo), esc(x.aula || '—'), x.matriculados]))
          : '<p class="empty">Este docente no tiene cursos asignados. Asígnale uno en el módulo Cursos.</p>');
      }
      if (a === 'editar') return formulario({ titulo: 'Editar docente', campos: camposDocente, valores: await api('/docentes/' + id),
        guardar: async v => { await api('/docentes/' + id, { method: 'PUT', body: v }); toast('Docente actualizado'); recargar(); } });
      if (a === 'cuenta') return formulario({
        titulo: `Crear cuenta para ${esc(r.nombres)}`, texto: 'Crear cuenta',
        campos: [{ name: 'usuario', label: 'Usuario (correo del docente)', ro: 1, full: 1 },
          { name: 'password', label: 'Contraseña inicial (mínimo 6 caracteres)', type: 'password', req: 1, full: 1 }],
        valores: { usuario: r.correo },
        guardar: async v => { await api(`/docentes/${id}/cuenta`, { method: 'POST', body: { password: v.password } }); toast('Cuenta creada y activa'); recargar(); }
      });
      if (a === 'toggle') {
        await api(`/docentes/${id}/activo`, { method: 'PATCH', body: { activo: r.cuenta !== 'activo' } });
        toast(r.cuenta === 'activo' ? 'Cuenta desactivada' : 'Cuenta activada'); recargar();
      }
    }
  });
};

/* --- Salones --- */
PAGINAS.salones = async () => {
  const cat = await api('/catalogos');
  const campos = [
    { name: 'id_sede', label: 'Sede', type: 'select', req: 1, opciones: opciones(cat.sedes, 'id_sede', 'nombre') },
    { name: 'id_grado', label: 'Grado', type: 'select', req: 1, opciones: opciones(cat.grados, 'id_grado', 'nombre') },
    { name: 'grupo', label: 'Grupo (A, B, C...)', req: 1 },
    { name: 'anio_lectivo', label: 'Año lectivo', type: 'number', req: 1, def: new Date().getFullYear() },
    { name: 'cupo_maximo', label: 'Cupo máximo', type: 'number', req: 1, def: 30, min: 1 },
    { name: 'id_director_grupo', label: 'Director de grupo', type: 'select', opciones: opciones(cat.docentes, 'id_docente', 'nombre', 'Sin director') }
  ];
  await lista({
    titulo: 'Salones', sub: 'Un salón es un grado y grupo en una sede durante un año lectivo', nuevo: 'Nuevo salón',
    cargar: () => api('/salones'),
    cols: [{ t: 'Salón', f: r => `<b>${esc(r.nombre)}</b>` }, { t: 'Año', f: r => r.anio_lectivo }, { t: 'Sede', f: r => esc(r.sede) },
      { t: 'Director de grupo', f: r => esc(r.director_grupo || '—') }, { t: 'Estudiantes', f: r => `${r.total_estudiantes} / ${r.cupo_maximo}` }],
    filtros: [{ label: 'Todos los años', opciones: [...new Set(cat.salones.map(s => s.anio_lectivo))], test: (r, v) => String(r.anio_lectivo) === v }],
    acciones: () => btnAcc('ver', 'Ver estudiantes') + btnAcc('editar', 'Editar'),
    onNuevo: recargar => formulario({ titulo: 'Nuevo salón', campos,
      guardar: async v => { await api('/salones', { method: 'POST', body: v }); toast('Salón creado'); recargar(); } }),
    onAccion: async (a, r, recargar) => {
      if (a === 'ver') {
        const e = await api(`/salones/${r.id_salon}/estudiantes`);
        return ventana(`Estudiantes de ${esc(r.nombre)}`, e.length
          ? tab(['Documento', 'Nombre', 'Estado'], e.map(x => [esc(x.documento), nombreCompleto(x), badge(x.estado_estudiante)]))
          : '<p class="empty">Este salón aún no tiene estudiantes.</p>');
      }
      formulario({ titulo: 'Editar salón', campos, valores: r,
        guardar: async v => { await api('/salones/' + r.id_salon, { method: 'PUT', body: v }); toast('Salón actualizado'); recargar(); } });
    }
  });
};

/* --- Asignaturas --- */
PAGINAS.asignaturas = async () => {
  const campos = [{ name: 'nombre', label: 'Nombre', req: 1, full: 1 }, { name: 'descripcion', label: 'Descripción', full: 1 },
    { name: 'intensidad_horaria', label: 'Intensidad horaria (horas por semana)', type: 'number', min: 1, full: 1 }];
  await lista({
    titulo: 'Asignaturas', sub: 'Materias que ofrece la institución', nuevo: 'Nueva asignatura',
    cargar: () => api('/asignaturas'),
    cols: [{ t: 'Nombre', f: r => `<b>${esc(r.nombre)}</b>` }, { t: 'Descripción', f: r => esc(r.descripcion || '—') },
      { t: 'Horas por semana', f: r => r.intensidad_horaria ?? '—' }],
    acciones: () => btnAcc('editar', 'Editar'),
    onNuevo: recargar => formulario({ titulo: 'Nueva asignatura', campos,
      guardar: async v => { await api('/asignaturas', { method: 'POST', body: v }); toast('Asignatura creada'); recargar(); } }),
    onAccion: (a, r, recargar) => formulario({ titulo: 'Editar asignatura', campos, valores: r,
      guardar: async v => { await api('/asignaturas/' + r.id_asignatura, { method: 'PUT', body: v }); toast('Asignatura actualizada'); recargar(); } })
  });
};

/* --- Cursos (asignatura + salón + período + docente) --- */
PAGINAS.cursos = async () => {
  const cat = await api('/catalogos');
  const docenteOp = { name: 'id_docente', label: 'Docente', type: 'select', req: 1, opciones: opciones(cat.docentes, 'id_docente', 'nombre') };
  const comunes = [{ name: 'aula', label: 'Aula' }, { name: 'cupo_maximo', label: 'Cupo máximo', type: 'number', def: 30, min: 1 }];
  const camposNuevo = [
    { name: 'id_asignatura', label: 'Asignatura', type: 'select', req: 1, opciones: opciones(cat.asignaturas, 'id_asignatura', 'nombre') },
    docenteOp,
    { name: 'id_periodo_academico', label: 'Período académico', type: 'select', req: 1, opciones: opciones(cat.periodos, 'id_periodo', 'nombre') },
    { name: 'id_salon', label: 'Salón', type: 'select', req: 1, opciones: opciones(cat.salones.map(s => ({ ...s, t: `${s.nombre} (${s.anio_lectivo})` })), 'id_salon', 't') },
    ...comunes];
  const rows0 = await api('/cursos');
  await lista({
    titulo: 'Cursos', sub: 'Un curso es una asignatura dictada a un salón, por un docente, en un período', nuevo: 'Nuevo curso',
    cargar: () => api('/cursos'),
    cols: [{ t: 'Asignatura', f: r => `<b>${esc(r.asignatura)}</b>` }, { t: 'Salón', f: r => esc(r.salon) }, { t: 'Período', f: r => esc(r.periodo) },
      { t: 'Docente', f: r => esc(r.docente) }, { t: 'Aula', f: r => esc(r.aula || '—') }, { t: 'Matriculados', f: r => `${r.matriculados} / ${r.cupo_maximo}` }],
    filtros: [{ label: 'Todos los salones', opciones: [...new Set(rows0.map(r => r.salon))], test: (r, v) => r.salon === v },
      { label: 'Todos los períodos', opciones: [...new Set(rows0.map(r => r.periodo))], test: (r, v) => r.periodo === v }],
    acciones: () => btnAcc('editar', 'Editar'),
    onNuevo: recargar => formulario({ titulo: 'Nuevo curso', campos: camposNuevo,
      guardar: async v => { await api('/cursos', { method: 'POST', body: v }); toast('Curso creado'); recargar(); } }),
    onAccion: (a, r, recargar) => formulario({ titulo: `Editar ${esc(r.asignatura)} · ${esc(r.salon)}`, campos: [docenteOp, ...comunes], valores: r,
      guardar: async v => { await api('/cursos/' + r.id_curso, { method: 'PUT', body: v }); toast('Curso actualizado'); recargar(); } })
  });
};

/* --- Selector de curso (lo usan Matrículas, Calificaciones y Asistencias) --- */
const selCurso = cursos => `<select id="curso">${cursos.length ? '' : '<option value="">No hay cursos</option>'}${cursos.map(c =>
  `<option value="${c.id_curso}" ${String(c.id_curso) === String(cursoSel) ? 'selected' : ''}>${esc(c.salon)} · ${esc(c.asignatura)} · ${esc(c.periodo)}</option>`).join('')}</select>`;

function usarCurso(cb) {
  const s = $('#curso');
  if (!s.value) { $('#tabla').innerHTML = '<p class="empty">No hay cursos disponibles.</p>'; return; }
  const go = () => { cursoSel = s.value; cb(s.value); };
  s.onchange = go; go();
}

/* --- Matrículas --- */
PAGINAS.matriculas = async () => {
  const cursos = await api('/docencia/cursos');
  main.innerHTML = cabecera('Matrículas', 'Cada matrícula une a un estudiante con un curso de su salón') +
    `<div class="panel"><div class="tools">${selCurso(cursos)}
    <button class="btn" id="mat1">+ Matricular estudiante</button><button class="btn sec" id="matTodos">Matricular todo el salón</button></div>
    <div id="tabla"></div></div>`;

  const pintar = async () => {
    try {
      const rows = await api('/matriculas?id_curso=' + cursoSel);
      $('#tabla').innerHTML = rows.length
        ? tab(['Documento', 'Estudiante', 'Fecha', 'Estado', ''], rows.map(m => [esc(m.documento), nombreCompleto(m), esc(m.fecha_matricula.slice(0, 10)), badge(m.estado),
            `<button class="link ${m.estado === 'activa' ? 'mal' : 'ok'}" data-id="${m.id_matricula}" data-estado="${m.estado === 'activa' ? 'retirada' : 'activa'}">${m.estado === 'activa' ? 'Retirar' : 'Reactivar'}</button>`]))
        : '<p class="empty">Este curso aún no tiene matrículas.</p>';
    } catch (e) { toast(e.message, true); }
  };
  usarCurso(pintar);

  $('#tabla').onclick = async e => {
    const b = e.target.closest('[data-id]'); if (!b) return;
    try { await api('/matriculas/' + b.dataset.id, { method: 'PATCH', body: { estado: b.dataset.estado } }); pintar(); }
    catch (err) { toast(err.message, true); }
  };
  $('#mat1').onclick = async () => {
    try {
      const el = await api('/matriculas/elegibles/' + cursoSel);
      if (!el.length) return toast('Todos los estudiantes del salón ya están matriculados en este curso', true);
      formulario({ titulo: 'Matricular estudiante', texto: 'Matricular',
        campos: [{ name: 'id_estudiante', label: 'Estudiante del salón', type: 'select', req: 1, full: 1,
          opciones: opciones(el.map(x => ({ id: x.id_estudiante, t: `${x.apellidos} ${x.nombres}` })), 'id', 't') }],
        guardar: async v => { await api('/matriculas', { method: 'POST', body: { id_estudiante: v.id_estudiante, id_curso: cursoSel } }); toast('Estudiante matriculado'); pintar(); } });
    } catch (err) { toast(err.message, true); }
  };
  $('#matTodos').onclick = async () => {
    if (!confirm('¿Matricular a todos los estudiantes del salón en este curso?')) return;
    try {
      const r = await api('/matriculas/salon', { method: 'POST', body: { id_curso: cursoSel } });
      toast(`${r.matriculados} estudiantes matriculados${r.aviso ? '. Aviso: ' + r.aviso : ''}`, !!r.aviso); pintar();
    } catch (err) { toast(err.message, true); }
  };
};

/* =====================================================================
   ADMINISTRADOR Y DOCENTE: calificaciones y asistencias
   ===================================================================== */
PAGINAS.calificaciones = async () => {
  const cursos = await api('/docencia/cursos');
  main.innerHTML = cabecera('Calificaciones', 'Notas de 0.0 a 5.0. La nota definitiva se pondera con el porcentaje de cada evaluación.') +
    `<div class="panel"><div class="tools">${selCurso(cursos)}</div><div id="tabla"></div></div>`;
  let datos = [];

  const pintar = async () => {
    try {
      datos = await api(`/docencia/cursos/${cursoSel}/notas`);
      $('#tabla').innerHTML = datos.length
        ? tab(['Estudiante', 'Evaluaciones (clic para editar)', '% evaluado', 'Definitiva', ''], datos.map((e, i) => [
            nombreCompleto(e),
            e.notas.map(n => `<button class="chip ${n.calificacion < 3 ? 'bad' : ''}" data-i="${i}" data-nota="${n.id_nota}">${esc(n.descripcion_evaluacion)} · ${n.calificacion} (${n.porcentaje}%)</button>`).join('') || '<span class="muted">Sin notas</span>',
            e.porcentaje_evaluado + '%', nt(e.nota_definitiva), `<button class="link ok" data-add="${i}">+ Nota</button>`]))
        : '<p class="empty">Este curso no tiene estudiantes matriculados. Matricúlalos en el módulo Matrículas.</p>';
    } catch (e) { toast(e.message, true); }
  };

  const formNota = (est, n) => formulario({
    titulo: `${n ? 'Editar' : 'Nueva'} nota · ${esc(est.nombres)} ${esc(est.apellidos)}`,
    campos: [{ name: 'descripcion_evaluacion', label: 'Evaluación (ej. Parcial 1)', req: 1, full: 1 },
      { name: 'porcentaje', label: 'Porcentaje (%)', type: 'number', req: 1, min: 1, max: 100, step: '0.01' },
      { name: 'calificacion', label: 'Nota (0 a 5)', type: 'number', req: 1, min: 0, max: 5, step: '0.1' },
      { name: 'fecha', label: 'Fecha', type: 'date', req: 1, full: 1 }],
    valores: n || { fecha: hoy() },
    eliminar: n && (async () => {
      if (!confirm('¿Eliminar esta nota?')) return false;
      try { await api('/docencia/notas/' + n.id_nota, { method: 'DELETE' }); toast('Nota eliminada'); pintar(); return true; }
      catch (err) { toast(err.message, true); return false; }
    }),
    guardar: async v => {
      if (n) await api('/docencia/notas/' + n.id_nota, { method: 'PUT', body: v });
      else await api('/docencia/notas', { method: 'POST', body: { ...v, id_matricula: est.id_matricula } });
      toast('Nota guardada'); pintar();
    }
  });

  usarCurso(pintar);
  $('#tabla').onclick = e => {
    const a = e.target.closest('[data-add]'), c = e.target.closest('[data-nota]');
    if (a) formNota(datos[a.dataset.add]);
    if (c) { const est = datos[c.dataset.i]; formNota(est, est.notas.find(n => n.id_nota == c.dataset.nota)); }
  };
};

PAGINAS.asistencias = async () => {
  const cursos = await api('/docencia/cursos');
  main.innerHTML = cabecera('Asistencias', 'Registra la asistencia de un curso en una fecha') +
    `<div class="panel"><div class="tools">${selCurso(cursos)}<input type="date" id="fechaA" value="${hoy()}">
    <button class="btn" id="guardarA">Guardar asistencia</button></div><div id="tabla"></div></div>`;

  const pintar = async () => {
    const f = $('#fechaA').value;
    if (!cursoSel || !f) return;
    try {
      const rows = await api(`/docencia/cursos/${cursoSel}/asistencia?fecha=${f}`);
      $('#tabla').innerHTML = rows.length
        ? tab(['Estudiante', 'Asistencia'], rows.map(r => [nombreCompleto(r),
            `<select data-m="${r.id_matricula}">${['presente', 'ausente', 'tarde', 'excusa'].map(x =>
              `<option ${x === (r.estado || 'presente') ? 'selected' : ''}>${x}</option>`).join('')}</select>${r.estado ? '' : ' <small class="muted">sin registrar</small>'}`]))
        : '<p class="empty">Este curso no tiene estudiantes matriculados.</p>';
    } catch (e) { toast(e.message, true); }
  };
  usarCurso(pintar);
  $('#fechaA').onchange = pintar;
  $('#guardarA').onclick = async () => {
    try {
      await api(`/docencia/cursos/${cursoSel}/asistencia`, { method: 'POST', body: {
        fecha: $('#fechaA').value,
        registros: [...document.querySelectorAll('[data-m]')].map(s => ({ id_matricula: +s.dataset.m, estado: s.value })) } });
      toast('Asistencia guardada'); pintar();
    } catch (e) { toast(e.message, true); }
  };
};

/* --- Usuarios --- */
PAGINAS.usuarios = async () => {
  await lista({
    titulo: 'Usuarios', sub: 'Cuentas de acceso al sistema. Las cuentas nuevas se crean desde Estudiantes y Docentes.',
    cargar: () => api('/usuarios'),
    cols: [{ t: 'Correo', f: r => esc(r.correo) }, { t: 'Persona', f: r => esc(r.persona) }, { t: 'Rol', f: r => ROLES[r.rol] },
      { t: 'Estado', f: r => badge(r.activo ? 'activo' : 'inactivo') }, { t: 'Último acceso', f: r => esc(r.ultimo_acceso || 'Nunca') }],
    filtros: [{ label: 'Todos los roles', opciones: Object.values(ROLES), test: (r, v) => ROLES[r.rol] === v }],
    acciones: r => btnAcc('clave', 'Cambiar contraseña') + (r.es_yo ? '' : r.activo ? btnAcc('toggle', 'Desactivar', 'mal') : btnAcc('toggle', 'Activar', 'ok')),
    onAccion: async (a, r, recargar) => {
      if (a === 'toggle') { await api(`/usuarios/${r.id_usuario}/activo`, { method: 'PATCH', body: { activo: !r.activo } }); toast('Estado actualizado'); recargar(); }
      if (a === 'clave') formulario({ titulo: 'Cambiar contraseña de ' + esc(r.correo), texto: 'Cambiar',
        campos: [{ name: 'password', label: 'Nueva contraseña (mínimo 6 caracteres)', type: 'password', req: 1, full: 1 }],
        guardar: async v => { await api(`/usuarios/${r.id_usuario}/password`, { method: 'PATCH', body: v }); toast('Contraseña actualizada'); } });
    }
  });
};

/* =====================================================================
   DOCENTE
   ===================================================================== */
PAGINAS.miscursos = async () => {
  const c = await api('/docencia/cursos');
  main.innerHTML = cabecera(`¡Bienvenido, ${esc(sesion.nombre.split(' ')[0])}!`, 'Estos son los cursos que tienes asignados.') +
    `<div class="panel">${c.length ? tab(['Salón', 'Asignatura', 'Período', 'Aula', 'Estudiantes', ''], c.map(x => [esc(x.salon), `<b>${esc(x.asignatura)}</b>`, esc(x.periodo), esc(x.aula || '—'), x.matriculados,
      `<button class="link" data-curso="${x.id_curso}" data-ir="calificaciones">Notas</button><button class="link" data-curso="${x.id_curso}" data-ir="asistencias">Asistencia</button>`]))
      : '<p class="empty">Aún no tienes cursos asignados. Comunícate con el administrador.</p>'}</div>`;
  main.onclick = e => { const b = e.target.closest('[data-ir]'); if (b) { cursoSel = b.dataset.curso; ir(b.dataset.ir); } };
};

/* =====================================================================
   ESTUDIANTE (solo ve su propia información)
   ===================================================================== */
PAGINAS.info = async () => {
  const f = await api('/yo/ficha');
  main.innerHTML = cabecera(`¡Bienvenido, ${esc(sesion.nombre.split(' ')[0])}!`, 'Tus datos registrados en la institución') +
    `<div class="panel">${htmlFicha(f, ['datos'])}</div>`;
};
PAGINAS.notas = async () => {
  const f = await api('/yo/ficha');
  main.innerHTML = cabecera('Mis calificaciones', 'Escala de 0.0 a 5.0. Se aprueba con 3.0 o más.') + `<div class="panel">${htmlFicha(f, ['notas'])}</div>`;
};
PAGINAS.asist = async () => {
  const f = await api('/yo/ficha');
  main.innerHTML = cabecera('Mi asistencia', 'Resumen por asignatura') + `<div class="panel">${htmlFicha(f, ['asist'])}</div>`;
};

iniciar();
