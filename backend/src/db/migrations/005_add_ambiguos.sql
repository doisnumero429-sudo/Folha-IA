-- 005_add_ambiguos.sql
-- Cria tabela de nomes ambíguos configuráveis (antes eram hardcoded no matcher.js)

CREATE TABLE IF NOT EXISTS ambiguos (
  id SERIAL PRIMARY KEY,
  nome_normalizado TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migra os valores que estavam hardcoded no código
INSERT INTO ambiguos (nome_normalizado) VALUES
('ALEX'),
('PRISCILA')
ON CONFLICT (nome_normalizado) DO NOTHING;
