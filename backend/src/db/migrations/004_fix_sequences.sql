-- Fix out-of-sync SERIAL sequences.
--
-- The seed (002_seed_data.sql) inserts rows with explicit IDs, which does NOT
-- advance the SERIAL sequences. As a result, the next auto-generated id collides
-- with an existing row, raising:
--   duplicate key value violates unique constraint "funcionarios_pkey"
--
-- Resync each sequence to MAX(id) so the next insert uses a free id.
-- Idempotent — safe to run multiple times.

SELECT setval(
  pg_get_serial_sequence('funcionarios', 'id'),
  GREATEST((SELECT COALESCE(MAX(id), 0) FROM funcionarios), 1),
  (SELECT COUNT(*) > 0 FROM funcionarios)
);

SELECT setval(
  pg_get_serial_sequence('correlacoes', 'id'),
  GREATEST((SELECT COALESCE(MAX(id), 0) FROM correlacoes), 1),
  (SELECT COUNT(*) > 0 FROM correlacoes)
);

SELECT setval(
  pg_get_serial_sequence('proibidos', 'id'),
  GREATEST((SELECT COALESCE(MAX(id), 0) FROM proibidos), 1),
  (SELECT COUNT(*) > 0 FROM proibidos)
);
