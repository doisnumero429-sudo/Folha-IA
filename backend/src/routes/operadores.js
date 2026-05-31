'use strict';

/**
 * Operadores de falta (PIN operators) — management routes.
 *
 * These are the people allowed to launch absences from the quick PWA page.
 * They authenticate with a numeric PIN only (no email/username). This CRUD is
 * protected by the FULL auth middleware, so only a logged-in admin can manage
 * who has a PIN — it's exposed under Configurações on the main app.
 *
 * GET    /api/operadores       — list operators (never returns the PIN/hash)
 * POST   /api/operadores       — create operator { nome, pin }
 * PUT    /api/operadores/:id    — update { nome?, pin?, ativo? }
 * DELETE /api/operadores/:id    — remove operator
 *
 * PINs are stored only as a bcrypt hash. To prevent two operators sharing the
 * same PIN (which would make the PIN ambiguous on login), we compare a new PIN
 * against every existing hash before saving.
 */

const express = require('express');
const bcrypt  = require('bcryptjs');

const auth = require('../middleware/auth');
const { supabaseAdmin } = require('../db/supabase');

const router = express.Router();

const SALT_ROUNDS = 10;

function isValidPin(pin) {
  return /^\d{4,8}$/.test(String(pin || ''));
}

// True when `pin` already belongs to one of the operators (optionally ignoring
// one id, used on update). Keeps PINs unique so login stays unambiguous.
async function pinInUse(pin, ignoreId = null) {
  const { data: ops } = await supabaseAdmin
    .from('operadores_falta')
    .select('id, pin_hash');
  for (const op of (ops || [])) {
    if (ignoreId && op.id === ignoreId) continue;
    // eslint-disable-next-line no-await-in-loop
    if (await bcrypt.compare(String(pin), op.pin_hash)) return true;
  }
  return false;
}

// ── GET / ─────────────────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('operadores_falta')
      .select('id, nome, ativo, created_at')
      .order('nome', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  } catch (err) {
    console.error('[operadores/GET]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST / ────────────────────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { nome, pin } = req.body;
    if (!nome || !nome.trim()) return res.status(400).json({ error: 'Nome é obrigatório.' });
    if (!isValidPin(pin)) return res.status(400).json({ error: 'O PIN deve ter de 4 a 8 dígitos numéricos.' });

    if (await pinInUse(pin)) {
      return res.status(409).json({ error: 'Este PIN já está em uso. Escolha outro.' });
    }

    const pin_hash = await bcrypt.hash(String(pin), SALT_ROUNDS);
    const { data, error } = await supabaseAdmin
      .from('operadores_falta')
      .insert({ nome: nome.trim(), pin_hash, ativo: true })
      .select('id, nome, ativo, created_at')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  } catch (err) {
    console.error('[operadores/POST]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── PUT /:id ──────────────────────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, pin, ativo } = req.body;
    const updates = {};

    if (nome !== undefined) {
      if (!nome.trim()) return res.status(400).json({ error: 'Nome não pode ficar vazio.' });
      updates.nome = nome.trim();
    }
    if (ativo !== undefined) updates.ativo = Boolean(ativo);
    if (pin !== undefined && pin !== '' && pin !== null) {
      if (!isValidPin(pin)) return res.status(400).json({ error: 'O PIN deve ter de 4 a 8 dígitos numéricos.' });
      if (await pinInUse(pin, parseInt(id, 10))) {
        return res.status(409).json({ error: 'Este PIN já está em uso. Escolha outro.' });
      }
      updates.pin_hash = await bcrypt.hash(String(pin), SALT_ROUNDS);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar.' });
    }

    const { data, error } = await supabaseAdmin
      .from('operadores_falta')
      .update(updates)
      .eq('id', id)
      .select('id, nome, ativo, created_at')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Operador não encontrado.' });
    return res.json(data);
  } catch (err) {
    console.error('[operadores/PUT]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── DELETE /:id ───────────────────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('operadores_falta')
      .delete()
      .eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  } catch (err) {
    console.error('[operadores/DELETE]', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
