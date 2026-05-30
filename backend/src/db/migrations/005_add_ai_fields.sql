-- Add AI-generated analysis fields to medical certificates
ALTER TABLE atestados ADD COLUMN IF NOT EXISTS categoria_cid TEXT;
ALTER TABLE atestados ADD COLUMN IF NOT EXISTS interpretacao_contextual TEXT;
ALTER TABLE atestados ADD COLUMN IF NOT EXISTS risco_recorrencia TEXT;
