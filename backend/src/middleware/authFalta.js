'use strict';

/**
 * Auth middleware for the quick "Lançar Faltas" flow.
 *
 * Accepts ANY valid JWT signed with our secret — both:
 *   - full operator tokens (email/password login, from /api/auth/login), and
 *   - PIN tokens (scope:'falta', from /api/acesso/pin-login).
 *
 * The decoded payload is attached to req.auth. Use req.auth.nome to know who
 * is launching an absence (works for both token types).
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'folha-ia-secret-key-change-in-production';

function authFalta(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Acesso não autorizado.' });
  }
  try {
    req.auth = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Sessão expirada. Digite o PIN novamente.' });
  }
}

module.exports = authFalta;
