'use strict';

/**
 * Funcionários routes
 *
 * GET    /api/funcionarios      — list all active employees
 * POST   /api/funcionarios      — create new employee
 * PUT    /api/funcionarios/:id  — update employee
 * DELETE /api/funcionarios/:id  — deactivate employee (soft delete)
 */

const express = require('express');
const auth    = require('../middleware/auth');
const { supabaseAdmin } = require('../db/supabase');
const { reloadData } = require('../services/matcher');

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /api/funcionarios
// ---------------------------------------------------------------------------
router.get('/', auth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('funcionarios')
      .select('*')
      .eq('ativo', true)
      .order('nome', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json(data || []);
  } catch (err) {
    console.error('[funcionarios/GET]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/funcionarios
// ---------------------------------------------------------------------------
router.post('/', auth, async (req, res) => {
  try {
    const { nome, funcao } = req.body;
    if (!nome || !funcao) {
      return res.status(400).json({ error: 'nome e funcao são obrigatórios.' });
    }

    const { data, error } = await supabaseAdmin
      .from('funcionarios')
      .insert({ nome: nome.trim(), funcao: funcao.trim(), ativo: true })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    await reloadData(supabaseAdmin);
    return res.status(201).json(data);
  } catch (err) {
    console.error('[funcionarios/POST]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/funcionarios/:id
// ---------------------------------------------------------------------------
router.put('/:id', auth, async (req, res) => {
  try {
    const { nome, funcao } = req.body;
    const updates = {};
    if (nome) updates.nome = nome.trim();
    if (funcao) updates.funcao = funcao.trim();

    const { data, error } = await supabaseAdmin
      .from('funcionarios')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    await reloadData(supabaseAdmin);
    return res.json(data);
  } catch (err) {
    console.error('[funcionarios/PUT]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/funcionarios/:id  (soft delete — sets ativo = false)
// ---------------------------------------------------------------------------
router.delete('/:id', auth, async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('funcionarios')
      .update({ ativo: false })
      .eq('id', req.params.id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    await reloadData(supabaseAdmin);
    return res.json({ success: true });
  } catch (err) {
    console.error('[funcionarios/DELETE]', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
