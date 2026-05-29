'use strict';

/**
 * Atestados (medical certificates) routes
 *
 * POST   /api/atestados            — upload cert image/PDF, call Gemini, save
 * GET    /api/atestados/:fechamentoId — list certificates for a closing
 * PUT    /api/atestados/:id        — update certificate data
 * DELETE /api/atestados/:id        — delete certificate
 */

const express = require('express');
const multer  = require('multer');

const auth              = require('../middleware/auth');
const { supabaseAdmin } = require('../db/supabase');
const { extractCertificate } = require('../services/gemini');
const { matchName }     = require('../services/matcher');
const { findConflicts } = require('../services/dsr');

const router  = express.Router();
const storage = multer.memoryStorage();
const upload  = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Tipo de arquivo não suportado. Envie PDF ou imagem.'));
  },
});

// ---------------------------------------------------------------------------
// POST /api/atestados
// ---------------------------------------------------------------------------
router.post('/', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    const { fechamento_id, funcionario_id } = req.body;
    if (!fechamento_id) {
      return res.status(400).json({ error: 'fechamento_id é obrigatório.' });
    }

    // Verify fechamento
    const { data: fechamento, error: fErr } = await supabaseAdmin
      .from('fechamentos')
      .select('*')
      .eq('id', fechamento_id)
      .single();
    if (fErr || !fechamento) {
      return res.status(404).json({ error: 'Fechamento não encontrado.' });
    }
    if (fechamento.status === 'aprovado') {
      return res.status(409).json({ error: 'Fechamento já aprovado.' });
    }

    // Extract data via AI cascade (Gemini → Grok → OpenRouter)
    let extracted = null;
    try {
      extracted = await extractCertificate(req.file.buffer, req.file.mimetype);
    } catch (aiErr) {
      // Log full detail internally; never expose provider error messages to the client
      console.error('[atestados] AI extraction failed:', aiErr.message);
      return res.status(502).json({
        error: 'Não foi possível processar o atestado com IA. Verifique se o arquivo está legível e tente novamente.',
      });
    }

    // Resolve employee: prefer explicit funcionario_id, else try to match name
    let resolved_funcionario_id = funcionario_id ? parseInt(funcionario_id, 10) : null;
    let matchWarning = null;

    if (!resolved_funcionario_id && extracted.nome_paciente) {
      const matchResult = matchName(extracted.nome_paciente);
      if (matchResult.type === 'match') {
        resolved_funcionario_id = matchResult.funcionario.id;
      } else {
        matchWarning = `Nome "${extracted.nome_paciente}" não encontrado na folha — associação manual necessária.`;
      }
    }

    // Save atestado
    const { data: saved, error: saveErr } = await supabaseAdmin
      .from('atestados')
      .insert({
        fechamento_id,
        funcionario_id: resolved_funcionario_id || null,
        data_emissao:   extracted.data_emissao   || null,
        periodo_inicio: extracted.periodo_inicio  || null,
        periodo_fim:    extracted.periodo_fim      || null,
        dias_afastados: extracted.total_dias_afastados || 0,
        medico:         extracted.medico          || null,
        crm:            extracted.crm             || null,
        nome_extraido:  extracted.nome_paciente   || null,
      })
      .select()
      .single();

    if (saveErr) {
      return res.status(500).json({ error: 'Erro ao salvar atestado: ' + saveErr.message });
    }

    // Save document reference
    await supabaseAdmin.from('documentos').insert({
      fechamento_id,
      tipo: 'atestado',
      nome_arquivo: req.file.originalname,
      tamanho: req.file.size,
    });

    // Check for conflicts if employee resolved
    let conflicts = [];
    if (resolved_funcionario_id && extracted.periodo_inicio && extracted.periodo_fim) {
      const { data: faltasDatas } = await supabaseAdmin
        .from('faltas_datas')
        .select('data')
        .eq('fechamento_id', fechamento_id)
        .eq('funcionario_id', resolved_funcionario_id);

      const dates = (faltasDatas || []).map(f => f.data);
      if (dates.length > 0) {
        conflicts = findConflicts(dates, [saved]);

        // If there are conflicts, save pendencia
        if (conflicts.length > 0) {
          await supabaseAdmin.from('pendencias').insert({
            fechamento_id,
            tipo: 'conflito_falta_atestado',
            descricao: `Conflito: ${conflicts.length} falta(s) registradas no período do atestado (${extracted.periodo_inicio} a ${extracted.periodo_fim}).`,
            nome_original: extracted.nome_paciente || null,
          });
        }
      }
    }

    return res.status(201).json({
      atestado: saved,
      extracted,
      conflicts,
      warning: matchWarning || undefined,
    });
  } catch (err) {
    console.error('[atestados/POST]', err);
    return res.status(500).json({ error: 'Erro interno ao processar atestado.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/atestados/:fechamentoId
// ---------------------------------------------------------------------------
router.get('/:fechamentoId', auth, async (req, res) => {
  try {
    const { fechamentoId } = req.params;

    const { data, error } = await supabaseAdmin
      .from('atestados')
      .select('*, funcionarios(nome, funcao)')
      .eq('fechamento_id', fechamentoId)
      .order('created_at', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json(data || []);
  } catch (err) {
    console.error('[atestados/GET]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/atestados/:id
// ---------------------------------------------------------------------------
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      funcionario_id,
      data_emissao,
      periodo_inicio,
      periodo_fim,
      dias_afastados,
      medico,
      crm,
    } = req.body;

    const updates = {};
    if (funcionario_id  !== undefined) updates.funcionario_id  = funcionario_id;
    if (data_emissao    !== undefined) updates.data_emissao    = data_emissao;
    if (periodo_inicio  !== undefined) updates.periodo_inicio  = periodo_inicio;
    if (periodo_fim     !== undefined) updates.periodo_fim     = periodo_fim;
    if (dias_afastados  !== undefined) updates.dias_afastados  = dias_afastados;
    if (medico          !== undefined) updates.medico          = medico;
    if (crm             !== undefined) updates.crm             = crm;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar.' });
    }

    const { data, error } = await supabaseAdmin
      .from('atestados')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    if (!data) {
      return res.status(404).json({ error: 'Atestado não encontrado.' });
    }

    return res.json(data);
  } catch (err) {
    console.error('[atestados/PUT]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/atestados/:id
// ---------------------------------------------------------------------------
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('atestados')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('[atestados/DELETE]', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
