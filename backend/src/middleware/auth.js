'use strict';

const { supabase } = require('../db/supabase');

/**
 * Supabase JWT authentication middleware.
 * Extracts Bearer token from Authorization header,
 * verifies it with Supabase, and attaches the user to req.user.
 */
async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticação ausente ou inválido.' });
    }

    const token = authHeader.slice(7); // Remove "Bearer "

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data || !data.user) {
      return res.status(401).json({ error: 'Token inválido ou expirado.' });
    }

    req.user = data.user;
    next();
  } catch (err) {
    console.error('[auth] Erro ao verificar token:', err);
    return res.status(401).json({ error: 'Erro ao verificar autenticação.' });
  }
}

module.exports = authMiddleware;
