-- ============================================================
-- PIN operators for the quick "Lançar Faltas" PWA page
-- ============================================================

-- People authorized to launch absences from the quick page.
-- They do NOT log in with email/password — only a numeric PIN.
-- Managed from Configurações on the main app.
CREATE TABLE IF NOT EXISTS operadores_falta (
  id         SERIAL PRIMARY KEY,
  nome       TEXT NOT NULL,
  pin_hash   TEXT NOT NULL,
  ativo      BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Track who launched each absence (operator name), for accountability.
ALTER TABLE faltas_datas ADD COLUMN IF NOT EXISTS lancado_por TEXT;
