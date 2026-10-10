-- =========================================================
-- HU-ASI-01 (1/2) — Nuevos estados de turno
-- =========================================================
-- CORRER SOLA, antes de 01b.
-- Postgres no permite usar un valor de enum recién agregado dentro de la misma
-- transacción en la que se agrega; por eso va en un archivo aparte.
-- Es idempotente: se puede correr más de una vez.
-- =========================================================

ALTER TYPE estado_turno ADD VALUE IF NOT EXISTS 'Asistió';
ALTER TYPE estado_turno ADD VALUE IF NOT EXISTS 'Ausente';
