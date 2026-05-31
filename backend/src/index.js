'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const fechamentoRoutes = require('./routes/fechamento');
const funcionariosRoutes = require('./routes/funcionarios');
const correlacoesRoutes = require('./routes/correlacoes');
const gerarRoutes = require('./routes/gerar');
const atestadosRoutes = require('./routes/atestados');
const acessoRoutes = require('./routes/acesso');
const faltaRapidaRoutes = require('./routes/faltaRapida');
const operadoresRoutes = require('./routes/operadores');
const { loadData } = require('./services/matcher');
const { supabaseAdmin } = require('./db/supabase');

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// CORS
app.use(cors({
  origin: [FRONTEND_URL, 'https://folha-ia.vercel.app', 'http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/fechamento', fechamentoRoutes);
app.use('/api/funcionarios', funcionariosRoutes);
app.use('/api/correlacoes', correlacoesRoutes);
app.use('/api/gerar', gerarRoutes);
app.use('/api/atestados', atestadosRoutes);
app.use('/api/acesso', acessoRoutes);
app.use('/api/falta-rapida', faltaRapidaRoutes);
app.use('/api/operadores', operadoresRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada', path: req.originalUrl });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Erro interno do servidor';
  res.status(status).json({ error: message, ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }) });
});

// Start server
async function start() {
  try {
    // Pre-load matcher data from DB
    await loadData(supabaseAdmin);
    console.log('[matcher] Dados carregados da base de dados.');
  } catch (err) {
    console.warn('[matcher] Aviso: não foi possível carregar dados da base:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`Folha IA Backend running on port ${PORT}`);
  });
}

start();
