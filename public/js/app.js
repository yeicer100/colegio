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
    ['calificaciones', 'Calificaciones', 'file'], ['asistencias', 'Asistencias', 'cal'], ['usuarios', 'Usuarios', 'lock']],
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
  clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 4500);
}

const badge = e => `<span class="badge ${esc(e)}">${esc(e.charAt(0).toUpperCase() + e.slice(1))}</span>`;
const nt = n => n == null ? '—' : `<b class="${n < 3 ? 'bad' : 'good'}">${n}</b>`;
const nombreCompleto = r => `${esc(r.apellidos)} ${esc(r.nombres)}`;
const unicos = (arr, k) => [...new Map(arr.map(x => [x[k], x])).values()];
const opciones = (arr, v, t, vacio = 'Seleccione...') => [{ v: '', t: vacio }, ...arr.map(x => ({ v: x[v], t: x[t] }))];
const cabecera = (titulo, sub, extra = '') =>
  `<div class="head"><div><h1>${titulo}</h1><p class="muted">${sub}</p></div>${extra}</div>`;
const tab = (heads, filas) =>
  `<div class="tw"><table><thead><tr>${heads.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${
    filas.map(f => `<tr>${f.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
// Salones del año más reciente, ordenados por grado y grupo (6A, 6B, 6C, 7A...)
const salonesActuales = salones => {
  const anio = Math.max(...salones.map(s => s.anio_lectivo));
  return salones.filter(s => s.anio_lectivo === anio).sort((a, b) => a.nivel - b.nivel || String(a.grupo).localeCompare(String(b.grupo)));
};

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
  ir(MENUS[sesion.rol][0][0]);
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
function htmlFicha(f, sec = ['datos', 'materias', 'notas', 'asist']) {
  const d = f.datos, dt = (a, b) => `<div><small>${a}</small><b>${esc(b || '—')}</b></div>`;
  let x = '';
  if (sec.includes('datos')) x += `<div class="info">${dt('Documento', d.documento)}${dt('Nombre', d.nombres + ' ' + d.apellidos)}
    ${dt('Fecha de nacimiento', d.fecha_nacimiento)}${dt('Salón', d.salon)}${dt('Teléfono', d.telefono)}${dt('Dirección', d.direccion)}
    ${dt('Estado', d.estado)}${dt('Acudiente', d.ac_nombres + ' ' + d.ac_apellidos)}${dt('Tel. acudiente', d.ac_telefono)}
    ${dt('Correo acudiente', d.ac_correo)}</div>`;
  if (sec.includes('materias')) {
    x += `<h4 class="sub">${f.tituloMaterias || 'Materias'}</h4>` + (f.materias.length
      ? tab(['Materia', 'Docente', 'Período', 'Aula'], f.materias.map(m => [`<b>${esc(m.asignatura)}</b>`, esc(m.docente), esc(m.periodo), esc(m.aula || '—')]))
      : '<p class="empty">Aún no está matriculado en ninguna materia.</p>');
  }
  if (sec.includes('notas')) {
    x += '<h4 class="sub">Boletín: nota definitiva por materia</h4>' + (f.boletin.length
      ? tab(['Materia', 'Período', 'Nota definitiva'],
          f.boletin.map(b => [esc(b.asignatura), esc(b.periodo), nt(b.nota_definitiva)]))
      : '<p class="empty">No hay materias para este período.</p>');
    x += '<h4 class="sub">Detalle de evaluaciones</h4>' + (f.notas.length
      ? tab(['Materia', 'Nota', 'Calificación', 'Fecha'],
          f.notas.map(n => [esc(n.asignatura), esc(n.descripcion_evaluacion), nt(n.calificacion), esc(n.fecha)]))
      : '<p class="empty">Aún no hay calificaciones registradas.</p>');
  }
  if (sec.includes('asist')) {
    x += '<h4 class="sub">Asistencia por materia</h4>' + (f.asistencia.length
      ? tab(['Materia', 'Registrados', 'Presente', 'Ausente', 'Tarde', 'Excusa', '% asistencia'],
          f.asistencia.map(a => [esc(a.asignatura), a.dias_registrados, a.dias_presente ?? 0, a.dias_ausente ?? 0,
            a.dias_tarde ?? 0, a.dias_excusa ?? 0, a.porcentaje_asistencia == null ? '—' : a.porcentaje_asistencia + '%']))
      : '<p class="empty">Aún no hay matrículas.</p>');
  }
  return x;
}

/* =====================================================================
   ADMINISTRADOR
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

/* --- Estudiantes: organizados por grado y salón --- */
const camposEstudiante = (edit, salonesOp) => [
  { name: 'documento', label: 'Documento', req: 1 },
  { name: 'fecha_nacimiento', label: 'Fecha de nacimiento', type: 'date', req: 1 },
  { name: 'nombres', label: 'Nombres', req: 1 },
  { name: 'apellidos', label: 'Apellidos', req: 1 },
  { name: 'telefono', label: 'Teléfono' },
  { name: 'direccion', label: 'Dirección' },
  edit
    ? { name: 'estado', label: 'Estado', type: 'select', full: 1, opciones: ['activo', 'inactivo', 'retirado', 'graduado'].map(x => ({ v: x, t: x })) }
    : { name: 'id_salon', label: 'Grado y grupo (salón)', type: 'select', req: 1, full: 1, opciones: opciones(salonesOp, 'id_salon', 'nombre') },
  { sep: 'Acudiente (si el documento ya existe, se reutiliza)' },
  { name: 'ac_documento', label: 'Documento del acudiente', req: 1, ro: edit },
  { name: 'ac_telefono', label: 'Teléfono' },
  { name: 'ac_nombres', label: 'Nombres', req: 1 },
  { name: 'ac_apellidos', label: 'Apellidos', req: 1 },
  { name: 'ac_correo', label: 'Correo', type: 'email', full: 1 }
];

async function accionEstudiante(a, r, recargar, salonesOp) {
  const id = r.id_estudiante;
  if (a === 'ver') {
    const f = await api(`/estudiantes/${id}/ficha`);
    f.tituloMaterias = 'Materias en las que está matriculado';
    return ventana(`${esc(r.nombres)} ${esc(r.apellidos)}`, htmlFicha(f));
  }
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

let filtroEst = { grado: '', salon: '', q: '' };

PAGINAS.estudiantes = async () => {
  const [salones, rows] = await Promise.all([api('/salones'), api('/estudiantes')]);
  const sal = salonesActuales(salones);
  const salonesOp = sal.map(s => ({ id_salon: s.id_salon, nombre: `${s.codigo} · ${s.nombre} (${s.cupos_disponibles} cupos libres)` }));
  const grados = unicos(sal, 'nivel');

  main.innerHTML = cabecera('Estudiantes', 'Organizados por grado y salón', '<button class="btn" id="nuevo">+ Registrar estudiante</button>') +
    `<div class="panel"><div class="tools"><input id="q" type="text" placeholder="Buscar por nombre o documento..." value="${esc(filtroEst.q)}">
    <select id="fc"><option value="">Toda cuenta</option><option value="pendiente">Pendiente</option><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select></div>
    <div class="tabs" id="tabsG"></div><div class="tabs sub" id="tabsS"></div><div id="grupos"></div></div>`;

  const grupoHTML = (s, es) => `<section class="grupo"><div class="grupo-h">
    <h3>${esc(s.codigo)} <small>${esc(s.nombre)} · Director de grupo: ${esc(s.director_grupo || 'sin asignar')}</small></h3>
    <span class="muted">${es.length} de ${s.cupo_maximo} estudiantes</span></div>
    ${es.length ? tab(['Documento', 'Nombre', 'Estado', 'Cuenta', ''], es.map(r => [esc(r.documento), nombreCompleto(r), badge(r.estado), badge(r.cuenta),
      `<span class="acc" data-id="${r.id_estudiante}">${btnAcc('ver', 'Ver')}${btnAcc('editar', 'Editar')}${r.cuenta === 'pendiente' ? btnAcc('cuenta', 'Crear cuenta', 'ok') : ''}${
        r.estado === 'activo' ? btnAcc('toggle', 'Desactivar', 'mal') : btnAcc('toggle', 'Activar', 'ok')}</span>`]))
      : '<p class="empty">Este salón aún no tiene estudiantes.</p>'}</section>`;

  const pintar = () => {
    const q = filtroEst.q.toLowerCase(), fc = $('#fc').value;
    const base = rows.filter(r => `${r.documento} ${r.nombres} ${r.apellidos}`.toLowerCase().includes(q) && (!fc || r.cuenta === fc));
    $('#tabsG').innerHTML = `<button data-g="" class="${!filtroEst.grado ? 'on' : ''}">Todos <span>${base.length}</span></button>` +
      grados.map(g => `<button data-g="${g.nivel}" class="${filtroEst.grado == g.nivel ? 'on' : ''}">${esc(g.grado)} <span>${base.filter(r => r.nivel == g.nivel).length}</span></button>`).join('');
    const delGrado = sal.filter(s => !filtroEst.grado || s.nivel == filtroEst.grado);
    $('#tabsS').innerHTML = filtroEst.grado
      ? `<button data-s="" class="${!filtroEst.salon ? 'on' : ''}">Todos los grupos</button>` +
        delGrado.map(s => `<button data-s="${s.id_salon}" class="${filtroEst.salon == s.id_salon ? 'on' : ''}">${esc(s.codigo)} <span>${base.filter(r => r.id_salon == s.id_salon).length}</span></button>`).join('')
      : '';
    const filtrando = q || fc;
    let html = delGrado.filter(s => !filtroEst.salon || s.id_salon == filtroEst.salon).map(s => {
      const es = base.filter(r => r.id_salon == s.id_salon);
      return es.length || (filtroEst.grado && !filtrando) ? grupoHTML(s, es) : '';
    }).join('');
    const sin = base.filter(r => !r.id_salon);
    if (!filtroEst.grado && sin.length) html += grupoHTML({ codigo: 'Sin salón', nombre: 'Estudiantes sin grado asignado', cupo_maximo: '—' }, sin);
    $('#grupos').innerHTML = html || '<p class="empty">No hay estudiantes que coincidan.</p>';
  };

  const recargar = () => PAGINAS.estudiantes();
  $('#q').oninput = e => { filtroEst.q = e.target.value; pintar(); };
  $('#fc').onchange = pintar;
  $('#tabsG').onclick = e => { const b = e.target.closest('[data-g]'); if (b) { filtroEst.grado = b.dataset.g; filtroEst.salon = ''; pintar(); } };
  $('#tabsS').onclick = e => { const b = e.target.closest('[data-s]'); if (b) { filtroEst.salon = b.dataset.s; pintar(); } };
  $('#grupos').onclick = async e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const r = rows.find(x => x.id_estudiante == b.closest('[data-id]').dataset.id);
    try { await accionEstudiante(b.dataset.act, r, recargar, salonesOp); } catch (err) { toast(err.message, true); }
  };
  $('#nuevo').onclick = () => {
    if (!salonesOp.length) return toast('Primero crea los salones en el módulo Salones', true);
    formulario({
      titulo: 'Registrar estudiante', campos: camposEstudiante(false, salonesOp),
      guardar: async v => {
        const r = await api('/estudiantes', { method: 'POST', body: v });
        toast(`Estudiante registrado y matriculado en ${r.matriculas} materias. Su cuenta queda Pendiente.`); recargar();
      }
    });
  };
  pintar();
};

/* --- Docentes: materias que dicta y grupo del que es director --- */
const camposDocente = sal => [
  { name: 'documento', label: 'Documento', req: 1 }, { name: 'especialidad', label: 'Especialidad' },
  { name: 'nombres', label: 'Nombres', req: 1 }, { name: 'apellidos', label: 'Apellidos', req: 1 },
  { name: 'telefono', label: 'Teléfono' }, { name: 'correo', label: 'Correo (será su usuario)', type: 'email', req: 1 },
  { name: 'id_salon_director', label: 'Director de grupo de (opcional)', type: 'select', full: 1,
    opciones: [{ v: '', t: 'No es director de grupo' }, ...sal.map(s => ({ v: s.id_salon, t: `${s.codigo} · ${s.nombre}${s.director_grupo ? ' (hoy: ' + s.director_grupo + ')' : ''}` }))] }
];

// Ventana para indicar qué materias dicta el docente y en qué grupos
async function modalMaterias(d, recargar) {
  const [asig, salones, actuales] = await Promise.all([api('/asignaturas'), api('/salones'), api(`/docentes/${d.id_docente}/asignaciones`)]);
  const sal = salonesActuales(salones);
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<form class="modal ancha"><h3>Materias de ${esc(d.nombres)} ${esc(d.apellidos)}</h3>
    <h4 class="sub" style="margin-top:0">Lo que dicta actualmente</h4>
    ${actuales.length ? tab(['Materia', 'Grupo', 'Períodos'], actuales.map(a => [esc(a.asignatura), `<b>${esc(a.codigo)}</b>`, a.periodos]))
      : '<p class="empty">Todavía no tiene materias asignadas.</p>'}
    <h4 class="sub">Asignar una materia</h4>
    <div class="grid"><label>Materia<select name="id_asignatura" required>${asig.map(a => `<option value="${a.id_asignatura}">${esc(a.nombre)}</option>`).join('')}</select></label>
    <label>Períodos<select name="periodos"><option value="actual">Solo el período actual</option><option value="todos">Todos los períodos del año</option></select></label></div>
    <p class="muted" style="margin-bottom:4px">Marca los grupos donde la dictará:</p>
    ${unicos(sal, 'nivel').map(g => `<div class="fila-grado"><b>${esc(g.grado)}</b>${sal.filter(s => s.nivel === g.nivel).map(s =>
      `<label class="check"><input type="checkbox" name="salon" value="${s.id_salon}"> ${esc(s.codigo)}</label>`).join('')}</div>`).join('')}
    <p class="muted" style="font-size:13px">Los estudiantes del grupo quedan matriculados en la materia automáticamente.</p>
    <p class="err" hidden></p>
    <div class="botones"><button type="button" class="btn sec" data-x>Cerrar</button><button class="btn">Asignar materia</button></div></form>`;
  document.body.appendChild(ov);
  ov.querySelector('[data-x]').onclick = () => { ov.remove(); recargar(); };
  ov.querySelector('form').onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target), p = ov.querySelector('.err');
    try {
      const r = await api(`/docentes/${d.id_docente}/asignaciones`, { method: 'POST', body: {
        id_asignatura: fd.get('id_asignatura'), periodos: fd.get('periodos'), salones: fd.getAll('salon') } });
      toast(`${r.creados} curso(s) asignados${r.omitidos.length ? '. Omitidos: ' + r.omitidos.join('; ') : ''}`, !r.creados && r.omitidos.length > 0);
      ov.remove(); modalMaterias(d, recargar);
    } catch (err) { p.textContent = err.message; p.hidden = false; }
  };
}

PAGINAS.docentes = async () => {
  const sal = salonesActuales(await api('/salones'));
  await lista({
    titulo: 'Docentes', sub: 'Cada docente dicta las materias y grupos que le asignes', nuevo: 'Registrar docente',
    cargar: () => api('/docentes'),
    cols: [{ t: 'Nombre', f: r => `<b>${nombreCompleto(r)}</b><br><small class="muted">${esc(r.especialidad || '')} · ${esc(r.correo)}</small>` },
      { t: 'Materias que dicta', f: r => r.materias ? esc(r.materias) : '<span class="muted">Sin materias asignadas</span>' },
      { t: 'Director de', f: r => r.director_de ? `<b>${esc(r.director_de)}</b>` : '—' },
      { t: 'Cuenta', f: r => badge(r.cuenta) }],
    filtros: [{ label: 'Toda cuenta', opciones: ['pendiente', 'activo', 'inactivo'], test: (r, v) => r.cuenta === v }],
    acciones: r => btnAcc('materias', 'Materias y grupos') + btnAcc('editar', 'Editar') +
      (r.cuenta === 'pendiente' ? btnAcc('cuenta', 'Crear cuenta', 'ok')
        : r.cuenta === 'activo' ? btnAcc('toggle', 'Desactivar', 'mal') : btnAcc('toggle', 'Activar', 'ok')),
    onNuevo: recargar => formulario({
      titulo: 'Registrar docente', campos: camposDocente(sal), texto: 'Guardar y asignar materias',
      guardar: async v => {
        const r = await api('/docentes', { method: 'POST', body: v });
        toast('Docente registrado. Ahora indica qué materias dicta.');
        modalMaterias({ id_docente: r.id, nombres: v.nombres, apellidos: v.apellidos }, recargar);
      }
    }),
    onAccion: async (a, r, recargar) => {
      const id = r.id_docente;
      if (a === 'materias') return modalMaterias(r, recargar);
      if (a === 'editar') return formulario({ titulo: 'Editar docente', campos: camposDocente(sal), valores: await api('/docentes/' + id),
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
    { name: 'grupo', label: 'Grupo (A, B, C o 1, 2, 3)', req: 1 },
    { name: 'anio_lectivo', label: 'Año lectivo', type: 'number', req: 1, def: new Date().getFullYear() },
    { name: 'cupo_maximo', label: 'Cupo máximo', type: 'number', req: 1, def: 30, min: 1 },
    { name: 'id_director_grupo', label: 'Director de grupo', type: 'select', opciones: opciones(cat.docentes, 'id_docente', 'nombre', 'Sin director') }
  ];
  await lista({
    titulo: 'Salones', sub: 'Un salón es un grado y grupo: 6A, 6B, 6C ... 11C', nuevo: 'Nuevo salón',
    cargar: () => api('/salones'),
    cols: [{ t: 'Grupo', f: r => `<b>${esc(r.codigo)}</b>` }, { t: 'Salón', f: r => esc(r.nombre) }, { t: 'Año', f: r => r.anio_lectivo },
      { t: 'Sede', f: r => esc(r.sede) }, { t: 'Director de grupo', f: r => esc(r.director_grupo || '—') },
      { t: 'Estudiantes', f: r => `${r.total_estudiantes} / ${r.cupo_maximo}` }],
    filtros: [{ label: 'Todos los grados', opciones: cat.grados.map(g => g.nombre), test: (r, v) => r.grado === v },
      { label: 'Todos los años', opciones: [...new Set(cat.salones.map(s => s.anio_lectivo))], test: (r, v) => String(r.anio_lectivo) === v }],
    acciones: () => btnAcc('ver', 'Ver estudiantes') + btnAcc('editar', 'Editar'),
    onNuevo: recargar => formulario({ titulo: 'Nuevo salón', campos,
      guardar: async v => { await api('/salones', { method: 'POST', body: v }); toast('Salón creado'); recargar(); } }),
    onAccion: async (a, r, recargar) => {
      if (a === 'ver') {
        const e = await api(`/salones/${r.id_salon}/estudiantes`);
        return ventana(`Estudiantes de ${esc(r.codigo)}`, e.length
          ? tab(['Documento', 'Nombre', 'Estado'], e.map(x => [esc(x.documento), nombreCompleto(x), badge(x.estado_estudiante)]))
          : '<p class="empty">Este salón aún no tiene estudiantes.</p>');
      }
      formulario({ titulo: 'Editar salón ' + esc(r.codigo), campos, valores: r,
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

/* --- Cursos (materia + grupo + período + docente) --- */
PAGINAS.cursos = async () => {
  const cat = await api('/catalogos');
  const salOp = salonesActuales(cat.salones).map(s => ({ id_salon: s.id_salon, t: `${s.codigo} · ${s.nombre}` }));
  const docenteOp = { name: 'id_docente', label: 'Docente', type: 'select', req: 1, opciones: opciones(cat.docentes, 'id_docente', 'nombre') };
  const comunes = [{ name: 'aula', label: 'Aula' }, { name: 'cupo_maximo', label: 'Cupo máximo', type: 'number', def: 30, min: 1 }];
  const camposNuevo = [
    { name: 'id_asignatura', label: 'Materia', type: 'select', req: 1, opciones: opciones(cat.asignaturas, 'id_asignatura', 'nombre') },
    docenteOp,
    { name: 'id_periodo_academico', label: 'Período académico', type: 'select', req: 1, opciones: opciones(cat.periodos, 'id_periodo', 'nombre') },
    { name: 'id_salon', label: 'Grupo', type: 'select', req: 1, opciones: opciones(salOp, 'id_salon', 't') },
    ...comunes];
  const rows0 = await api('/cursos');
  await lista({
    titulo: 'Cursos', sub: 'Un curso es una materia dictada a un grupo, por un docente, en un período', nuevo: 'Nuevo curso',
    cargar: () => api('/cursos'),
    cols: [{ t: 'Grupo', f: r => `<b>${esc(r.codigo)}</b>` }, { t: 'Materia', f: r => esc(r.asignatura) }, { t: 'Período', f: r => esc(r.periodo) },
      { t: 'Docente', f: r => esc(r.docente) }, { t: 'Aula', f: r => esc(r.aula || '—') }, { t: 'Matriculados', f: r => `${r.matriculados} / ${r.cupo_maximo}` }],
    filtros: [{ label: 'Todos los grados', opciones: unicos(rows0, 'nivel').map(r => r.grado), test: (r, v) => r.grado === v },
      { label: 'Todos los grupos', opciones: unicos(rows0, 'id_salon').map(r => r.codigo), test: (r, v) => r.codigo === v },
      { label: 'Todos los períodos', opciones: [...new Set(rows0.map(r => r.periodo))], test: (r, v) => r.periodo === v }],
    acciones: () => btnAcc('editar', 'Editar'),
    onNuevo: recargar => formulario({ titulo: 'Nuevo curso', campos: camposNuevo,
      guardar: async v => { const r = await api('/cursos', { method: 'POST', body: v }); toast(`Curso creado. ${r.matriculados} estudiantes matriculados automáticamente.`); recargar(); } }),
    onAccion: (a, r, recargar) => formulario({ titulo: `Editar ${esc(r.asignatura)} · ${esc(r.codigo)}`, campos: [docenteOp, ...comunes], valores: r,
      guardar: async v => { await api('/cursos/' + r.id_curso, { method: 'PUT', body: v }); toast('Curso actualizado'); recargar(); } })
  });
};

/* --- Selector de curso en cascada: Grado > Grupo > Materia --- */
const selCursoHTML = () => '<select id="selGrado"></select><select id="selSalon"></select><select id="selCurso"></select>';

function cascada(cursos, cb) {
  const g = $('#selGrado'), s = $('#selSalon'), c = $('#selCurso');
  if (!cursos.length) {
    g.hidden = s.hidden = c.hidden = true;
    $('#tabla').innerHTML = '<p class="empty">No hay cursos disponibles. Asigna materias a los docentes en el módulo Docentes.</p>';
    return;
  }
  const actual = cursos.find(x => String(x.id_curso) === String(cursoSel)) || cursos.find(x => x.periodo === periodo?.nombre) || cursos[0];
  const llenarGrados = () => { g.innerHTML = unicos(cursos, 'id_grado').sort((a, b) => a.nivel - b.nivel).map(x => `<option value="${x.id_grado}">${esc(x.grado)}</option>`).join(''); };
  const llenarSalones = () => { s.innerHTML = unicos(cursos.filter(x => x.id_grado == g.value), 'id_salon').map(x => `<option value="${x.id_salon}">${esc(x.codigo)}</option>`).join(''); };
  const llenarCursos = () => {
    const cs = cursos.filter(x => x.id_salon == s.value);
    const pref = cs.find(x => x.periodo === periodo?.nombre);
    c.innerHTML = cs.map(x => `<option value="${x.id_curso}">${esc(x.asignatura)} · ${esc(x.periodo)}</option>`).join('');
    return pref;
  };
  const go = () => { cursoSel = c.value; cb(c.value); };
  llenarGrados(); g.value = actual.id_grado; llenarSalones(); s.value = actual.id_salon; llenarCursos(); c.value = actual.id_curso;
  g.onchange = () => { llenarSalones(); const p = llenarCursos(); if (p) c.value = p.id_curso; go(); };
  s.onchange = () => { const p = llenarCursos(); if (p) c.value = p.id_curso; go(); };
  c.onchange = go;
  go();
}

/* =====================================================================
   ADMINISTRADOR Y DOCENTE: calificaciones y asistencias
   ===================================================================== */
PAGINAS.calificaciones = async () => {
  const cursos = await api('/docencia/cursos');
  main.innerHTML = cabecera('Calificaciones', 'Escribe cada nota de 0.0 a 5.0 en su casilla (máximo 5 por materia). El promedio se calcula solo.') +
    `<div class="panel"><div class="tools">${selCursoHTML()}<button class="btn" id="guardarN">Guardar notas</button></div><div id="tabla"></div></div>`;
  let datos = [];
  const promedio = vals => {
    const v = vals.filter(x => x !== '' && x != null).map(Number);
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length * 10) / 10 : null;
  };

  const pintar = async () => {
    try {
      datos = await api(`/docencia/cursos/${cursoSel}/notas`);
      const n = datos.length ? datos[0].max_notas : 5;
      $('#tabla').innerHTML = datos.length
        ? tab(['Estudiante', ...Array.from({ length: n }, (_, i) => `Nota ${i + 1}`), 'Promedio'], datos.map(e => [
            nombreCompleto(e),
            ...e.slots.map((sl, k) => `<input class="nota ${sl && sl.valor < 3 ? 'bad' : ''}" type="number" min="0" max="5" step="0.1" placeholder="—"
              data-m="${e.id_matricula}" data-k="${k}" data-n="${sl ? sl.id_nota : ''}" value="${sl ? sl.valor : ''}">`),
            `<span data-p="${e.id_matricula}">${nt(e.nota_definitiva)}</span>`]))
        : '<p class="empty">Este curso no tiene estudiantes matriculados.</p>';
    } catch (e) { toast(e.message, true); }
  };

  // El promedio y el color cambian mientras se escribe
  $('#tabla').oninput = e => {
    const i = e.target.closest('.nota'); if (!i) return;
    i.classList.toggle('bad', i.value !== '' && Number(i.value) < 3);
    const vals = [...document.querySelectorAll(`.nota[data-m="${i.dataset.m}"]`)].map(x => x.value);
    document.querySelector(`[data-p="${i.dataset.m}"]`).innerHTML = nt(promedio(vals));
  };

  $('#guardarN').onclick = async () => {
    const porEst = {};
    document.querySelectorAll('.nota').forEach(i => {
      (porEst[i.dataset.m] = porEst[i.dataset.m] || []).push({ id_nota: i.dataset.n ? Number(i.dataset.n) : null, valor: i.value });
    });
    try {
      await api(`/docencia/cursos/${cursoSel}/notas`, { method: 'PUT', body: {
        notas: Object.entries(porEst).map(([m, slots]) => ({ id_matricula: Number(m), slots })) } });
      toast('Notas guardadas'); pintar();
    } catch (err) { toast(err.message, true); }
  };
  cascada(cursos, pintar);
};

PAGINAS.asistencias = async () => {
  const cursos = await api('/docencia/cursos');
  main.innerHTML = cabecera('Asistencias', 'Registra la asistencia de un curso en una fecha') +
    `<div class="panel"><div class="tools">${selCursoHTML()}<input type="date" id="fechaA" value="${hoy()}">
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
  cascada(cursos, pintar);
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
   DOCENTE: solo ve las materias que el administrador le asignó
   ===================================================================== */
PAGINAS.miscursos = async () => {
  const todos = await api('/docencia/cursos');
  const pers = [...new Set(todos.map(x => x.periodo))];
  let per = pers.includes(periodo?.nombre) ? periodo.nombre : (pers[0] || '');
  main.innerHTML = cabecera(`¡Bienvenido, ${esc(sesion.nombre.split(' ')[0])}!`, 'Estas son las materias y grupos que tienes asignados.') +
    `<div class="panel">${todos.length ? `<div class="tools"><select id="per">${pers.map(p => `<option ${p === per ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select></div>` : ''}<div id="tabla"></div></div>`;
  const pintar = () => {
    const c = todos.filter(x => x.periodo === per);
    $('#tabla').innerHTML = c.length
      ? tab(['Grupo', 'Materia', 'Aula', 'Estudiantes', ''], c.map(x => [`<b>${esc(x.codigo)}</b>`, `<b>${esc(x.asignatura)}</b>`, esc(x.aula || '—'), x.matriculados,
          `<button class="link" data-curso="${x.id_curso}" data-ir="calificaciones">Notas</button><button class="link" data-curso="${x.id_curso}" data-ir="asistencias">Asistencia</button>`]))
      : '<p class="empty">Aún no tienes materias asignadas. Comunícate con el administrador.</p>';
  };
  if ($('#per')) $('#per').onchange = e => { per = e.target.value; pintar(); };
  main.onclick = e => { const b = e.target.closest('[data-ir]'); if (b) { cursoSel = b.dataset.curso; ir(b.dataset.ir); } };
  pintar();
};

/* =====================================================================
   ESTUDIANTE: solo ve su propia información
   ===================================================================== */
PAGINAS.info = async () => {
  const f = await api('/yo/ficha');
  const act = f.materias.filter(m => m.periodo === periodo?.nombre);
  f.materias = act.length ? act : f.materias;
  f.tituloMaterias = act.length ? `Mis materias · ${periodo.nombre}` : 'Mis materias';
  main.innerHTML = cabecera(`¡Bienvenido, ${esc(sesion.nombre.split(' ')[0])}!`, 'Tus datos y materias en la institución') +
    `<div class="panel">${htmlFicha(f, ['datos', 'materias'])}</div>`;
};

PAGINAS.notas = async () => {
  const f = await api('/yo/ficha');
  const pers = [...new Set(f.boletin.map(b => b.periodo))];
  let per = pers.includes(periodo?.nombre) ? periodo.nombre : (pers[0] || '');
  main.innerHTML = cabecera('Mis calificaciones', 'Escala de 0.0 a 5.0. Se aprueba con 3.0 o más.') +
    `<div class="panel"><div class="tools"><select id="per">${pers.map(p => `<option ${p === per ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select></div><div id="cuerpo"></div></div>`;
  const pintar = () => {
    const g = { ...f, boletin: f.boletin.filter(b => b.periodo === per), notas: f.notas.filter(n => n.periodo === per) };
    $('#cuerpo').innerHTML = htmlFicha(g, ['notas']);
  };
  $('#per').onchange = e => { per = e.target.value; pintar(); };
  pintar();
};

PAGINAS.asist = async () => {
  const f = await api('/yo/ficha');
  main.innerHTML = cabecera('Mi asistencia', 'Resumen por materia') + `<div class="panel">${htmlFicha(f, ['asist'])}</div>`;
};

iniciar();
