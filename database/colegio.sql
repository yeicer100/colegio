DROP DATABASE IF EXISTS colegio;
CREATE DATABASE colegio CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE colegio;

-- =====================================================================
-- TABLAS BASE
-- =====================================================================

CREATE TABLE acudiente (
    id_acudiente INT AUTO_INCREMENT PRIMARY KEY,
    documento VARCHAR(20) NOT NULL UNIQUE,
    nombres VARCHAR(60) NOT NULL,
    apellidos VARCHAR(60) NOT NULL,
    telefono VARCHAR(15),
    correo VARCHAR(100)
);

CREATE TABLE estudiante (
    id_estudiante INT AUTO_INCREMENT PRIMARY KEY,
    id_acudiente INT NOT NULL,
    documento VARCHAR(20) NOT NULL UNIQUE,
    nombres VARCHAR(60) NOT NULL,
    apellidos VARCHAR(60) NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    direccion VARCHAR(100),
    telefono VARCHAR(15),
    estado ENUM('activo', 'inactivo', 'retirado', 'graduado') NOT NULL DEFAULT 'activo',
    FOREIGN KEY (id_acudiente) REFERENCES acudiente(id_acudiente),
    INDEX idx_estudiante_nombre (apellidos, nombres)
);

CREATE TABLE docente (
    id_docente INT AUTO_INCREMENT PRIMARY KEY,
    documento VARCHAR(20) NOT NULL UNIQUE,
    nombres VARCHAR(60) NOT NULL,
    apellidos VARCHAR(60) NOT NULL,
    especialidad VARCHAR(80),
    telefono VARCHAR(15),
    correo VARCHAR(100) UNIQUE
);

CREATE TABLE periodo_academico (
    id_periodo INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_final DATE NOT NULL,
    estado ENUM('planeado', 'en_curso', 'finalizado') NOT NULL DEFAULT 'planeado'
);

CREATE TABLE asignatura (
    id_asignatura INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL UNIQUE,
    descripcion VARCHAR(80),
    intensidad_horaria INT
);

-- Sede fisica del colegio
CREATE TABLE sede (
    id_sede INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(60) NOT NULL,
    direccion VARCHAR(100),
    telefono VARCHAR(15)
);

-- Grado escolar (Sexto, Septimo, ... Once)
CREATE TABLE grado (
    id_grado INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL UNIQUE,
    nivel INT NOT NULL UNIQUE
);

-- =====================================================================
-- SALON
-- Un salon es un grado + grupo en una sede y un año lectivo.
-- Ej: "Decimo A" de la Sede Principal en 2026.
-- =====================================================================

CREATE TABLE salon (
    id_salon INT AUTO_INCREMENT PRIMARY KEY,
    id_sede INT NOT NULL,
    id_grado INT NOT NULL,
    id_director_grupo INT NULL,
    grupo VARCHAR(5) NOT NULL,
    nombre VARCHAR(40) NOT NULL,
    anio_lectivo INT NOT NULL,
    cupo_maximo INT NOT NULL DEFAULT 30,
    FOREIGN KEY (id_sede) REFERENCES sede(id_sede),
    FOREIGN KEY (id_grado) REFERENCES grado(id_grado),
    FOREIGN KEY (id_director_grupo) REFERENCES docente(id_docente),
    UNIQUE (id_sede, id_grado, grupo, anio_lectivo)
);

-- Estudiantes que pertenecen a cada salon
CREATE TABLE salon_estudiante (
    id_salon_estudiante INT AUTO_INCREMENT PRIMARY KEY,
    id_salon INT NOT NULL,
    id_estudiante INT NOT NULL,
    fecha_ingreso DATE NOT NULL DEFAULT (CURRENT_DATE),
    estado ENUM('activo', 'retirado') NOT NULL DEFAULT 'activo',
    FOREIGN KEY (id_salon) REFERENCES salon(id_salon),
    FOREIGN KEY (id_estudiante) REFERENCES estudiante(id_estudiante),
    UNIQUE (id_salon, id_estudiante)
);

-- =====================================================================
-- CURSO (una asignatura dictada a un salon en un periodo)
-- =====================================================================

CREATE TABLE curso (
    id_curso INT AUTO_INCREMENT PRIMARY KEY,
    id_asignatura INT NOT NULL,
    id_docente INT NOT NULL,
    id_periodo_academico INT NOT NULL,
    id_salon INT NOT NULL,
    aula VARCHAR(20),
    cupo_maximo INT NOT NULL DEFAULT 30,
    FOREIGN KEY (id_asignatura) REFERENCES asignatura(id_asignatura),
    FOREIGN KEY (id_docente) REFERENCES docente(id_docente),
    FOREIGN KEY (id_periodo_academico) REFERENCES periodo_academico(id_periodo),
    FOREIGN KEY (id_salon) REFERENCES salon(id_salon),
    UNIQUE (id_asignatura, id_periodo_academico, id_salon)
);

CREATE TABLE horario (
    id_horario INT AUTO_INCREMENT PRIMARY KEY,
    id_curso INT NOT NULL,
    dia_semana ENUM('lunes', 'martes', 'miercoles', 'jueves', 'viernes') NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    FOREIGN KEY (id_curso) REFERENCES curso(id_curso),
    UNIQUE (id_curso, dia_semana, hora_inicio)
);

CREATE TABLE matricula (
    id_matricula INT AUTO_INCREMENT PRIMARY KEY,
    id_estudiante INT NOT NULL,
    id_curso INT NOT NULL,
    fecha_matricula DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado ENUM('activa', 'retirada', 'finalizada') NOT NULL DEFAULT 'activa',
    FOREIGN KEY (id_estudiante) REFERENCES estudiante(id_estudiante),
    FOREIGN KEY (id_curso) REFERENCES curso(id_curso),
    UNIQUE (id_estudiante, id_curso)
);

CREATE TABLE calificacion (
    id_nota INT AUTO_INCREMENT PRIMARY KEY,
    id_matricula INT NOT NULL,
    descripcion_evaluacion VARCHAR(50) NOT NULL,
    porcentaje DECIMAL(5,2) NOT NULL,
    calificacion DECIMAL(3,1) NOT NULL,
    fecha DATE NOT NULL,
    FOREIGN KEY (id_matricula) REFERENCES matricula(id_matricula),
    INDEX idx_calificacion_fecha (fecha)
);

CREATE TABLE asistencia (
    id_asistencia INT AUTO_INCREMENT PRIMARY KEY,
    id_matricula INT NOT NULL,
    fecha DATE NOT NULL,
    estado ENUM('presente', 'ausente', 'tarde', 'excusa') NOT NULL,
    FOREIGN KEY (id_matricula) REFERENCES matricula(id_matricula),
    UNIQUE (id_matricula, fecha)
);

