'use strict';

/**
 * Correlações (alias → canonical employee) routes
 *
 * GET    /api/correlacoes       — list all correlations
 * POST   /api/correlacoes       — add a new correlation
 * DELETE /api/correlacoes/:id   — remove a correlation
 *
 * After any write operation the in-memory matcher is reloaded.
 */

const express = require('express');
const auth    = require('../middleware/auth');
const { supabaseAdmin } = require('../db/supabase');
const { normalizeName, reloadData } = require('../services/matcher');

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /api/correlacoes
// ---------------------------------------------------------------------------
router.get('/', auth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('correlacoes')
      .select('*, funcionarios(nome, funcao)')
      .order('alias', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  } catch (err) {
    console.error('[correlacoes/GET]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/correlacoes
// ---------------------------------------------------------------------------
router.post('/', auth, async (req, res) => {
  try {
    const { alias, funcionario_id } = req.body;

    if (!alias || !alias.trim()) {
      return res.status(400).json({ error: 'alias é obrigatório.' });
    }
    if (!funcionario_id) {
      return res.status(400).json({ error: 'funcionario_id é obrigatório.' });
    }

    // Verify employee exists
    const { data: emp } = await supabaseAdmin
      .from('funcionarios')
      .select('id, nome')
      .eq('id', parseInt(funcionario_id, 10))
      .single();
    if (!emp) {
      return res.status(404).json({ error: 'Funcionário não encontrado.' });
    }

    const normalizedAlias = normalizeName(alias.trim());

    const { data, error } = await supabaseAdmin
      .from('correlacoes')
      .insert({ alias: normalizedAlias, funcionario_id: parseInt(funcionario_id, 10) })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: `O alias "${normalizedAlias}" já existe.` });
      }
      return res.status(500).json({ error: error.message });
    }

    // Reload matcher in-memory data
    try {
      await reloadData(supabaseAdmin);
    } catch (reloadErr) {
      console.warn('[correlacoes] reload failed:', reloadErr.message);
    }

    return res.status(201).json(data);
  } catch (err) {
    console.error('[correlacoes/POST]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/correlacoes/:id
// ---------------------------------------------------------------------------
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('correlacoes')
      .delete()
      .eq('id', parseInt(id, 10));

    if (error) return res.status(500).json({ error: error.message });

    // Reload matcher in-memory data
    try {
      await reloadData(supabaseAdmin);
    } catch (reloadErr) {
      console.warn('[correlacoes] reload failed:', reloadErr.message);
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('[correlacoes/DELETE]', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
