'use strict';

/**
 * Fechamento (monthly closing) routes
 *
 * POST /api/fechamento                                  — create new closing
 * GET  /api/fechamento                                  — list all closings
 * GET  /api/fechamento/:id                              — get closing with summary data
 * PUT  /api/fechamento/:id/faltas                       — save absence dates for an employee
 * GET  /api/fechamento/:id/faltas                       — get absence dates (all employees)
 * POST /api/fechamento/:id/aprovar                      — approve closing
 * GET  /api/fechamento/:id/lancamentos                  — list all employee lancamentos
 * PUT  /api/fechamento/:id/lancamentos/:funcionarioId   — update employee data (with audit)
 * GET  /api/fechamento/:id/pendencias                   — list pending items
 * PUT  /api/fechamento/:id/pendencias/:pendenciaId      — resolve a pending item
 */

const express = require('express');
const auth    = require('../middleware/auth');
const { supabaseAdmin } = require('../db/supabase');
const { computeEmployee } = require('../services/dsr');

const router = express.Router();

// ---------------------------------------------------------------------------
// POST /api/fechamento — create new closing
// ---------------------------------------------------------------------------
router.post('/', auth, async (req, res) => {
  try {
    const { mes, ano } = req.body;
    if (!mes || !ano) {
      return res.status(400).json({ error: 'mes e ano são obrigatórios.' });
    }
    if (mes < 1 || mes > 12) {
      return res.status(400).json({ error: 'mes deve ser entre 1 e 12.' });
    }

    const { data, error } = await supabaseAdmin
      .from('fechamentos')
      .insert({ mes: parseInt(mes), ano: parseInt(ano) })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: `Já existe um fechamento para ${mes}/${ano}.` });
      }
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json(data);
  } catch (err) {
    console.error('[fechamento/POST]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/fechamento — list all closings
// ---------------------------------------------------------------------------
router.get('/', auth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('fechamentos')
      .select('*')
      .order('ano', { ascending: false })
      .order('mes', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  } catch (err) {
    console.error('[fechamento/GET list]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/fechamento/:id — get closing with summary
// ---------------------------------------------------------------------------
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: fechamento, error: fErr } = await supabaseAdmin
      .from('fechamentos')
      .select('*')
      .eq('id', id)
      .single();
    if (fErr || !fechamento) return res.status(404).json({ error: 'Fechamento não encontrado.' });

    // Counts
    const { count: lancCount } = await supabaseAdmin
      .from('lancamentos')
      .select('*', { count: 'exact', head: true })
      .eq('fechamento_id', id);

    const { count: pendCount } = await supabaseAdmin
      .from('pendencias')
      .select('*', { count: 'exact', head: true })
      .eq('fechamento_id', id)
      .eq('status', 'aberta');

    const { count: atestCount } = await supabaseAdmin
      .from('atestados')
      .select('*', { count: 'exact', head: true })
      .eq('fechamento_id', id);

    return res.json({
      ...fechamento,
      _counts: {
        lancamentos: lancCount || 0,
        pendencias_abertas: pendCount || 0,
        atestados: atestCount || 0,
      },
    });
  } catch (err) {
    console.error('[fechamento/GET id]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/fechamento/:id/faltas — add a single absence date for an employee
// ---------------------------------------------------------------------------
router.post('/:id/faltas', auth, async (req, res) => {
  try {
    const fechamento_id = req.params.id;
    const { funcionario_id, data } = req.body;

    if (!funcionario_id) return res.status(400).json({ error: 'funcionario_id é obrigatório.' });
    if (!data) return res.status(400).json({ error: 'data é obrigatória.' });

    const { data: fechamento } = await supabaseAdmin
      .from('fechamentos').select('*').eq('id', fechamento_id).single();
    if (!fechamento) return res.status(404).json({ error: 'Fechamento não encontrado.' });
    if (fechamento.status === 'aprovado') return res.status(409).json({ error: 'Fechamento aprovado.' });

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from('faltas_datas')
      .insert({ fechamento_id, funcionario_id: parseInt(funcionario_id), data, justificada: false })
      .select('*, funcionarios(nome, funcao)')
      .single();

    if (insErr) {
      if (insErr.code === '23505') return res.status(409).json({ error: 'Essa data já foi lançada para este funcionário.' });
      return res.status(500).json({ error: insErr.message });
    }

    // Recompute DSR
    const { data: allDatas } = await supabaseAdmin
      .from('faltas_datas')
      .select('data')
      .eq('fechamento_id', fechamento_id)
      .eq('funcionario_id', funcionario_id);

    const { data: atestados } = await supabaseAdmin
      .from('atestados').select('*').eq('fechamento_id', fechamento_id).eq('funcionario_id', funcionario_id);

    const allDateStrings = (allDatas || []).map(f => f.data);
    const computed = computeEmployee(allDateStrings, atestados || [], fechamento.mes, fechamento.ano);

    await supabaseAdmin.from('lancamentos').upsert(
      { fechamento_id, funcionario_id: parseInt(funcionario_id),
        faltas: computed.faltas, dsr: computed.dsr,
        dias_descontados: computed.dias_descontados, dias_afastados: computed.dias_afastados },
      { onConflict: 'fechamento_id,funcionario_id', ignoreDuplicates: false }
    );

    return res.status(201).json({ falta: inserted, computed });
  } catch (err) {
    console.error('[fechamento/faltas POST]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/fechamento/:id/faltas/:faltaId — delete a specific absence
// ---------------------------------------------------------------------------
router.delete('/:id/faltas/:faltaId', auth, async (req, res) => {
  try {
    const { id: fechamento_id, faltaId } = req.params;

    // Get the absence to find the employee
    const { data: falta } = await supabaseAdmin
      .from('faltas_datas').select('*').eq('id', faltaId).eq('fechamento_id', fechamento_id).single();
    if (!falta) return res.status(404).json({ error: 'Falta não encontrada.' });

    await supabaseAdmin.from('faltas_datas').delete().eq('id', faltaId);

    // Recompute DSR for the affected employee
    const { data: fechamento } = await supabaseAdmin
      .from('fechamentos').select('*').eq('id', fechamento_id).single();

    const { data: remainingDatas } = await supabaseAdmin
      .from('faltas_datas').select('data').eq('fechamento_id', fechamento_id).eq('funcionario_id', falta.funcionario_id);

    const { data: atestados } = await supabaseAdmin
      .from('atestados').select('*').eq('fechamento_id', fechamento_id).eq('funcionario_id', falta.funcionario_id);

    const allDateStrings = (remainingDatas || []).map(f => f.data);
    const computed = computeEmployee(allDateStrings, atestados || [], fechamento.mes, fechamento.ano);

    await supabaseAdmin.from('lancamentos').upsert(
      { fechamento_id, funcionario_id: falta.funcionario_id,
        faltas: computed.faltas, dsr: computed.dsr,
        dias_descontados: computed.dias_descontados, dias_afastados: computed.dias_afastados },
      { onConflict: 'fechamento_id,funcionario_id', ignoreDuplicates: false }
    );

    return res.json({ success: true, computed });
  } catch (err) {
    console.error('[fechamento/faltas DELETE]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/fechamento/:id/faltas — bulk replace absence dates for an employee
// ---------------------------------------------------------------------------
router.put('/:id/faltas', auth, async (req, res) => {
  try {
    const fechamento_id = req.params.id;
    const { funcionario_id, datas } = req.body;

    if (!funcionario_id) return res.status(400).json({ error: 'funcionario_id é obrigatório.' });
    if (!Array.isArray(datas)) return res.status(400).json({ error: 'datas deve ser um array de strings ISO.' });

    // Verify fechamento
    const { data: fechamento } = await supabaseAdmin
      .from('fechamentos').select('*').eq('id', fechamento_id).single();
    if (!fechamento) return res.status(404).json({ error: 'Fechamento não encontrado.' });
    if (fechamento.status === 'aprovado') return res.status(409).json({ error: 'Fechamento aprovado.' });

    // Delete existing for this employee in this closing
    await supabaseAdmin
      .from('faltas_datas')
      .delete()
      .eq('fechamento_id', fechamento_id)
      .eq('funcionario_id', funcionario_id);

    // Insert new dates
    if (datas.length > 0) {
      const inserts = datas.map(d => ({
        fechamento_id,
        funcionario_id: parseInt(funcionario_id),
        data: d,
        justificada: false,
      }));
      const { error: insErr } = await supabaseAdmin.from('faltas_datas').insert(inserts);
      if (insErr) return res.status(500).json({ error: insErr.message });
    }

    // Recompute DSR for this employee
    const { data: atestados } = await supabaseAdmin
      .from('atestados')
      .select('*')
      .eq('fechamento_id', fechamento_id)
      .eq('funcionario_id', funcionario_id);

    const computed = computeEmployee(datas, atestados || [], fechamento.mes, fechamento.ano);

    // Upsert lancamento
    await supabaseAdmin.from('lancamentos').upsert(
      {
        fechamento_id,
        funcionario_id: parseInt(funcionario_id),
        faltas: computed.faltas,
        dsr: computed.dsr,
        dias_descontados: computed.dias_descontados,
        dias_afastados: computed.dias_afastados,
      },
      { onConflict: 'fechamento_id,funcionario_id', ignoreDuplicates: false }
    );

    return res.json({ datas, computed });
  } catch (err) {
    console.error('[fechamento/faltas PUT]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/fechamento/:id/faltas — get all absence dates
// ---------------------------------------------------------------------------
router.get('/:id/faltas', auth, async (req, res) => {
  try {
    const fechamento_id = req.params.id;
    const { funcionario_id } = req.query;

    let query = supabaseAdmin
      .from('faltas_datas')
      .select('*, funcionarios(nome, funcao)')
      .eq('fechamento_id', fechamento_id)
      .order('data', { ascending: true });

    if (funcionario_id) {
      query = query.eq('funcionario_id', parseInt(funcionario_id));
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  } catch (err) {
    console.error('[fechamento/faltas GET]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/fechamento/:id/aprovar — approve closing
// ---------------------------------------------------------------------------
router.post('/:id/aprovar', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check for open pendencias
    const { count: openPend } = await supabaseAdmin
      .from('pendencias')
      .select('*', { count: 'exact', head: true })
      .eq('fechamento_id', id)
      .eq('status', 'aberta');

    if (openPend && openPend > 0) {
      return res.status(409).json({
        error: `Não é possível aprovar: há ${openPend} pendência(s) em aberto.`,
        pendencias_abertas: openPend,
      });
    }

    const { data, error } = await supabaseAdmin
      .from('fechamentos')
      .update({
        status: 'aprovado',
        aprovado_por: req.user.email || req.user.id,
        aprovado_em: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Fechamento não encontrado.' });

    return res.json(data);
  } catch (err) {
    console.error('[fechamento/aprovar]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/fechamento/:id/lancamentos — list all lancamentos with employee data
// ---------------------------------------------------------------------------
router.get('/:id/lancamentos', auth, async (req, res) => {
  try {
    const fechamento_id = req.params.id;

    const { data, error } = await supabaseAdmin
      .from('lancamentos')
      .select('*, funcionarios(id, nome, funcao)')
      .eq('fechamento_id', fechamento_id)
      .order('funcionarios(nome)', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });

    // Enrich with absence dates and atestados
    const enriched = await Promise.all((data || []).map(async l => {
      const { data: faltasDatas } = await supabaseAdmin
        .from('faltas_datas')
        .select('data, justificada')
        .eq('fechamento_id', fechamento_id)
        .eq('funcionario_id', l.funcionario_id)
        .order('data', { ascending: true });

      const { data: atestados } = await supabaseAdmin
        .from('atestados')
        .select('*')
        .eq('fechamento_id', fechamento_id)
        .eq('funcionario_id', l.funcionario_id);

      return {
        ...l,
        funcionario: l.funcionarios,
        faltasDatas: (faltasDatas || []).map(f => f.data),
        atestados: atestados || [],
      };
    }));

    return res.json(enriched);
  } catch (err) {
    console.error('[fechamento/lancamentos GET]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/fechamento/:id/lancamentos/:funcionarioId — update employee data
// ---------------------------------------------------------------------------
router.put('/:id/lancamentos/:funcionarioId', auth, async (req, res) => {
  try {
    const fechamento_id  = req.params.id;
    const funcionario_id = parseInt(req.params.funcionarioId, 10);
    const allowedFields  = ['consumo', 'vales', 'faltas', 'dsr', 'dias_descontados', 'dias_afastados'];

    // Verify fechamento
    const { data: fechamento } = await supabaseAdmin
      .from('fechamentos').select('*').eq('id', fechamento_id).single();
    if (!fechamento) return res.status(404).json({ error: 'Fechamento não encontrado.' });
    if (fechamento.status === 'aprovado') return res.status(409).json({ error: 'Fechamento aprovado.' });

    // Get current value for audit
    const { data: current } = await supabaseAdmin
      .from('lancamentos')
      .select('*')
      .eq('fechamento_id', fechamento_id)
      .eq('funcionario_id', funcionario_id)
      .single();

    const updates = { editado_manualmente: true };
    const auditEntries = [];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        const newVal = Number(req.body[field]);
        const oldVal = current ? current[field] : null;
        if (oldVal !== newVal) {
          updates[field] = newVal;
          auditEntries.push({
            fechamento_id,
            funcionario_id,
            campo: field,
            valor_anterior: oldVal !== null ? String(oldVal) : null,
            valor_novo: String(newVal),
            usuario: req.user.email || req.user.id,
          });
        }
      }
    }

    if (Object.keys(updates).length <= 1) {
      return res.status(400).json({ error: 'Nenhum campo válido para atualizar.' });
    }

    const { data, error } = await supabaseAdmin
      .from('lancamentos')
      .upsert(
        { fechamento_id, funcionario_id, ...updates },
        { onConflict: 'fechamento_id,funcionario_id', ignoreDuplicates: false }
      )
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    // Save audit entries
    if (auditEntries.length > 0) {
      await supabaseAdmin.from('auditoria').insert(auditEntries);
    }

    return res.json(data);
  } catch (err) {
    console.error('[fechamento/lancamentos PUT]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/fechamento/:id/pendencias — list pending items
// ---------------------------------------------------------------------------
router.get('/:id/pendencias', auth, async (req, res) => {
  try {
    const fechamento_id = req.params.id;
    const { status } = req.query;

    let query = supabaseAdmin
      .from('pendencias')
      .select('*')
      .eq('fechamento_id', fechamento_id)
      .order('created_at', { ascending: true });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  } catch (err) {
    console.error('[fechamento/pendencias GET]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/fechamento/:id/pendencias/:pendenciaId — resolve a pending item
// ---------------------------------------------------------------------------
router.put('/:id/pendencias/:pendenciaId', auth, async (req, res) => {
  try {
    const { id: fechamento_id, pendenciaId } = req.params;
    const { status, resolucao } = req.body;

    if (!status || !['aberta', 'resolvida'].includes(status)) {
      return res.status(400).json({ error: 'status deve ser "aberta" ou "resolvida".' });
    }

    const { data, error } = await supabaseAdmin
      .from('pendencias')
      .update({ status, resolucao: resolucao || null })
      .eq('id', pendenciaId)
      .eq('fechamento_id', fechamento_id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Pendência não encontrada.' });

    return res.json(data);
  } catch (err) {
    console.error('[fechamento/pendencias PUT]', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