-- Anotaciones de convivencia / observador del estudiante
CREATE TABLE observador_estudiantil (
    id_observacion INT AUTO_INCREMENT PRIMARY KEY,
    id_estudiante INT NOT NULL,
    id_docente INT NOT NULL,
    tipo ENUM('positiva', 'negativa', 'academica', 'convivencial') NOT NULL,
    descripcion VARCHAR(255) NOT NULL,
    fecha DATE NOT NULL,
    FOREIGN KEY (id_estudiante) REFERENCES estudiante(id_estudiante),
    FOREIGN KEY (id_docente) REFERENCES docente(id_docente)
);

-- =====================================================================
-- USUARIOS DEL SITIO WEB
-- El sitio guarda aqui el login. NUNCA guardes la clave en texto plano:
-- el backend debe guardar un hash (bcrypt / argon2) en password_hash.
-- =====================================================================

CREATE TABLE usuario (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    correo VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol ENUM('admin', 'docente', 'acudiente', 'estudiante') NOT NULL,
    id_docente INT NULL,
    id_acudiente INT NULL,
    id_estudiante INT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_acceso DATETIME NULL,
    FOREIGN KEY (id_docente) REFERENCES docente(id_docente),
    FOREIGN KEY (id_acudiente) REFERENCES acudiente(id_acudiente),
    FOREIGN KEY (id_estudiante) REFERENCES estudiante(id_estudiante)
);

-- =====================================================================
-- BITACORA DE MATRICULA (ENTREGABLE 3)
-- Se llena dentro de la misma transaccion que la matricula.
-- =====================================================================

CREATE TABLE bitacora_matricula (
    id_bitacora INT AUTO_INCREMENT PRIMARY KEY,
    id_matricula INT NOT NULL,
    id_estudiante INT NOT NULL,
    id_curso INT NOT NULL,
    accion VARCHAR(30) NOT NULL,
    usuario_bd VARCHAR(100) NOT NULL,
    fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_matricula) REFERENCES matricula(id_matricula),
    FOREIGN KEY (id_estudiante) REFERENCES estudiante(id_estudiante),
    FOREIGN KEY (id_curso) REFERENCES curso(id_curso)
);

-- =====================================================================
-- TRIGGERS (4)
-- =====================================================================

-- 1) La nota debe estar entre 0.0 y 5.0 (al insertar)
DELIMITER $$

CREATE TRIGGER trg_validar_calificacion
BEFORE INSERT ON calificacion
FOR EACH ROW
BEGIN
    IF NEW.calificacion < 0 OR NEW.calificacion > 5 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'La calificacion debe estar entre 0.0 y 5.0';
    END IF;
END$$

DELIMITER ;

-- 2) Lo mismo al editar una nota (el sitio web permite corregir notas)
DELIMITER $$

CREATE TRIGGER trg_validar_calificacion_upd
BEFORE UPDATE ON calificacion
FOR EACH ROW
BEGIN
    IF NEW.calificacion < 0 OR NEW.calificacion > 5 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'La calificacion debe estar entre 0.0 y 5.0';
    END IF;
END$$

DELIMITER ;

-- 3) Al asignar un estudiante a un salon:
--    - respeta el cupo del salon
--    - un estudiante no puede estar en dos salones activos el mismo año
DELIMITER $$

CREATE TRIGGER trg_validar_salon_estudiante
BEFORE INSERT ON salon_estudiante
FOR EACH ROW
BEGIN
    DECLARE v_cupo INT;
    DECLARE v_anio INT;
    DECLARE v_total INT;
    DECLARE v_otros INT;

    SELECT cupo_maximo, anio_lectivo INTO v_cupo, v_anio
    FROM salon WHERE id_salon = NEW.id_salon;

    SELECT COUNT(*) INTO v_total
    FROM salon_estudiante
    WHERE id_salon = NEW.id_salon AND estado = 'activo';

    IF v_total >= v_cupo THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El salon ya alcanzo su cupo maximo';
    END IF;

    SELECT COUNT(*) INTO v_otros
    FROM salon_estudiante se
    JOIN salon s ON s.id_salon = se.id_salon
    WHERE se.id_estudiante = NEW.id_estudiante
      AND se.estado = 'activo'
      AND s.anio_lectivo = v_anio;

    IF v_otros > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El estudiante ya esta en un salon activo este año lectivo';
    END IF;
END$$

DELIMITER ;

-- 4) Al matricular en un curso:
--    - el estudiante debe pertenecer al salon de ese curso
--    - se respeta el cupo del curso
DELIMITER $$

CREATE TRIGGER trg_validar_matricula
BEFORE INSERT ON matricula
FOR EACH ROW
BEGIN
    DECLARE v_id_salon INT;
    DECLARE v_cupo INT;
    DECLARE v_en_salon INT;
    DECLARE v_matriculados INT;

    SELECT id_salon, cupo_maximo INTO v_id_salon, v_cupo
    FROM curso WHERE id_curso = NEW.id_curso;

    SELECT COUNT(*) INTO v_en_salon
    FROM salon_estudiante
    WHERE id_salon = v_id_salon
      AND id_estudiante = NEW.id_estudiante
      AND estado = 'activo';

    IF v_en_salon = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El estudiante no pertenece al salon de este curso';
    END IF;

    SELECT COUNT(*) INTO v_matriculados
    FROM matricula
    WHERE id_curso = NEW.id_curso AND estado = 'activa';

    IF v_matriculados >= v_cupo THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El curso ya alcanzo su cupo maximo';
    END IF;
END$$

DELIMITER ;

-- =====================================================================
-- VISTAS (6) - el sitio web consulta estas vistas
-- =====================================================================

-- 1) Resumen de cada salon: director, sede, total de estudiantes y cupos libres
CREATE VIEW vista_salon_resumen AS
SELECT
    s.id_salon,
    s.nombre AS salon,
    s.anio_lectivo,
    g.nombre AS grado,
    s.grupo,
    sd.nombre AS sede,
    CONCAT(d.nombres, ' ', d.apellidos) AS director_grupo,
    s.cupo_maximo,
    COUNT(se.id_estudiante) AS total_estudiantes,
    s.cupo_maximo - COUNT(se.id_estudiante) AS cupos_disponibles
FROM salon s
JOIN grado g ON g.id_grado = s.id_grado
JOIN sede sd ON sd.id_sede = s.id_sede
LEFT JOIN docente d ON d.id_docente = s.id_director_grupo
LEFT JOIN salon_estudiante se ON se.id_salon = s.id_salon AND se.estado = 'activo'
GROUP BY s.id_salon, s.nombre, s.anio_lectivo, g.nombre, s.grupo,
         sd.nombre, d.nombres, d.apellidos, s.cupo_maximo;

-- 2) Lista de estudiantes de cada salon
CREATE VIEW vista_estudiantes_por_salon AS
SELECT
    s.id_salon,
    s.nombre AS salon,
    s.anio_lectivo,
    e.id_estudiante,
    e.documento,
    e.nombres,
    e.apellidos,
    e.estado AS estado_estudiante,
    se.estado AS estado_en_salon
FROM salon s
JOIN salon_estudiante se ON se.id_salon = s.id_salon
JOIN estudiante e ON e.id_estudiante = se.id_estudiante;

