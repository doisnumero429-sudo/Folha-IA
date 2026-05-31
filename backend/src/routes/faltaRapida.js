'use strict';

/**
 * Quick "Lançar Faltas" routes — real-time absence launching from the PWA.
 *
 * All endpoints accept either a full operator token or a PIN token (authFalta).
 *
 * GET    /api/falta-rapida/funcionarios        — active employees
 * GET    /api/falta-rapida/resumo?data=ISO      — absences for a day + month counts
 * POST   /api/falta-rapida                       — launch one absence
 * DELETE /api/falta-rapida/:id                   — undo one absence
 *
 * The fechamento (monthly closing) is resolved automatically from the absence
 * date's month/year, and created on the fly if it doesn't exist yet — that's
 * what makes launching work in real time, not only at closing day.
 */

const express = require('express');
const authFalta = require('../middleware/authFalta');
const { supabaseAdmin } = require('../db/supabase');
const { computeEmployee } = require('../services/dsr');

const router = express.Router();

// Today's date (YYYY-MM-DD) in Brasília time.
function hojeISO() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

function parseISO(data) {
  const m = String(data || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return { ano: parseInt(m[1], 10), mes: parseInt(m[2], 10), dia: parseInt(m[3], 10) };
}

// Resolve (or create) the open fechamento for a given month/year.
// Returns { fechamento } or { error, status } when the month is already closed.
async function resolveFechamento(mes, ano) {
  const { data: existing } = await supabaseAdmin
    .from('fechamentos')
    .select('*')
    .eq('mes', mes)
    .eq('ano', ano)
    .single();

  if (existing) {
    if (existing.status === 'aprovado') {
      return { error: 'O mês desta data já foi fechado/aprovado. Não é possível lançar faltas nele.', status: 409 };
    }
    return { fechamento: existing };
  }

  const { data: created, error } = await supabaseAdmin
    .from('fechamentos')
    .insert({ mes, ano, status: 'em_andamento' })
    .select()
    .single();

  if (error) return { error: 'Não foi possível abrir o mês para lançamento.', status: 500 };
  return { fechamento: created };
}

// Recompute faltas count + DSR for one employee and persist on lancamentos.
// Mirrors the logic used by the main closing flow (fechamento.js): absences
// covered by a medical certificate are "justified" and don't count as faltas
// or cost DSR. We pass mes/ano so DSR is grouped by week within the month.
async function recomputeLancamento(fechamento, funcionario_id) {
  const { data: faltas } = await supabaseAdmin
    .from('faltas_datas')
    .select('data')
    .eq('fechamento_id', fechamento.id)
    .eq('funcionario_id', funcionario_id);

  const { data: atestados } = await supabaseAdmin
    .from('atestados')
    .select('*')
    .eq('fechamento_id', fechamento.id)
    .eq('funcionario_id', funcionario_id);

  const datas    = (faltas || []).map(f => f.data);
  const computed = computeEmployee(datas, atestados || [], fechamento.mes, fechamento.ano);

  await supabaseAdmin
    .from('lancamentos')
    .upsert(
      {
        fechamento_id: fechamento.id,
        funcionario_id,
        faltas: computed.faltas,
        dsr: computed.dsr,
        dias_descontados: computed.dias_descontados,
        dias_afastados: computed.dias_afastados,
      },
      { onConflict: 'fechamento_id,funcionario_id', ignoreDuplicates: false }
    );

  return datas.length;
}

// ── GET /funcionarios ────────────────────────────────────────────────────────
router.get('/funcionarios', authFalta, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('funcionarios')
    .select('id, nome, funcao')
    .eq('ativo', true)
    .order('nome', { ascending: true });
  if (error) return res.status(500).json({ error: 'Erro ao carregar funcionários.' });
  return res.json(data || []);
});

