# EduGest · Sistema de Gestión de una Institución Educativa

Frontend (HTML/CSS/JS) → Backend (Node.js + Express) → MySQL (base `colegio`, sin modificarla).

## Cómo ejecutarlo
1. Ejecuta tu script SQL completo en MySQL 8 (crea la BD `colegio`, el usuario `colegio_web` y los datos de ejemplo).
2. Copia `.env.example` a `.env` y revisa la clave de `DB_PASSWORD`.
3. `npm install`
4. `npm run seed`  → asigna la contraseña `123456` a los usuarios de ejemplo (tu SQL trae un hash de relleno).
5. `npm start` → abre http://localhost:3000

## Usuarios de ejemplo (clave 123456)
| Rol | Correo |
|---|---|
| Administrador | admin@colegio.edu.co |
| Docente | ana@gmail.com |
| Estudiante | juan@colegio.edu.co |

## Estructura
- `server.js` · rutas y control de roles
- `src/db.js` · conexión MySQL y transacciones
- `src/auth.js` · login (JWT) y verificación de rol
- `src/routes/` · una ruta por módulo
- `public/` · pantallas (index.html, css, js/app.js)