-- 3) Detalle de cada nota (cada evaluacion), con salon, asignatura y periodo
CREATE VIEW vista_notas_detalle AS
SELECT
    c.id_nota,
    e.id_estudiante,
    e.nombres,
    e.apellidos,
    s.id_salon,
    s.nombre AS salon,
    cu.id_curso,
    asg.nombre AS asignatura,
    per.id_periodo,
    per.nombre AS periodo,
    c.descripcion_evaluacion,
    c.porcentaje,
    c.calificacion,
    c.fecha
FROM calificacion c
JOIN matricula m ON m.id_matricula = c.id_matricula
JOIN estudiante e ON e.id_estudiante = m.id_estudiante
JOIN curso cu ON cu.id_curso = m.id_curso
JOIN salon s ON s.id_salon = cu.id_salon
JOIN asignatura asg ON asg.id_asignatura = cu.id_asignatura
JOIN periodo_academico per ON per.id_periodo = cu.id_periodo_academico;

-- 4) Boletin: nota definitiva por estudiante, asignatura y periodo (ponderada).
--    porcentaje_evaluado indica cuanto de la nota ya fue calificado (100 = completo).
CREATE VIEW vista_boletin AS
SELECT
    e.id_estudiante,
    e.nombres,
    e.apellidos,
    s.id_salon,
    s.nombre AS salon,
    cu.id_curso,
    asg.nombre AS asignatura,
    per.id_periodo,
    per.nombre AS periodo,
    COALESCE(SUM(c.porcentaje), 0) AS porcentaje_evaluado,
    ROUND(SUM(c.calificacion * c.porcentaje) / NULLIF(SUM(c.porcentaje), 0), 1) AS nota_definitiva
FROM estudiante e
JOIN matricula m ON m.id_estudiante = e.id_estudiante
JOIN curso cu ON cu.id_curso = m.id_curso
JOIN salon s ON s.id_salon = cu.id_salon
JOIN asignatura asg ON asg.id_asignatura = cu.id_asignatura
JOIN periodo_academico per ON per.id_periodo = cu.id_periodo_academico
LEFT JOIN calificacion c ON c.id_matricula = m.id_matricula
GROUP BY e.id_estudiante, e.nombres, e.apellidos, s.id_salon, s.nombre,
         cu.id_curso, asg.nombre, per.id_periodo, per.nombre;

-- 5) Promedio del salon por asignatura y periodo (notas definitivas)
CREATE VIEW vista_promedio_salon AS
SELECT
    id_salon,
    salon,
    id_curso,
    asignatura,
    id_periodo,
    periodo,
    COUNT(*) AS estudiantes_con_nota,
    ROUND(AVG(nota_definitiva), 1) AS promedio,
    MAX(nota_definitiva) AS nota_maxima,
    MIN(nota_definitiva) AS nota_minima
FROM vista_boletin
WHERE nota_definitiva IS NOT NULL
GROUP BY id_salon, salon, id_curso, asignatura, id_periodo, periodo;

-- 6) Resumen de asistencia por estudiante y curso, con porcentaje
CREATE VIEW vista_asistencia_resumen AS
SELECT
    e.id_estudiante,
    e.nombres,
    e.apellidos,
    s.id_salon,
    s.nombre AS salon,
    cu.id_curso,
    asg.nombre AS asignatura,
    COUNT(a.id_asistencia) AS dias_registrados,
    SUM(a.estado = 'presente') AS dias_presente,
    SUM(a.estado = 'ausente') AS dias_ausente,
    SUM(a.estado = 'tarde') AS dias_tarde,
    SUM(a.estado = 'excusa') AS dias_excusa,
    ROUND(100 * SUM(a.estado = 'presente') / NULLIF(COUNT(a.id_asistencia), 0), 1) AS porcentaje_asistencia
FROM estudiante e
JOIN matricula m ON m.id_estudiante = e.id_estudiante
JOIN curso cu ON cu.id_curso = m.id_curso
JOIN salon s ON s.id_salon = cu.id_salon
JOIN asignatura asg ON asg.id_asignatura = cu.id_asignatura
LEFT JOIN asistencia a ON a.id_matricula = m.id_matricula
GROUP BY e.id_estudiante, e.nombres, e.apellidos, s.id_salon, s.nombre,
         cu.id_curso, asg.nombre;

-- =====================================================================
-- PROCEDIMIENTOS ALMACENADOS (5)
-- =====================================================================

-- 1) Asigna un estudiante a un salon (el trigger valida cupo y duplicados)
DELIMITER $$

CREATE PROCEDURE sp_asignar_estudiante_salon(
    IN p_id_estudiante INT,
    IN p_id_salon INT
)
BEGIN
    INSERT INTO salon_estudiante (id_salon, id_estudiante)
    VALUES (p_id_salon, p_id_estudiante);

    SELECT LAST_INSERT_ID() AS id_salon_estudiante;
END$$

DELIMITER ;

-- 2) Matricula a un estudiante en un curso
--    (el trigger valida que sea del salon y que haya cupo)
DELIMITER $$

CREATE PROCEDURE sp_matricular_estudiante(
    IN p_id_estudiante INT,
    IN p_id_curso INT
)
BEGIN
    INSERT INTO matricula (id_estudiante, id_curso)
    VALUES (p_id_estudiante, p_id_curso);

    SELECT LAST_INSERT_ID() AS id_matricula;
END$$

DELIMITER ;

-- 3) Registra una nota validando que la suma de porcentajes no pase de 100
DELIMITER $$

CREATE PROCEDURE sp_registrar_calificacion(
    IN p_id_matricula INT,
    IN p_descripcion VARCHAR(50),
    IN p_porcentaje DECIMAL(5,2),
    IN p_calificacion DECIMAL(3,1),
    IN p_fecha DATE
)
BEGIN
    DECLARE v_suma_porcentaje DECIMAL(5,2);

    SELECT COALESCE(SUM(porcentaje), 0) INTO v_suma_porcentaje
    FROM calificacion
    WHERE id_matricula = p_id_matricula;

    IF (v_suma_porcentaje + p_porcentaje) > 100 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'La suma de porcentajes supera el 100% para esta matricula';
    ELSE
        INSERT INTO calificacion (id_matricula, descripcion_evaluacion, porcentaje, calificacion, fecha)
        VALUES (p_id_matricula, p_descripcion, p_porcentaje, p_calificacion, p_fecha);

        SELECT LAST_INSERT_ID() AS id_nota;
    END IF;
END$$

DELIMITER ;

-- 4) Notas de TODO un salon (una fila por estudiante y asignatura).
--    p_id_periodo = NULL trae todos los periodos.
DELIMITER $$

CREATE PROCEDURE sp_notas_salon(
    IN p_id_salon INT,
    IN p_id_periodo INT
)
BEGIN
    SELECT *
    FROM vista_boletin
    WHERE id_salon = p_id_salon
      AND (p_id_periodo IS NULL OR id_periodo = p_id_periodo)
    ORDER BY apellidos, nombres, asignatura;
END$$

DELIMITER ;

