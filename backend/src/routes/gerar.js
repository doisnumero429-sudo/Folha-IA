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

  // All active employees
  const { data: todosFunc } = await supabaseAdmin
    .from('funcionarios')
    .select('id, nome, funcao')
    .eq('ativo', true)
    .order('nome', { ascending: true });

  // Lancamentos with employee info
  const { data: lancRaw } = await supabaseAdmin
    .from('lancamentos')
    .select('*, funcionarios(id, nome, funcao)')
    .eq('fechamento_id', fechamentoId);

  const lancMap = {};
  for (const l of (lancRaw || [])) {
    lancMap[l.funcionario_id] = l;
  }

  // Historical atestados (all months, for recurrence display in HTML)
  const funcIds = (todosFunc || []).map(f => f.id);
  const { data: histAtestadosRaw } = await supabaseAdmin
    .from('atestados')
    .select('*, fechamentos(mes, ano)')
    .in('funcionario_id', funcIds)
    .neq('fechamento_id', fechamentoId)
    .order('data_emissao', { ascending: false });

  const histMap = {};
  for (const a of (histAtestadosRaw || [])) {
    if (!histMap[a.funcionario_id]) histMap[a.funcionario_id] = [];
    histMap[a.funcionario_id].push(a);
  }

  // Enrich with faltas dates and atestados; include all employees (zeros for missing)
  const lancamentos = await Promise.all((todosFunc || []).map(async func => {
    const l = lancMap[func.id] || {
      funcionario_id: func.id,
      consumo: 0, vales: 0, faltas: 0, dsr: 0,
      dias_descontados: 0, dias_afastados: 0,
    };

    const { data: faltasDatas } = await supabaseAdmin
      .from('faltas_datas')
      .select('data')
      .eq('fechamento_id', fechamentoId)
      .eq('funcionario_id', func.id)
      .order('data', { ascending: true });

    const { data: atestados } = await supabaseAdmin
      .from('atestados')
      .select('*')
      .eq('fechamento_id', fechamentoId)
      .eq('funcionario_id', func.id);

    return {
      ...l,
      funcionario: func,
      faltasDatas: (faltasDatas || []).map(f => f.data),
      atestados: atestados || [],
      historicalAtestados: histMap[func.id] || [],
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
