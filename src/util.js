const h = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const err = (status, msg) => Object.assign(new Error(msg), { status });
const requerir = (obj, ...campos) => {
  for (const c of campos) {
    if (obj[c] === undefined || obj[c] === null || String(obj[c]).trim() === '')
      throw err(400, `Falta el campo: ${c}`);
  }
};
// Texto limpio o null si viene vacío
const t = v => (v === undefined || v === null || String(v).trim() === '') ? null : String(v).trim();
module.exports = { h, err, requerir, t };