-- 5) Notas de UN estudiante, evaluacion por evaluacion.
--    p_id_periodo = NULL trae todos los periodos.
DELIMITER $$

CREATE PROCEDURE sp_notas_estudiante(
    IN p_id_estudiante INT,
    IN p_id_periodo INT
)
BEGIN
    SELECT *
    FROM vista_notas_detalle
    WHERE id_estudiante = p_id_estudiante
      AND (p_id_periodo IS NULL OR id_periodo = p_id_periodo)
    ORDER BY asignatura, fecha;
END$$

DELIMITER ;

-- =====================================================================
-- ENTREGABLE 3 - 1. TRANSACCIONES PARA OPERACIONES CRITICAS
-- Atomicidad: si algo falla a la mitad, ROLLBACK deja todo como estaba.
-- =====================================================================

-- Caso critico 1: Matricula de un estudiante
-- START TRANSACTION -> valida cupo (trigger trg_validar_matricula)
-- -> INSERT matricula -> INSERT bitacora -> COMMIT.
-- Si ocurre cualquier error, el handler ejecuta ROLLBACK y relanza el error.
-- El SELECT ... FOR UPDATE sobre el curso evita que dos matriculas
-- simultaneas se pasen del cupo.
DELIMITER $$

CREATE PROCEDURE sp_matricular_estudiante_tx(
    IN p_id_estudiante INT,
    IN p_id_curso INT
)
BEGIN
    DECLARE v_id_matricula INT;
    DECLARE v_cupo INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Bloquea la fila del curso mientras dura la transaccion
    SELECT cupo_maximo INTO v_cupo
    FROM curso
    WHERE id_curso = p_id_curso
    FOR UPDATE;

    -- El trigger valida salon y cupo; si falla, salta al handler
    INSERT INTO matricula (id_estudiante, id_curso, fecha_matricula, estado)
    VALUES (p_id_estudiante, p_id_curso, NOW(), 'activa');

    SET v_id_matricula = LAST_INSERT_ID();

    INSERT INTO bitacora_matricula (id_matricula, id_estudiante, id_curso, accion, usuario_bd)
    VALUES (v_id_matricula, p_id_estudiante, p_id_curso, 'MATRICULA', CURRENT_USER());

    COMMIT;

    SELECT v_id_matricula AS id_matricula;
END$$

DELIMITER ;

-- Caso 2: Registro de calificacion verificando que los porcentajes
-- del estudiante en el curso no pasen de 100%.
-- Se bloquea la matricula (FOR UPDATE) para que dos docentes que
-- registren notas a la vez no superen el 100% entre los dos.
DELIMITER $$

CREATE PROCEDURE sp_registrar_calificacion_tx(
    IN p_id_matricula INT,
    IN p_descripcion VARCHAR(50),
    IN p_porcentaje DECIMAL(5,2),
    IN p_calificacion DECIMAL(3,1),
    IN p_fecha DATE
)
BEGIN
    DECLARE v_id_matricula INT;
    DECLARE v_suma DECIMAL(5,2);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT id_matricula INTO v_id_matricula
    FROM matricula
    WHERE id_matricula = p_id_matricula
    FOR UPDATE;

    SELECT COALESCE(SUM(porcentaje), 0) INTO v_suma
    FROM calificacion
    WHERE id_matricula = p_id_matricula;

    IF (v_suma + p_porcentaje) > 100 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'La suma de porcentajes supera el 100% para esta matricula';
    END IF;

    -- El trigger trg_validar_calificacion valida el rango 0.0 a 5.0
    INSERT INTO calificacion (id_matricula, descripcion_evaluacion, porcentaje, calificacion, fecha)
    VALUES (p_id_matricula, p_descripcion, p_porcentaje, p_calificacion, p_fecha);

    COMMIT;

    SELECT LAST_INSERT_ID() AS id_nota;
END$$

DELIMITER ;

-- =====================================================================
-- ENTREGABLE 3 - 2. CONTROL DE CONCURRENCIA Y BLOQUEOS
-- SELECT ... FOR UPDATE bloquea la fila hasta COMMIT / ROLLBACK.
-- =====================================================================

DELIMITER $$

CREATE PROCEDURE sp_actualizar_aula_curso(
    IN p_id_curso INT,
    IN p_aula VARCHAR(20)
)
BEGIN
    DECLARE v_id_curso INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT id_curso INTO v_id_curso
    FROM curso
    WHERE id_curso = p_id_curso
    FOR UPDATE;

    UPDATE curso SET aula = p_aula WHERE id_curso = p_id_curso;

    COMMIT;
END$$

DELIMITER ;

-- =====================================================================
-- ENTREGABLE 3 - Procedimientos de consulta para el estudiante
-- MySQL no tiene seguridad por fila. El rol del estudiante no recibe
-- SELECT sobre tablas ni vistas: solo puede ejecutar procedimientos que
-- exigen el id del estudiante. El backend debe pasar el id_estudiante
-- del usuario que inicio sesion.
-- =====================================================================

DELIMITER $$

CREATE PROCEDURE sp_boletin_estudiante(
    IN p_id_estudiante INT,
    IN p_id_periodo INT
)
BEGIN
    SELECT *
    FROM vista_boletin
    WHERE id_estudiante = p_id_estudiante
      AND (p_id_periodo IS NULL OR id_periodo = p_id_periodo)
    ORDER BY asignatura;
END$$

CREATE PROCEDURE sp_asistencia_estudiante(
    IN p_id_estudiante INT
)
BEGIN
    SELECT *
    FROM vista_asistencia_resumen
    WHERE id_estudiante = p_id_estudiante
    ORDER BY asignatura;
END$$

DELIMITER ;

-- =====================================================================
-- POBLACION DE DATOS
-- =====================================================================

INSERT INTO acudiente (id_acudiente, documento, nombres, apellidos, telefono, correo) VALUES
(1, '1234567890', 'Carlos', 'Gomez', '3001234567', 'carlos@gmail.com'),
(2, '2345678901', 'Maria', 'Rodriguez', '3012345678', 'maria@gmail.com'),
(3, '3456789012', 'Pedro', 'Martinez', '3023456789', 'pedro@gmail.com'),
(4, '4567890123', 'Laura', 'Hernandez', '3034567890', 'laura@gmail.com'),
(5, '5678901234', 'Jorge', 'Lopez', '3045678901', 'jorge@gmail.com'),
(6, '6789012345', 'Ana', 'Torres', '3056789012', 'ana@gmail.com'),
(7, '7890123456', 'Luis', 'Ramirez', '3067890123', 'luis@gmail.com'),
(8, '8901234567', 'Sofia', 'Castro', '3078901234', 'sofia@gmail.com'),
(9, '9012345678', 'Diego', 'Morales', '3089012345', 'diego@gmail.com'),
(10, '0123456789', 'Claudia', 'Vargas', '3090123456', 'claudia@gmail.com');

