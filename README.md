# EduGest — Proyecto completo conectado a TU base de datos

Sistema de gestión institucional hecho con **HTML + CSS + JavaScript + Node.js + Express + MySQL**.

> La aplicación usa la base de datos **`colegio`** y respeta las tablas y relaciones del script SQL entregado para el proyecto. No crea una base paralela.

## 1. Estructura

- `public/` → interfaz web.
- `src/routes/` → API REST.
- `src/db.js` → conexión a MySQL.
- `src/auth.js` → autenticación JWT y permisos.
- `src/servicios.js` → consultas y operaciones académicas.
- `database/colegio.sql` → script completo de la base de datos entregada.
- `database/extras.sql` → datos opcionales para salones Sexto–Once A/B/C.
- `scripts/seed-passwords.js` → genera el hash bcrypt para las cuentas de ejemplo.

## 2. Si YA tienes la base `colegio` creada

**No ejecutes `database/colegio.sql`**, porque ese script contiene `DROP DATABASE IF EXISTS colegio` al inicio y volvería a crear la base.

Solo configura `.env` con los datos de tu MySQL.

Ejemplo:

```env
PORT=3000
DB_HOST=localhost
DB_USER=colegio_web
DB_PASSWORD=CambiaEstaClave_123
DB_NAME=colegio
JWT_SECRET=pon_aqui_una_clave_larga
MAX_NOTAS=5
```

Si tu usuario de MySQL tiene otra contraseña, coloca la contraseña real.

## 3. Si necesitas crear la base desde cero

En MySQL Workbench ejecuta:

```text
database/colegio.sql
```

Ese archivo contiene la estructura, relaciones, vistas, triggers, procedimientos y datos de ejemplo de la base entregada.

Después, si quieres los salones A/B/C de Sexto a Once:

```text
database/extras.sql
```

## 4. Instalar y ejecutar

Desde esta carpeta:

```bash
npm install
npm run seed
npm start
```

Luego abre:

```text
http://localhost:3000
```

## 5. Usuarios de ejemplo

Después de ejecutar `npm run seed`, las cuentas de ejemplo que tengan el hash marcador del SQL quedan con contraseña:

```text
123456
```

Ejemplos:

```text
admin@colegio.edu.co
ana@gmail.com
juan@colegio.edu.co
```

## 6. Módulo de estudiantes

La pantalla **Estudiantes** obtiene la información desde MySQL mediante:

```text
React/HTML/JS → fetch → Express → MySQL
```

No hay estudiantes escritos a mano en la interfaz.

La consulta relaciona:

```text
estudiante
   ↓
salon_estudiante
   ↓
salon
   ↓
grado
   ↓
docente (director de grupo)
   ↓
usuario (estado de cuenta)
```

Por eso la pantalla puede mostrar el grado, salón, director, estado del estudiante y estado de la cuenta.

## 7. Funciones principales

### Administrador

- Dashboard.
- Registrar, editar, activar y desactivar estudiantes.
- Crear cuentas de estudiantes.
- Registrar y administrar docentes.
- Asignar materias y grupos a docentes.
- Crear y administrar salones.
- Administrar asignaturas.
- Administrar cursos.
- Calificaciones.
- Asistencias.
- Usuarios.

### Docente

- Ver sus cursos.
- Registrar y editar calificaciones.
- Registrar asistencias.

### Estudiante

- Consultar su información.
- Consultar calificaciones.
- Consultar asistencia.

## 8. Importante

La aplicación está preparada para trabajar con **MySQL 8** y con la estructura de la base `colegio` entregada en el proyecto.
