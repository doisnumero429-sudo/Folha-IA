'use strict';

/**
 * Auth route
 *
 * POST /api/auth/login — sign in with email + password via Supabase
 * Returns { token, user }
 */

const express = require('express');
const { supabase } = require('../db/supabase');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email e password são obrigatórios.' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      return res.status(401).json({ error: error?.message || 'Credenciais inválidas.' });
    }

    return res.json({
      token: data.session.access_token,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });
  } catch (err) {
    console.error('[auth/login]', err);
    return res.status(500).json({ error: err.message });
  }
});

router.post('/logout', async (req, res) => {
  // Stateless JWT — client just removes the token.
  return res.json({ success: true });
});

module.exports = router;
