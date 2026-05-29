'use strict';

/**
 * Report generation routes
 *
 * GET /api/gerar/excel/:fechamentoId — generate and stream Excel (.xlsx)
 * GET /api/gerar/pdf/:fechamentoId   — generate and stream PDF
 * GET /api/gerar/html/:fechamentoId  — generate and stream HTML
 *
 * All routes require the fechamento to have status='aprovado'.
 */

const express = require('express');
const auth    = require('../middleware/auth');
const { supabaseAdmin } = require('../db/supabase');
const { gerarExcel }    = require('../services/excel');
const { gerarPDF }      = require('../services/pdf');
const { gerarHTML }     = require('../services/htmlReport');

const router = express.Router();

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

// ---------------------------------------------------------------------------
// Helper: load all data for a fechamento
// ---------------------------------------------------------------------------
async function loadFechamentoData(fechamentoId) {
  // Fechamento
  const { data: fechamento, error: fErr } = await supabaseAdmin
    .from('fechamentos')
    .select('*')
    .eq('id', fechamentoId)
    .single();
  if (fErr || !fechamento) return null;

  // Lancamentos with employee info
  const { data: lancRaw } = await supabaseAdmin
    .from('lancamentos')
    .select('*, funcionarios(id, nome, funcao)')
    .eq('fechamento_id', fechamentoId)
    .order('funcionarios(nome)', { ascending: true });

  // Enrich with faltas dates and atestados
  const lancamentos = await Promise.all((lancRaw || []).map(async l => {
    const { data: faltasDatas } = await supabaseAdmin
      .from('faltas_datas')
      .select('data')
      .eq('fechamento_id', fechamentoId)
      .eq('funcionario_id', l.funcionario_id)
      .order('data', { ascending: true });

    const { data: atestados } = await supabaseAdmin
      .from('atestados')
      .select('*')
      .eq('fechamento_id', fechamentoId)
      .eq('funcionario_id', l.funcionario_id);

    return {
      ...l,
      funcionario: l.funcionarios,
      faltasDatas: (faltasDatas || []).map(f => f.data),
      atestados: atestados || [],
    };
  }));

  // Pendencias
  const { data: pendencias } = await supabaseAdmin
    .from('pendencias')
    .select('*')
    .eq('fechamento_id', fechamentoId)
    .order('created_at', { ascending: true });

  return { fechamento, lancamentos, pendencias: pendencias || [] };
}

// ---------------------------------------------------------------------------
// Filename helper
// ---------------------------------------------------------------------------
function filename(fechamento, ext) {
  const mes = MONTHS_PT[fechamento.mes - 1] || `mes${fechamento.mes}`;
  return `Folha_${mes}_${fechamento.ano}.${ext}`;
}

// ---------------------------------------------------------------------------
// GET /api/gerar/excel/:fechamentoId
// ---------------------------------------------------------------------------
router.get('/excel/:fechamentoId', auth, async (req, res) => {
  try {
    const result = await loadFechamentoData(req.params.fechamentoId);
    if (!result) return res.status(404).json({ error: 'Fechamento não encontrado.' });

    const { fechamento, lancamentos, pendencias } = result;
    if (fechamento.status !== 'aprovado') {
      return res.status(409).json({ error: 'O fechamento ainda não foi aprovado.' });
    }

    const buffer = await gerarExcel(fechamento, lancamentos, pendencias);
    const fname  = filename(fechamento, 'xlsx');

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
    res.setHeader('Content-Length', buffer.length);
    return res.send(buffer);
  } catch (err) {
    console.error('[gerar/excel]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/gerar/pdf/:fechamentoId
// ---------------------------------------------------------------------------
router.get('/pdf/:fechamentoId', auth, async (req, res) => {
  try {
    const result = await loadFechamentoData(req.params.fechamentoId);
    if (!result) return res.status(404).json({ error: 'Fechamento não encontrado.' });

    const { fechamento, lancamentos, pendencias } = result;
    if (fechamento.status !== 'aprovado') {
      return res.status(409).json({ error: 'O fechamento ainda não foi aprovado.' });
    }

    const buffer = await gerarPDF(fechamento, lancamentos, pendencias);
    const fname  = filename(fechamento, 'pdf');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
    res.setHeader('Content-Length', buffer.length);
    return res.send(buffer);
  } catch (err) {
    console.error('[gerar/pdf]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/gerar/html/:fechamentoId
// ---------------------------------------------------------------------------
router.get('/html/:fechamentoId', auth, async (req, res) => {
  try {
    const result = await loadFechamentoData(req.params.fechamentoId);
    if (!result) return res.status(404).json({ error: 'Fechamento não encontrado.' });

    const { fechamento, lancamentos, pendencias } = result;
    if (fechamento.status !== 'aprovado') {
      return res.status(409).json({ error: 'O fechamento ainda não foi aprovado.' });
    }

    const html  = gerarHTML(fechamento, lancamentos, pendencias);
    const fname = filename(fechamento, 'html');

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
    return res.send(html);
  } catch (err) {
    console.error('[gerar/html]', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