INSERT INTO estudiante
(id_estudiante, id_acudiente, documento, nombres, apellidos, fecha_nacimiento, direccion, telefono, estado)
VALUES
(1, 1, '1098765432', 'Juan', 'Gomez', '2010-05-15', 'Cra 10 # 20-30', '3109876543', 'activo'),
(2, 2, '1098765433', 'Camila', 'Rodriguez', '2011-03-20', 'Cra 15 # 25-40', '3119876544', 'activo'),
(3, 3, '1098765434', 'Mateo', 'Martinez', '2009-08-10', 'Calle 30 # 15-20', '3129876545', 'activo'),
(4, 4, '1098765435', 'Valentina', 'Hernandez', '2010-11-05', 'Calle 45 # 10-15', '3139876546', 'activo'),
(5, 5, '1098765436', 'Santiago', 'Lopez', '2011-01-25', 'Cra 20 # 30-50', '3149876547', 'activo'),
(6, 6, '1098765437', 'Isabella', 'Torres', '2010-07-18', 'Calle 50 # 20-25', '3159876548', 'activo'),
(7, 7, '1098765438', 'Daniel', 'Ramirez', '2009-12-12', 'Cra 25 # 35-60', '3169876549', 'activo'),
(8, 8, '1098765439', 'Sofia', 'Castro', '2011-06-30', 'Calle 60 # 25-35', '3179876550', 'activo'),
(9, 9, '1098765440', 'Nicolas', 'Morales', '2010-09-22', 'Cra 30 # 40-20', '3189876551', 'activo'),
(10, 10, '1098765441', 'Mariana', 'Vargas', '2009-04-14', 'Calle 70 # 30-45', '3199876552', 'activo');

INSERT INTO docente (id_docente, documento, nombres, apellidos, especialidad, telefono, correo) VALUES
(1, '52456789', 'Ana', 'Rodriguez', 'Matematicas', '3201234567', 'ana@gmail.com'),
(2, '52456790', 'Carlos', 'Perez', 'Espanol', '3212345678', 'carlos@gmail.com'),
(3, '52456791', 'Laura', 'Gonzalez', 'Ingles', '3223456789', 'laura@gmail.com'),
(4, '52456792', 'Jorge', 'Martinez', 'Ciencias Naturales', '3234567890', 'jorge@gmail.com'),
(5, '52456793', 'Diana', 'Lopez', 'Ciencias Sociales', '3245678901', 'diana@gmail.com'),
(6, '52456794', 'Andres', 'Torres', 'Educacion Fisica', '3256789012', 'andres@gmail.com'),
(7, '52456795', 'Paula', 'Ramirez', 'Informatica', '3267890123', 'paula@gmail.com'),
(8, '52456796', 'Miguel', 'Castro', 'Filosofia', '3278901234', 'miguel@gmail.com'),
(9, '52456797', 'Sandra', 'Morales', 'Quimica', '3289012345', 'sandra@gmail.com'),
(10, '52456798', 'Felipe', 'Vargas', 'Fisica', '3290123456', 'felipe@gmail.com');

INSERT INTO periodo_academico (id_periodo, nombre, fecha_inicio, fecha_final, estado) VALUES
(1, 'Primer Periodo', '2026-01-15', '2026-03-31', 'en_curso'),
(2, 'Segundo Periodo', '2026-04-01', '2026-06-30', 'planeado'),
(3, 'Tercer Periodo', '2026-07-01', '2026-09-30', 'planeado'),
(4, 'Cuarto Periodo', '2026-10-01', '2026-11-30', 'planeado'),
(5, 'Primer Periodo 2025', '2025-01-15', '2025-03-31', 'finalizado'),
(6, 'Segundo Periodo 2025', '2025-04-01', '2025-06-30', 'finalizado'),
(7, 'Tercer Periodo 2025', '2025-07-01', '2025-09-30', 'finalizado'),
(8, 'Cuarto Periodo 2025', '2025-10-01', '2025-11-30', 'finalizado'),
(9, 'Nivelacion 2026', '2026-12-01', '2026-12-15', 'planeado'),
(10, 'Recuperacion 2026', '2026-12-16', '2026-12-20', 'planeado');

INSERT INTO asignatura (id_asignatura, nombre, descripcion, intensidad_horaria) VALUES
(1, 'Matematicas', 'Matematicas basicas y avanzadas', 5),
(2, 'Espanol', 'Lengua castellana y literatura', 4),
(3, 'Ingles', 'Idioma extranjero ingles', 3),
(4, 'Ciencias Naturales', 'Biologia y ciencias naturales', 4),
(5, 'Ciencias Sociales', 'Historia y geografia', 3),
(6, 'Educacion Fisica', 'Actividad fisica y deportes', 2),
(7, 'Informatica', 'Tecnologia e informatica', 3),
(8, 'Filosofia', 'Pensamiento filosofico', 2),
(9, 'Quimica', 'Quimica general', 3),
(10, 'Fisica', 'Fisica general', 3);

INSERT INTO sede (id_sede, nombre, direccion, telefono) VALUES
(1, 'Sede Principal', 'Calle 26 # 5-40, Quibdo', '3200000001'),
(2, 'Sede Rural Yuto', 'Via Yuto Km 3, Quibdo', '3200000002');

INSERT INTO grado (id_grado, nombre, nivel) VALUES
(1, 'Sexto', 6),
(2, 'Septimo', 7),
(3, 'Octavo', 8),
(4, 'Noveno', 9),
(5, 'Decimo', 10),
(6, 'Once', 11);

-- Dos salones de Decimo en la Sede Principal
INSERT INTO salon (id_salon, id_sede, id_grado, id_director_grupo, grupo, nombre, anio_lectivo, cupo_maximo) VALUES
(1, 1, 5, 1, 'A', 'Decimo A', 2026, 30),
(2, 1, 5, 2, 'B', 'Decimo B', 2026, 30);

-- Estudiantes 1 a 5 en Decimo A, 6 a 10 en Decimo B
INSERT INTO salon_estudiante (id_salon, id_estudiante) VALUES
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5),
(2, 6), (2, 7), (2, 8), (2, 9), (2, 10);

-- Cursos 1-10: Decimo A | Cursos 11-20: Decimo B (mismos docentes, otro horario)
INSERT INTO curso
(id_curso, id_asignatura, id_docente, id_periodo_academico, id_salon, aula, cupo_maximo)
VALUES
(1, 1, 1, 1, 1, 'A101', 30),
(2, 2, 2, 1, 1, 'A102', 30),
(3, 3, 3, 1, 1, 'A103', 30),
(4, 4, 4, 1, 1, 'A104', 30),
(5, 5, 5, 1, 1, 'A105', 30),
(6, 6, 6, 1, 1, 'Cancha', 30),
(7, 7, 7, 1, 1, 'Sala Sistemas', 25),
(8, 8, 8, 1, 1, 'A106', 30),
(9, 9, 9, 1, 1, 'Laboratorio', 25),
(10, 10, 10, 1, 1, 'A107', 30),
(11, 1, 1, 1, 2, 'B101', 30),
(12, 2, 2, 1, 2, 'B102', 30),
(13, 3, 3, 1, 2, 'B103', 30),
(14, 4, 4, 1, 2, 'B104', 30),
(15, 5, 5, 1, 2, 'B105', 30),
(16, 6, 6, 1, 2, 'Cancha', 30),
(17, 7, 7, 1, 2, 'Sala Sistemas', 25),
(18, 8, 8, 1, 2, 'B106', 30),
(19, 9, 9, 1, 2, 'Laboratorio', 25),
(20, 10, 10, 1, 2, 'B107', 30);

