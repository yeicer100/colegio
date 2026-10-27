-- Ejecuta este archivo en MySQL Workbench conectado como root/administrador.
-- Configuración para desarrollo local. Cambia la clave si lo necesitas y actualiza también el .env.
CREATE DATABASE IF NOT EXISTS colegio
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'colegio_web'@'localhost'
  IDENTIFIED BY 'CambiaEstaClave_123';

ALTER USER 'colegio_web'@'localhost'
  IDENTIFIED BY 'CambiaEstaClave_123';

GRANT ALL PRIVILEGES ON colegio.* TO 'colegio_web'@'localhost';
FLUSH PRIVILEGES;
