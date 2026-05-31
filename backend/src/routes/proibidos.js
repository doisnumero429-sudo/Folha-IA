'use strict';

/**
 * Proibidos (blocked employees) routes
 *
 * GET    /api/proibidos       — list all blocked names
 * POST   /api/proibidos       — add a new blocked name
 * DELETE /api/proibidos/:id   — remove a blocked name
 *
 * After any write operation the in-memory matcher is reloaded.
 */

const express = require('express');
const auth    = require('../middleware/auth');
const { supabaseAdmin } = require('../db/supabase');
const { normalizeName, reloadData } = require('../services/matcher');

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /api/proibidos
// ---------------------------------------------------------------------------
router.get('/', auth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('proibidos')
      .select('*')
      .order('nome_original', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  } catch (err) {
    console.error('[proibidos/GET]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/proibidos
// ---------------------------------------------------------------------------
router.post('/', auth, async (req, res) => {
  try {
    const { nome } = req.body;

    if (!nome || !nome.trim()) {
      return res.status(400).json({ error: 'nome é obrigatório.' });
    }

    const nome_normalizado = normalizeName(nome.trim());

    const { data, error } = await supabaseAdmin
      .from('proibidos')
      .insert({ nome_normalizado, nome_original: nome.trim() })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: `"${nome_normalizado}" já está na lista de bloqueados.` });
      }
      return res.status(500).json({ error: error.message });
    }

    try { await reloadData(supabaseAdmin); } catch (reloadErr) {
      console.warn('[proibidos] reload failed:', reloadErr.message);
    }

    return res.status(201).json(data);
  } catch (err) {
    console.error('[proibidos/POST]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/proibidos/:id
// ---------------------------------------------------------------------------
router.delete('/:id', auth, async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('proibidos')
      .delete()
      .eq('id', parseInt(req.params.id, 10));

    if (error) return res.status(500).json({ error: error.message });

    try { await reloadData(supabaseAdmin); } catch (reloadErr) {
      console.warn('[proibidos] reload failed:', reloadErr.message);
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('[proibidos/DELETE]', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
