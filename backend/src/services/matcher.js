'use strict';

/**
 * Name matching engine for Folha IA.
 *
 * Normalises raw names (uppercase, strip accents, strip non-alpha-space,
 * collapse spaces) then resolves them against the roster via:
 *   1. Blocked list (anti-obfuscation)
 *   2. Hard-coded ambiguous single first names
 *   3. Correlation table lookup (aliases)
 *   3b. Direct canonical name match
 *   4. Contains FUNCIONARIO token but no match → not found
 *   5. Everything else → ignored (client / ex-employee)
 */

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

/**
 * Normalise a raw name: uppercase, remove accents, remove non-A-Z-space,
 * collapse whitespace.
 */
function normalizeName(raw) {
  return String(raw)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics
    .replace(/[^A-Z ]/g, '')          // remove anything not A-Z or space (dots/parens join adjacent letters)
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// In-memory store
// ---------------------------------------------------------------------------

let _employees = [];       // [{ id, nome, funcao, ativo }]
let _correlations = {};    // normalized_alias → funcionario_id
let _blocked = new Set();  // normalized blocked names

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

async function loadData(supabaseAdmin) {
  // Employees
  const { data: emps, error: empErr } = await supabaseAdmin
    .from('funcionarios')
    .select('*')
    .eq('ativo', true);
  if (empErr) throw new Error(`loadData employees: ${empErr.message}`);
  _employees = emps || [];

  // Correlations
  const { data: corrs, error: corrErr } = await supabaseAdmin
    .from('correlacoes')
    .select('*');
  if (corrErr) throw new Error(`loadData correlations: ${corrErr.message}`);
  _correlations = {};
  (corrs || []).forEach(c => {
    _correlations[c.alias] = c.funcionario_id;
  });

  // Blocked
  const { data: probs, error: probErr } = await supabaseAdmin
    .from('proibidos')
    .select('*');
  if (probErr) throw new Error(`loadData blocked: ${probErr.message}`);
  _blocked = new Set((probs || []).map(p => p.nome_normalizado));
}

async function reloadData(supabaseAdmin) {
  await loadData(supabaseAdmin);
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

/**
 * Match a raw name against the roster.
 *
 * Returns one of:
 *   { type: 'match',                    funcionario, normalizedName, originalName }
 *   { type: 'blocked',                  normalizedName, originalName }
 *   { type: 'ambiguous',  options, question, normalizedName, originalName }
 *   { type: 'funcionario_nao_encontrado', normalizedName, originalName }
 *   { type: 'ignored',                  normalizedName, originalName }
 */
function matchName(rawName) {
  const normalized = normalizeName(rawName);

  // ── 1. Blocked list ────────────────────────────────────────────────────────
  if (_blocked.has(normalized)) {
    return { type: 'blocked', normalizedName: normalized, originalName: rawName };
  }

  // ── 2. Hard-coded ambiguous single first names ────────────────────────────
  if (normalized === 'ALEX') {
    const options = _employees.filter(e => normalizeName(e.nome).startsWith('ALEX'));
    return {
      type: 'ambiguous',
      question: 'Qual Alex?',
      options,
      normalizedName: normalized,
      originalName: rawName,
    };
  }
  if (normalized === 'PRISCILA') {
    const options = _employees.filter(e => normalizeName(e.nome).startsWith('PRISCILA'));
    return {
      type: 'ambiguous',
      question: 'Qual Priscila?',
      options,
      normalizedName: normalized,
      originalName: rawName,
    };
  }

  // ── 3. Correlation lookup ─────────────────────────────────────────────────
  if (_correlations[normalized] !== undefined) {
    const funcionario = _employees.find(e => e.id === _correlations[normalized]);
    if (funcionario) {
      return { type: 'match', funcionario, normalizedName: normalized, originalName: rawName };
    }
  }

  // ── 3b. Direct canonical name match ──────────────────────────────────────
  const rosterMatch = _employees.find(e => normalizeName(e.nome) === normalized);
  if (rosterMatch) {
    return { type: 'match', funcionario: rosterMatch, normalizedName: normalized, originalName: rawName };
  }

  // ── 4. Contains FUNCIONARIO token but still unmatched ────────────────────
  if (normalized.includes('FUNCIONARIO')) {
    return { type: 'funcionario_nao_encontrado', normalizedName: normalized, originalName: rawName };
  }

  // ── 5. Ignored (client / ex-employee) ────────────────────────────────────
  return { type: 'ignored', normalizedName: normalized, originalName: rawName };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Accessor for the currently loaded employee list.
 * Returns a shallow copy to prevent external mutation.
 */
function employees() {
  return _employees.slice();
}

module.exports = { normalizeName, matchName, loadData, reloadData, employees };
