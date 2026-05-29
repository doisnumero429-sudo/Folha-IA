'use strict';

/**
 * Funcionários routes
 *
 * GET /api/funcionarios  — list all active employees
 */

const express = require('express');
const auth    = require('../middleware/auth');
const { supabaseAdmin } = require('../db/supabase');

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

module.exports = router;
