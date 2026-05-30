-- Fix out-of-sync SERIAL sequences.
--
-- The seed (002_seed_data.sql) inserts rows with explicit IDs, which does NOT
-- advance the SERIAL sequences. As a result, the next auto-generated id collides
-- with an existing row, raising:
--   duplicate key value violates unique constraint "funcionarios_pkey"
--
-- Resync each sequence to MAX(id) so the next insert uses a free id.
-- Idempotent — safe to run multiple times.

SELECT setval(pg_get_serial_sequence('funcionarios', 'id'), COALESCE((SELECT MAX(id) FROM funcionarios), 1), true);
SELECT setval(pg_get_serial_sequence('correlacoes', 'id'),  COALESCE((SELECT MAX(id) FROM correlacoes),  1), true);
SELECT setval(pg_get_serial_sequence('proibidos', 'id'),    COALESCE((SELECT MAX(id) FROM proibidos),    1), true);
