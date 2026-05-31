'use strict';

/**
 * Ambíguos (ambiguous single-name triggers) routes
 *
 * GET    /api/ambiguos       — list all ambiguous name triggers
 * POST   /api/ambiguos       — add a new ambiguous trigger
 * DELETE /api/ambiguos/:id   — remove an ambiguous trigger
 *
 * An "ambiguous" trigger is a normalized first name (e.g. "ALEX", "PRISCILA")
 * that, when matched exactly, causes the system to ask the user which employee
 * they mean (since multiple employees share that first name).
 *
 * After any write operation the in-memory matcher is reloaded.
 */

const express = require('express');
const auth    = require('../middleware/auth');
const { supabaseAdmin } = require('../db/supabase');
const { normalizeName, reloadData } = require('../services/matcher');

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /api/ambiguos
// ---------------------------------------------------------------------------
router.get('/', auth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('ambiguos')
      .select('*')
      .order('nome_normalizado', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  } catch (err) {
    console.error('[ambiguos/GET]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/ambiguos
// ---------------------------------------------------------------------------
router.post('/', auth, async (req, res) => {
  try {
    const { nome } = req.body;

    if (!nome || !nome.trim()) {
      return res.status(400).json({ error: 'nome é obrigatório.' });
    }

    const nome_normalizado = normalizeName(nome.trim());

    const { data, error } = await supabaseAdmin
      .from('ambiguos')
      .insert({ nome_normalizado })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: `"${nome_normalizado}" já está na lista de ambíguos.` });
      }
      return res.status(500).json({ error: error.message });
    }

    try { await reloadData(supabaseAdmin); } catch (reloadErr) {
      console.warn('[ambiguos] reload failed:', reloadErr.message);
    }

    return res.status(201).json(data);
  } catch (err) {
    console.error('[ambiguos/POST]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/ambiguos/:id
// ---------------------------------------------------------------------------
router.delete('/:id', auth, async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('ambiguos')
      .delete()
      .eq('id', parseInt(req.params.id, 10));

    if (error) return res.status(500).json({ error: error.message });

    try { await reloadData(supabaseAdmin); } catch (reloadErr) {
      console.warn('[ambiguos] reload failed:', reloadErr.message);
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('[ambiguos/DELETE]', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
