const m = require('mysql2/promise');
(async () => {
  let r;
  try {
    r = await m.createConnection({ host: '127.0.0.1', port: 3306, user: 'root', password: process.env.RP || '' });
  } catch (e) { console.log('ROOT NO ENTRA:', e.code, '-', e.message); process.exit(0); }
  const [[i]] = await r.query('SELECT VERSION() AS version, @@port AS puerto, @@hostname AS equipo');
  console.log('SERVIDOR:', JSON.stringify(i));
  const [bd] = await r.query("SHOW DATABASES LIKE 'colegio'");
  console.log('BASE colegio existe:', bd.length > 0);
  await r.query("DROP USER IF EXISTS 'colegio_web'@'localhost'");
  await r.query("DROP USER IF EXISTS 'colegio_web'@'%'");
  for (const h of ['localhost', '%']) {
    const u = "'colegio_web'@'" + h + "'";
    try { await r.query("CREATE USER " + u + " IDENTIFIED WITH mysql_native_password BY 'Colegio2026'"); }
    catch (e) { await r.query("CREATE USER " + u + " IDENTIFIED BY 'Colegio2026'"); }
    await r.query("GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE ON colegio.* TO " + u);
  }
  await r.query('FLUSH PRIVILEGES');
  try {
    await m.createConnection({ host: '127.0.0.1', port: 3306, user: 'colegio_web', password: 'Colegio2026', database: 'colegio' });
    console.log('RESULTADO: colegio_web CONECTA BIEN');
  } catch (e) { console.log('RESULTADO: colegio_web FALLA:', e.message); }
  process.exit(0);
})();
