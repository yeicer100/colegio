const m = require('mysql2/promise');
(async () => {
  try {
    const c = await m.createConnection({ host: '127.0.0.1', port: 3306, user: 'colegio_web', password: 'Colegio2026', database: 'colegio' });
    const [r] = await c.query('SELECT VERSION() AS version, CURRENT_USER() AS usuario');
    console.log('CONECTADO:', JSON.stringify(r[0]));
  } catch (e) { console.log('FALLO:', e.code, '-', e.message); }
  process.exit(0);
})();