INSERT INTO horario (id_curso, dia_semana, hora_inicio, hora_fin) VALUES
-- Decimo A (manana temprano)
(1, 'lunes', '07:00:00', '08:30:00'),
(2, 'lunes', '08:30:00', '10:00:00'),
(3, 'martes', '07:00:00', '08:30:00'),
(4, 'martes', '08:30:00', '10:00:00'),
(5, 'miercoles', '07:00:00', '08:30:00'),
(6, 'miercoles', '08:30:00', '10:00:00'),
(7, 'jueves', '07:00:00', '08:30:00'),
(8, 'jueves', '08:30:00', '10:00:00'),
(9, 'viernes', '07:00:00', '08:30:00'),
(10, 'viernes', '08:30:00', '10:00:00'),
-- Decimo B (mediodia)
(11, 'lunes', '10:30:00', '12:00:00'),
(12, 'lunes', '12:00:00', '13:30:00'),
(13, 'martes', '10:30:00', '12:00:00'),
(14, 'martes', '12:00:00', '13:30:00'),
(15, 'miercoles', '10:30:00', '12:00:00'),
(16, 'miercoles', '12:00:00', '13:30:00'),
(17, 'jueves', '10:30:00', '12:00:00'),
(18, 'jueves', '12:00:00', '13:30:00'),
(19, 'viernes', '10:30:00', '12:00:00'),
(20, 'viernes', '12:00:00', '13:30:00');

-- Decimo A (estudiantes 1-5) en cursos 1, 2, 3
-- Decimo B (estudiantes 6-10) en cursos 11, 12, 13
-- (INSERT directo; el trigger trg_validar_matricula valida cada fila)
INSERT INTO matricula (id_estudiante, id_curso, estado) VALUES
(1, 1, 'activa'), (1, 2, 'activa'), (1, 3, 'activa'),
(2, 1, 'activa'), (2, 2, 'activa'), (2, 3, 'activa'),
(3, 1, 'activa'), (3, 2, 'activa'), (3, 3, 'activa'),
(4, 1, 'activa'), (4, 2, 'activa'), (4, 3, 'activa'),
(5, 1, 'activa'), (5, 2, 'activa'), (5, 3, 'activa'),
(6, 11, 'activa'), (6, 12, 'activa'), (6, 13, 'activa'),
(7, 11, 'activa'), (7, 12, 'activa'), (7, 13, 'activa'),
(8, 11, 'activa'), (8, 12, 'activa'), (8, 13, 'activa'),
(9, 11, 'activa'), (9, 12, 'activa'), (9, 13, 'activa'),
(10, 11, 'activa'), (10, 12, 'activa'), (10, 13, 'activa');

-- Calificaciones de ejemplo en Matematicas (se buscan por estudiante + curso,
-- asi no dependemos de los id_matricula). Los estudiantes 5 y 10 quedan sin nota.
INSERT INTO calificacion (id_matricula, descripcion_evaluacion, porcentaje, calificacion, fecha)
SELECT m.id_matricula, 'Examen parcial', 30.00, n.nota, '2026-02-10'
FROM (
    SELECT 1 AS id_estudiante, 1 AS id_curso, 4.2 AS nota
    UNION ALL SELECT 2, 1, 3.8
    UNION ALL SELECT 3, 1, 4.5
    UNION ALL SELECT 4, 1, 3.5
    UNION ALL SELECT 6, 11, 4.0
    UNION ALL SELECT 7, 11, 3.2
    UNION ALL SELECT 8, 11, 4.8
    UNION ALL SELECT 9, 11, 3.9
) n
JOIN matricula m ON m.id_estudiante = n.id_estudiante AND m.id_curso = n.id_curso;

-- Calificaciones de ejemplo en Espanol
INSERT INTO calificacion (id_matricula, descripcion_evaluacion, porcentaje, calificacion, fecha)
SELECT m.id_matricula, 'Taller de lectura', 25.00, n.nota, '2026-02-12'
FROM (
    SELECT 1 AS id_estudiante, 2 AS id_curso, 4.0 AS nota
    UNION ALL SELECT 2, 2, 3.6
    UNION ALL SELECT 3, 2, 4.4
    UNION ALL SELECT 6, 12, 4.1
    UNION ALL SELECT 7, 12, 3.7
) n
JOIN matricula m ON m.id_estudiante = n.id_estudiante AND m.id_curso = n.id_curso;

-- Asistencia de ejemplo en Matematicas (20 de enero de 2026)
INSERT INTO asistencia (id_matricula, fecha, estado)
SELECT m.id_matricula, '2026-01-20', n.estado
FROM (
    SELECT 1 AS id_estudiante, 1 AS id_curso, 'presente' AS estado
    UNION ALL SELECT 2, 1, 'presente'
    UNION ALL SELECT 3, 1, 'ausente'
    UNION ALL SELECT 4, 1, 'tarde'
    UNION ALL SELECT 5, 1, 'presente'
    UNION ALL SELECT 6, 11, 'presente'
    UNION ALL SELECT 7, 11, 'excusa'
    UNION ALL SELECT 8, 11, 'presente'
    UNION ALL SELECT 9, 11, 'ausente'
    UNION ALL SELECT 10, 11, 'presente'
) n
JOIN matricula m ON m.id_estudiante = n.id_estudiante AND m.id_curso = n.id_curso;

-- Observador estudiantil de ejemplo
INSERT INTO observador_estudiantil (id_estudiante, id_docente, tipo, descripcion, fecha) VALUES
(1, 1, 'positiva', 'Ayudo a un companero con la tarea de matematicas', '2026-02-02'),
(3, 2, 'negativa', 'Llego tarde a la clase de espanol en tres ocasiones', '2026-02-05'),
(7, 6, 'convivencial', 'Participacion destacada en actividad deportiva', '2026-02-08'),
(9, 4, 'academica', 'No entrego el trabajo de ciencias naturales', '2026-02-09');

-- Usuarios de ejemplo para el login del sitio web.
-- REEMPLAZA los hashes: el backend debe generarlos con bcrypt/argon2.
INSERT INTO usuario (correo, password_hash, rol, id_docente, id_acudiente, id_estudiante) VALUES
('admin@colegio.edu.co', '$2b$10$REEMPLAZAR_CON_HASH_BCRYPT', 'admin', NULL, NULL, NULL),
('ana@gmail.com',        '$2b$10$REEMPLAZAR_CON_HASH_BCRYPT', 'docente', 1, NULL, NULL),
('carlos@gmail.com',     '$2b$10$REEMPLAZAR_CON_HASH_BCRYPT', 'acudiente', NULL, 1, NULL),
('juan@colegio.edu.co',  '$2b$10$REEMPLAZAR_CON_HASH_BCRYPT', 'estudiante', NULL, NULL, 1);

