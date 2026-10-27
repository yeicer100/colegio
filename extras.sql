-- =====================================================================
-- OPCIONAL: crea los salones de Sexto a Once con grupos A, B y C (año 2026)
-- Ejecútalo DESPUÉS de tu script principal. No cambia ninguna tabla,
-- solo agrega datos. Si el salón ya existe, lo omite.
-- =====================================================================
USE colegio;

INSERT IGNORE INTO salon (id_sede, id_grado, id_director_grupo, grupo, nombre, anio_lectivo, cupo_maximo)
SELECT 1, g.id_grado, NULL, x.grupo, CONCAT(g.nombre, ' ', x.grupo), 2026, 30
FROM grado g
CROSS JOIN (SELECT 'A' AS grupo UNION ALL SELECT 'B' UNION ALL SELECT 'C') x;

SELECT s.id_salon, g.nivel, s.grupo, s.nombre FROM salon s JOIN grado g ON g.id_grado = s.id_grado ORDER BY g.nivel, s.grupo;