// ── GET /resumo?data=YYYY-MM-DD ──────────────────────────────────────────────
// Absences already launched on that day + month-to-date count per employee.
router.get('/resumo', authFalta, async (req, res) => {
  try {
    const data = req.query.data || hojeISO();
    const p = parseISO(data);
    if (!p) return res.status(400).json({ error: 'Data inválida.' });

    // Find the fechamento for that month (do NOT create just to read).
    const { data: fechamento } = await supabaseAdmin
      .from('fechamentos')
      .select('id')
      .eq('mes', p.mes)
      .eq('ano', p.ano)
      .single();

    if (!fechamento) {
      return res.json({ data, faltasDoDia: [], contagemMes: {} });
    }

    // Absences on that exact day (with employee info)
    const { data: faltasDoDia } = await supabaseAdmin
      .from('faltas_datas')
      .select('id, funcionario_id, data, lancado_por, funcionarios(nome, funcao)')
      .eq('fechamento_id', fechamento.id)
      .eq('data', data)
      .order('created_at', { ascending: true });

    // Month-to-date count per employee
    const { data: faltasMes } = await supabaseAdmin
      .from('faltas_datas')
      .select('funcionario_id')
      .eq('fechamento_id', fechamento.id);

    const contagemMes = {};
    for (const f of (faltasMes || [])) {
      contagemMes[f.funcionario_id] = (contagemMes[f.funcionario_id] || 0) + 1;
    }

    return res.json({ data, faltasDoDia: faltasDoDia || [], contagemMes });
  } catch (err) {
    console.error('[falta-rapida/resumo]', err);
    return res.status(500).json({ error: 'Erro ao carregar resumo.' });
  }
});

// ── POST / ───────────────────────────────────────────────────────────────────
router.post('/', authFalta, async (req, res) => {
  try {
    const { funcionario_id } = req.body;
    const data = req.body.data || hojeISO();
    if (!funcionario_id) return res.status(400).json({ error: 'Funcionário é obrigatório.' });
    const p = parseISO(data);
    if (!p) return res.status(400).json({ error: 'Data inválida.' });

    const r = await resolveFechamento(p.mes, p.ano);
    if (r.error) return res.status(r.status).json({ error: r.error });
    const fechamento = r.fechamento;

    // Avoid duplicates: same employee + same day.
    const { data: existing } = await supabaseAdmin
      .from('faltas_datas')
      .select('id')
      .eq('fechamento_id', fechamento.id)
      .eq('funcionario_id', funcionario_id)
      .eq('data', data)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'Falta já registrada para este dia.', id: existing.id });
    }

    const { data: inserted, error } = await supabaseAdmin
      .from('faltas_datas')
      .insert({
        fechamento_id: fechamento.id,
        funcionario_id,
        data,
        justificada: false,
        lancado_por: req.auth && req.auth.nome ? req.auth.nome : null,
      })
      .select('id, funcionario_id, data')
      .single();

    if (error) return res.status(500).json({ error: 'Não foi possível registrar a falta.' });

    const totalMes = await recomputeLancamento(fechamento, funcionario_id);

    return res.status(201).json({ falta: inserted, totalMes });
  } catch (err) {
    console.error('[falta-rapida/POST]', err);
    return res.status(500).json({ error: 'Erro ao registrar falta.' });
  }
});

// ── DELETE /:id ──────────────────────────────────────────────────────────────
router.delete('/:id', authFalta, async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the row first so we can recompute afterwards.
    const { data: row } = await supabaseAdmin
      .from('faltas_datas')
      .select('id, fechamento_id, funcionario_id')
      .eq('id', id)
      .single();

    if (!row) return res.status(404).json({ error: 'Falta não encontrada.' });

    // Block undo on an already-approved month.
    const { data: fechamento } = await supabaseAdmin
      .from('fechamentos')
      .select('*')
      .eq('id', row.fechamento_id)
      .single();
    if (fechamento && fechamento.status === 'aprovado') {
      return res.status(409).json({ error: 'O mês desta falta já foi fechado. Não é possível desfazer.' });
    }

    const { error } = await supabaseAdmin
      .from('faltas_datas')
      .delete()
      .eq('id', id);

    if (error) return res.status(500).json({ error: 'Não foi possível desfazer a falta.' });

    const totalMes = await recomputeLancamento(fechamento, row.funcionario_id);

    return res.json({ success: true, funcionario_id: row.funcionario_id, totalMes });
  } catch (err) {
    console.error('[falta-rapida/DELETE]', err);
    return res.status(500).json({ error: 'Erro ao desfazer falta.' });
  }
});

module.exports = router;
