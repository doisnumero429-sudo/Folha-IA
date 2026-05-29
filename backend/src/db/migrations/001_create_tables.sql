-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Employees (canonical list, no salary)
CREATE TABLE IF NOT EXISTS funcionarios (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  funcao TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alias → canonical employee
CREATE TABLE IF NOT EXISTS correlacoes (
  id SERIAL PRIMARY KEY,
  alias TEXT NOT NULL UNIQUE,  -- normalized form
  funcionario_id INTEGER REFERENCES funcionarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blocked names
CREATE TABLE IF NOT EXISTS proibidos (
  id SERIAL PRIMARY KEY,
  nome_normalizado TEXT NOT NULL UNIQUE,
  nome_original TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Monthly closing
CREATE TABLE IF NOT EXISTS fechamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'aprovado')),
  aprovado_por TEXT,
  aprovado_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(mes, ano)
);

-- Per closing, per employee: computed values
CREATE TABLE IF NOT EXISTS lancamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fechamento_id UUID REFERENCES fechamentos(id) ON DELETE CASCADE,
  funcionario_id INTEGER REFERENCES funcionarios(id),
  consumo NUMERIC(10,2) DEFAULT 0,
  vales NUMERIC(10,2) DEFAULT 0,
  faltas INTEGER DEFAULT 0,
  dsr INTEGER DEFAULT 0,
  dias_descontados INTEGER DEFAULT 0,
  dias_afastados INTEGER DEFAULT 0,
  editado_manualmente BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(fechamento_id, funcionario_id)
);

-- Individual absence dates
CREATE TABLE IF NOT EXISTS faltas_datas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fechamento_id UUID REFERENCES fechamentos(id) ON DELETE CASCADE,
  funcionario_id INTEGER REFERENCES funcionarios(id),
  data DATE NOT NULL,
  justificada BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(fechamento_id, funcionario_id, data)
);

-- Medical certificates (NO CID)
CREATE TABLE IF NOT EXISTS atestados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fechamento_id UUID REFERENCES fechamentos(id) ON DELETE CASCADE,
  funcionario_id INTEGER REFERENCES funcionarios(id),
  data_emissao DATE,
  periodo_inicio DATE,
  periodo_fim DATE,
  dias_afastados INTEGER NOT NULL DEFAULT 0,
  medico TEXT,
  crm TEXT,
  nome_extraido TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pending items
CREATE TABLE IF NOT EXISTS pendencias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fechamento_id UUID REFERENCES fechamentos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,  -- 'proibido', 'ambiguo', 'nao_encontrado', 'ignorado', 'conflito_falta_atestado'
  descricao TEXT NOT NULL,
  nome_original TEXT,
  valor NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'resolvida')),
  resolucao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Uploaded document references
CREATE TABLE IF NOT EXISTS documentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fechamento_id UUID REFERENCES fechamentos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,  -- 'consumo', 'vales', 'atestado'
  nome_arquivo TEXT NOT NULL,
  tamanho INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log
CREATE TABLE IF NOT EXISTS auditoria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fechamento_id UUID REFERENCES fechamentos(id) ON DELETE CASCADE,
  funcionario_id INTEGER REFERENCES funcionarios(id),
  campo TEXT NOT NULL,
  valor_anterior TEXT,
  valor_novo TEXT,
  usuario TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
