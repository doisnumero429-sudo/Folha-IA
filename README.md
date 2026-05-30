# Folha IA — Araçá Grill

Sistema web de fechamento mensal de funcionários do restaurante **Araçá Grill**.

## Stack

| Camada | Tecnologia | Deploy |
|--------|-----------|--------|
| Frontend | React + Vite + Tailwind CSS | Netlify |
| Backend | Node.js + Express | Render |
| Banco | Supabase (PostgreSQL + Auth) | Supabase Cloud |
| IA (OCR) | Google Gemini 2.5 Flash | API |
| Excel | ExcelJS | — |
| PDF | pdfmake | — |

## Estrutura

```
Folha-IA/
├── frontend/    # React app (Netlify)
├── backend/     # Express API (Render)
└── README.md
```

## Setup Local

### Pré-requisitos
- Node.js 20+
- Conta Supabase
- Chave API do Google Gemini

### Backend

```bash
cd backend
cp .env.example .env
# Preencher .env com as chaves
npm install
npm run dev
```

### Frontend

```bash
cd frontend
cp .env.example .env
# VITE_API_URL=http://localhost:3001
npm install
npm run dev
```

## Banco de Dados

Executar no Supabase SQL Editor:

```sql
-- 1. Criar tabelas
-- Cole o conteúdo de: backend/src/db/migrations/001_create_tables.sql

-- 2. Popular dados iniciais
-- Cole o conteúdo de: backend/src/db/migrations/002_seed_data.sql

-- 3. Adicionar coluna CID nos atestados (OBRIGATÓRIO)
-- Cole o conteúdo de: backend/src/db/migrations/003_add_cid.sql

-- 4. Corrigir sequências SERIAL
-- Cole o conteúdo de: backend/src/db/migrations/004_fix_sequences.sql
```

> **Importante:** rode TODAS as migrações na ordem (001 → 004). Se a `003`
> não for aplicada, a tabela `atestados` fica sem a coluna `cid` e o
> salvamento de atestados falha. O backend tolera essa coluna ausente (salva
> sem o CID), mas o ideal é aplicar a migração para que o CID seja gravado.

## Variáveis de Ambiente

### Backend (`.env`)
```
GEMINI_API_KEY=        # Google AI Studio
SUPABASE_URL=          # URL do projeto Supabase
SUPABASE_ANON_KEY=     # Chave anon do Supabase
SUPABASE_SERVICE_ROLE_KEY=  # Chave service-role (apenas backend!)
PORT=3001
FRONTEND_URL=http://localhost:5173
```

### Frontend (`.env`)
```
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Deploy

### Netlify (Frontend)

1. Conectar repositório no Netlify
2. Base directory: `frontend`
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Variável de ambiente: `VITE_API_URL=https://seu-backend.onrender.com`
6. Variável de ambiente: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### Render (Backend)

1. Criar Web Service no Render
2. Apontar para o diretório `backend`
3. Build: `npm install`
4. Start: `node src/index.js`
5. Preencher variáveis de ambiente (GEMINI_API_KEY, SUPABASE_*)
6. Definir `FRONTEND_URL` com a URL do Netlify

> **Nota Render gratuito:** O backend hiberna após inatividade e leva ~50s para acordar. Como o uso é mensal, isso acontecerá toda vez. Aceitável para esse volume de uso.

## Fluxo de uso

1. **Mês/Ano** — Selecionar mês de referência
2. **Consumo** — Upload do relatório `.xls`
3. **Vales** — Upload do relatório `.html`
4. **Faltas** — Lançamento manual das datas
5. **Atestados** — Upload de atestados (Gemini OCR)
6. **Conferência** — Revisar dados, resolver pendências
7. **Aprovar** — Aprovar fechamento
8. **Gerar** — Baixar Excel, PDF e HTML

## Funcionários Ativos (20)

Dados embutidos no banco. Nunca armazenar salários.

## Motor de Matching de Nomes

O sistema normaliza nomes (maiúsculas, sem acentos, sem caracteres especiais) e resolve via:

1. Lista de proibidos (ex.: Lucas Souza, Victor Biffe)
2. Nomes ambíguos (ALEX, PRISCILA sozinhos → pendência)
3. Tabela de correlações (editável no app)
4. Nome canônico direto
5. Token FUNCIONARIO sem match → pendência
6. Resto → ignorado (cliente/ex-funcionário)

## Privacidade

Atestados são documentos de saúde. Recomendado ativar billing no Google AI (plano pago mantém documentos fora do treinamento). O código não muda — apenas a conta.

## Licença

Uso interno — Araçá Grill.
