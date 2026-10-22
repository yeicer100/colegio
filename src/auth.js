const jwt = require('jsonwebtoken');
const pool = require('./db');
const SECRET = process.env.JWT_SECRET || 'secreto_de_desarrollo';

const firmar = u => jwt.sign({ id_usuario: u.id_usuario }, SECRET, { expiresIn: '8h' });

// 1) Verifica el token  2) revisa en la BD que la cuenta siga activa
async function auth(req, res, next) {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    const p = jwt.verify(token, SECRET);
    const [[u]] = await pool.query(
      'SELECT id_usuario, correo, rol, id_docente, id_estudiante, activo FROM usuario WHERE id_usuario = ?',
      [p.id_usuario]);
    if (!u || !u.activo) return res.status(401).json({ error: 'Tu sesión ya no es válida' });
    req.user = u;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Debes iniciar sesión' });
  }
}

// Control por rol: rol('admin') o rol('admin','docente')
const rol = (...permitidos) => (req, res, next) =>
  permitidos.includes(req.user.rol)
    ? next()
    : res.status(403).json({ error: 'No tienes permiso para esta acción' });

module.exports = { firmar, auth, rol };