-- =====================================================================
-- USUARIO DE BASE DE DATOS PARA LA APLICACION WEB
-- El sitio NO debe conectarse como root. Cambia la clave antes de usarlo
-- (y el host '%' si el servidor web esta en otra maquina).
-- =====================================================================

CREATE USER IF NOT EXISTS 'colegio_web'@'localhost' IDENTIFIED BY 'CambiaEstaClave_123';
GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE ON colegio.* TO 'colegio_web'@'localhost';
FLUSH PRIVILEGES;

-- =====================================================================
-- DEMOSTRACION DE LOS PROCEDIMIENTOS ALMACENADOS
-- =====================================================================

-- Matricula al estudiante 1 tambien en Ciencias Naturales (curso 4, su salon)
CALL sp_matricular_estudiante(1, 4);

-- Segunda nota (quiz) en Matematicas del estudiante 1 (matricula 1), sin pasarse de 100%
CALL sp_registrar_calificacion(1, 'Quiz', 20.00, 4.5, '2026-02-20');

-- Notas de TODO el salon Decimo A, Primer Periodo
CALL sp_notas_salon(1, 1);

-- Notas de UN estudiante (Juan Gomez), Primer Periodo
CALL sp_notas_estudiante(1, 1);

-- =====================================================================
-- ENTREGABLE 3 - DEMOSTRACION DE TRANSACCIONES
-- =====================================================================

-- Matricula del estudiante 5 en Ciencias Naturales (curso 4) con bitacora
START TRANSACTION;

INSERT INTO matricula (id_estudiante, id_curso, fecha_matricula, estado)
VALUES (5, 4, NOW(), 'activa');

INSERT INTO bitacora_matricula (id_matricula, id_estudiante, id_curso, accion, usuario_bd)
VALUES (LAST_INSERT_ID(), 5, 4, 'MATRICULA', CURRENT_USER());

COMMIT;

-- Ejemplo de ROLLBACK: se inserta y luego se descarta (no queda nada)
START TRANSACTION;

INSERT INTO matricula (id_estudiante, id_curso, fecha_matricula, estado)
VALUES (2, 4, NOW(), 'activa');

ROLLBACK;

-- Matricula usando el procedimiento transaccional (estudiante 2 en curso 4)
CALL sp_matricular_estudiante_tx(2, 4);

-- Calificacion "Parcial 2" de 30% para la matricula 1 (llevaba 50%, queda en 80%)
START TRANSACTION;

INSERT INTO calificacion (id_matricula, descripcion_evaluacion, porcentaje, calificacion, fecha)
VALUES (1, 'Parcial 2', 30.00, 4.5, CURDATE());

COMMIT;

-- Otro 30% pasaria de 100%: el procedimiento haria ROLLBACK y devolveria error.
-- (Descomentar para probar; detiene el script si se ejecuta de corrido.)
-- CALL sp_registrar_calificacion_tx(1, 'Parcial 3', 30.00, 4.0, CURDATE());

-- Con 20% si cabe (80% + 20% = 100%):
CALL sp_registrar_calificacion_tx(1, 'Parcial 3', 20.00, 4.0, CURDATE());

-- =====================================================================
-- ENTREGABLE 3 - DEMOSTRACION DE BLOQUEOS (SELECT ... FOR UPDATE)
-- =====================================================================

START TRANSACTION;

SELECT id_curso, id_asignatura, aula
FROM curso
WHERE id_curso = 4
FOR UPDATE;

UPDATE curso SET aula = 'Aula 305' WHERE id_curso = 4;

COMMIT;

-- Version reutilizable:
-- CALL sp_actualizar_aula_curso(4, 'Aula 305');

-- ---- PRUEBA DE BLOQUEO CON DOS SESIONES (dos ventanas de MySQL) ----
-- Sesion 1:
--     START TRANSACTION;
--     SELECT * FROM curso WHERE id_curso = 4 FOR UPDATE;
--     UPDATE curso SET aula = 'Aula 305' WHERE id_curso = 4;
--     -- (no hacer COMMIT todavia)
--
-- Sesion 2 (se queda esperando hasta que la sesion 1 termine):
--     START TRANSACTION;
--     SELECT * FROM curso WHERE id_curso = 4 FOR UPDATE;
--
-- Sesion 1:
--     COMMIT;     -- libera el bloqueo y la sesion 2 continua
--
-- Para ver los bloqueos activos:
--     SELECT * FROM performance_schema.data_locks;

-- =====================================================================
-- ENTREGABLE 3 - 3. USUARIOS DE LA BASE DE DATOS
-- CAMBIA las claves antes de usar esto en un servidor real.
-- =====================================================================

CREATE USER IF NOT EXISTS 'usr_administrador'@'localhost'  IDENTIFIED BY 'Admin_Cambiar_2026#';
CREATE USER IF NOT EXISTS 'usr_docente'@'localhost'        IDENTIFIED BY 'Docente_Cambiar_2026#';
CREATE USER IF NOT EXISTS 'usr_estudiante_app'@'localhost' IDENTIFIED BY 'Estud_Cambiar_2026#';
CREATE USER IF NOT EXISTS 'usr_auditoria'@'localhost'      IDENTIFIED BY 'Audit_Cambiar_2026#';

-- =====================================================================
-- ENTREGABLE 3 - 4. ROLES Y PRIVILEGIOS (MySQL 8.0+)
-- =====================================================================

CREATE ROLE IF NOT EXISTS 'rol_administrador', 'rol_docente', 'rol_estudiante', 'rol_auditoria';

-- ---- ROL_ADMINISTRADOR: control total sobre el esquema ---------------
GRANT ALL PRIVILEGES ON colegio.* TO 'rol_administrador';

-- ---- ROL_DOCENTE: consultar cursos, insertar/actualizar notas y asistencias
GRANT SELECT ON colegio.curso                       TO 'rol_docente';
GRANT SELECT ON colegio.horario                     TO 'rol_docente';
GRANT SELECT ON colegio.asignatura                  TO 'rol_docente';
GRANT SELECT ON colegio.salon                       TO 'rol_docente';
GRANT SELECT ON colegio.matricula                   TO 'rol_docente';
GRANT SELECT ON colegio.vista_estudiantes_por_salon TO 'rol_docente';
GRANT SELECT ON colegio.vista_notas_detalle         TO 'rol_docente';
GRANT SELECT ON colegio.vista_boletin               TO 'rol_docente';
GRANT SELECT ON colegio.vista_promedio_salon        TO 'rol_docente';
GRANT SELECT ON colegio.vista_asistencia_resumen    TO 'rol_docente';
GRANT SELECT, INSERT, UPDATE ON colegio.calificacion TO 'rol_docente';
GRANT SELECT, INSERT, UPDATE ON colegio.asistencia   TO 'rol_docente';
GRANT EXECUTE ON PROCEDURE colegio.sp_registrar_calificacion    TO 'rol_docente';
GRANT EXECUTE ON PROCEDURE colegio.sp_registrar_calificacion_tx TO 'rol_docente';
GRANT EXECUTE ON PROCEDURE colegio.sp_notas_salon               TO 'rol_docente';
GRANT EXECUTE ON PROCEDURE colegio.sp_notas_estudiante          TO 'rol_docente';

