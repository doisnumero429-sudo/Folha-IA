'use strict';

/**
 * PIN access routes for the quick "Lançar Faltas" PWA page.
 *
 * POST /api/acesso/pin-login — { pin } → JWT (scope:'falta')
 *
 * There is no username: the operator types only a numeric PIN. We fetch all
 * active operators and bcrypt-compare the PIN against each hash (small N), so
 * we can identify WHO is launching absences without asking for a name.
 */

const express = require('express');
const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcryptjs');

const { supabaseAdmin } = require('../db/supabase');

const router = express.Router();

const JWT_SECRET  = process.env.JWT_SECRET || 'folha-ia-secret-key-change-in-production';
const JWT_EXPIRES = '30d';

router.post('/pin-login', async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin || !/^\d{4,8}$/.test(String(pin))) {
      return res.status(400).json({ error: 'PIN inválido.' });
    }

    const { data: operadores, error } = await supabaseAdmin
      .from('operadores_falta')
      .select('*')
      .eq('ativo', true);

    if (error) return res.status(500).json({ error: 'Erro ao validar PIN.' });

    let matched = null;
    for (const op of (operadores || [])) {
      // eslint-disable-next-line no-await-in-loop
      if (await bcrypt.compare(String(pin), op.pin_hash)) {
        matched = op;
        break;
      }
    }

    if (!matched) {
      return res.status(401).json({ error: 'PIN incorreto.' });
    }

    const token = jwt.sign(
      { scope: 'falta', operador_id: matched.id, nome: matched.nome },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    return res.json({ token, nome: matched.nome });
  } catch (err) {
    console.error('[acesso/pin-login]', err);
    return res.status(500).json({ error: 'Erro ao validar PIN.' });
  }
});

module.exports = router;