-- ---- ROL_ESTUDIANTE: solo lectura de SU informacion (via procedimientos)
GRANT EXECUTE ON PROCEDURE colegio.sp_notas_estudiante      TO 'rol_estudiante';
GRANT EXECUTE ON PROCEDURE colegio.sp_boletin_estudiante    TO 'rol_estudiante';
GRANT EXECUTE ON PROCEDURE colegio.sp_asistencia_estudiante TO 'rol_estudiante';

-- ---- ROL_AUDITORIA: solo lectura (sin la tabla usuario: tiene los hashes)
GRANT SELECT ON colegio.acudiente              TO 'rol_auditoria';
GRANT SELECT ON colegio.estudiante             TO 'rol_auditoria';
GRANT SELECT ON colegio.docente                TO 'rol_auditoria';
GRANT SELECT ON colegio.periodo_academico      TO 'rol_auditoria';
GRANT SELECT ON colegio.asignatura             TO 'rol_auditoria';
GRANT SELECT ON colegio.sede                   TO 'rol_auditoria';
GRANT SELECT ON colegio.grado                  TO 'rol_auditoria';
GRANT SELECT ON colegio.salon                  TO 'rol_auditoria';
GRANT SELECT ON colegio.salon_estudiante       TO 'rol_auditoria';
GRANT SELECT ON colegio.curso                  TO 'rol_auditoria';
GRANT SELECT ON colegio.horario                TO 'rol_auditoria';
GRANT SELECT ON colegio.matricula              TO 'rol_auditoria';
GRANT SELECT ON colegio.calificacion           TO 'rol_auditoria';
GRANT SELECT ON colegio.asistencia             TO 'rol_auditoria';
GRANT SELECT ON colegio.observador_estudiantil TO 'rol_auditoria';
GRANT SELECT ON colegio.bitacora_matricula     TO 'rol_auditoria';
GRANT SELECT ON colegio.vista_salon_resumen    TO 'rol_auditoria';
GRANT SELECT ON colegio.vista_estudiantes_por_salon TO 'rol_auditoria';
GRANT SELECT ON colegio.vista_notas_detalle    TO 'rol_auditoria';
GRANT SELECT ON colegio.vista_boletin          TO 'rol_auditoria';
GRANT SELECT ON colegio.vista_promedio_salon   TO 'rol_auditoria';
GRANT SELECT ON colegio.vista_asistencia_resumen TO 'rol_auditoria';

-- =====================================================================
-- ENTREGABLE 3 - 5. PERMISOS: ASIGNAR ROLES A LOS USUARIOS
-- =====================================================================

GRANT 'rol_administrador' TO 'usr_administrador'@'localhost';
GRANT 'rol_docente'       TO 'usr_docente'@'localhost';
GRANT 'rol_estudiante'    TO 'usr_estudiante_app'@'localhost';
GRANT 'rol_auditoria'     TO 'usr_auditoria'@'localhost';

-- Para que el rol quede activo apenas el usuario inicia sesion
SET DEFAULT ROLE 'rol_administrador' TO 'usr_administrador'@'localhost';
SET DEFAULT ROLE 'rol_docente'       TO 'usr_docente'@'localhost';
SET DEFAULT ROLE 'rol_estudiante'    TO 'usr_estudiante_app'@'localhost';
SET DEFAULT ROLE 'rol_auditoria'     TO 'usr_auditoria'@'localhost';

FLUSH PRIVILEGES;

-- Verificacion de permisos
SHOW GRANTS FOR 'usr_administrador'@'localhost'  USING 'rol_administrador';
SHOW GRANTS FOR 'usr_docente'@'localhost'        USING 'rol_docente';
SHOW GRANTS FOR 'usr_estudiante_app'@'localhost' USING 'rol_estudiante';
SHOW GRANTS FOR 'usr_auditoria'@'localhost'      USING 'rol_auditoria';

-- =====================================================================
-- CONSULTAS CON SUBCONSULTAS
-- =====================================================================

-- 1) Estudiantes cuyo promedio de notas esta por encima del promedio general
SELECT nombres, apellidos, promedio
FROM (
    SELECT e.id_estudiante, e.nombres, e.apellidos, AVG(c.calificacion) AS promedio
    FROM estudiante e
    JOIN matricula m ON m.id_estudiante = e.id_estudiante
    JOIN calificacion c ON c.id_matricula = m.id_matricula
    GROUP BY e.id_estudiante, e.nombres, e.apellidos
) AS promedios_por_estudiante
WHERE promedio > (SELECT AVG(calificacion) FROM calificacion);

-- 2) Cursos con mas estudiantes matriculados que el promedio por curso
SELECT cu.id_curso, s.nombre AS salon, asg.nombre AS asignatura, COUNT(m.id_matricula) AS total_matriculados
FROM curso cu
JOIN salon s ON s.id_salon = cu.id_salon
JOIN asignatura asg ON asg.id_asignatura = cu.id_asignatura
LEFT JOIN matricula m ON m.id_curso = cu.id_curso
GROUP BY cu.id_curso, s.nombre, asg.nombre
HAVING COUNT(m.id_matricula) > (
    SELECT AVG(cnt)
    FROM (SELECT COUNT(*) AS cnt FROM matricula GROUP BY id_curso) AS conteos
);

-- 3) Estudiantes que todavia no tienen ninguna calificacion registrada
SELECT nombres, apellidos
FROM estudiante e
WHERE NOT EXISTS (
    SELECT 1
    FROM matricula m
    JOIN calificacion c ON c.id_matricula = m.id_matricula
    WHERE m.id_estudiante = e.id_estudiante
);

-- =====================================================================
-- CONSULTAR VISTAS Y TABLAS
-- =====================================================================

SELECT * FROM acudiente;
SELECT * FROM estudiante;
SELECT * FROM docente;
SELECT * FROM periodo_academico;
SELECT * FROM asignatura;
SELECT * FROM sede;
SELECT * FROM grado;
SELECT * FROM salon;
SELECT * FROM salon_estudiante;
SELECT * FROM curso;
SELECT * FROM horario;
SELECT * FROM matricula;
SELECT * FROM calificacion;
SELECT * FROM asistencia;
SELECT * FROM observador_estudiantil;
SELECT * FROM bitacora_matricula;
SELECT id_usuario, correo, rol, activo FROM usuario;
SELECT * FROM vista_salon_resumen;
SELECT * FROM vista_estudiantes_por_salon;
SELECT * FROM vista_notas_detalle;
SELECT * FROM vista_boletin;
SELECT * FROM vista_promedio_salon;
SELECT * FROM vista_asistencia_resumen;