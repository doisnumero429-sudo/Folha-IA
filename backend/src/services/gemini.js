'use strict';

/**
 * Gemini AI service for medical certificate (atestado) OCR.
 *
 * Sends an image/PDF to Gemini and extracts structured JSON.
 * CID (disease code) is explicitly excluded from extraction.
 *
 * Fallback chain: gemini-2.5-flash → gemini-2.5-flash-lite-preview-06-17
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

let _genAI = null;

function getClient() {
  if (!_genAI) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY não configurada.');
    }
    _genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return _genAI;
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

const EXTRACTION_PROMPT = `Analise este atestado médico e extraia as seguintes informações em JSON.

REGRAS IMPORTANTES:
- Nunca invente dados. Se um campo não estiver visível ou legível, deixe como null.
- NÃO extraia CID (código de doença). Esse campo deve ficar completamente de fora.
- Extraia APENAS os campos listados abaixo.
- Datas no formato YYYY-MM-DD.
- total_dias_afastados deve ser um número inteiro (não uma string).
- Se o documento indicar apenas o número de dias sem informar as datas, preencha total_dias_afastados e deixe periodo_inicio/periodo_fim como null.

Responda APENAS com JSON válido, sem markdown, sem texto extra, sem bloco de código:
{
  "nome_paciente": "nome completo do paciente ou null",
  "data_emissao": "YYYY-MM-DD ou null",
  "periodo_inicio": "YYYY-MM-DD ou null",
  "periodo_fim": "YYYY-MM-DD ou null",
  "total_dias_afastados": número inteiro ou null,
  "medico": "nome do médico ou null",
  "crm": "número do CRM (apenas dígitos) ou null"
}`;

// ---------------------------------------------------------------------------
// Core extraction
// ---------------------------------------------------------------------------

/**
 * Extract medical certificate data from a file buffer.
 *
 * @param {Buffer} fileBuffer
 * @param {string} mimeType  - e.g. 'image/jpeg', 'image/png', 'application/pdf'
 * @returns {Promise<{
 *   nome_paciente: string|null,
 *   data_emissao: string|null,
 *   periodo_inicio: string|null,
 *   periodo_fim: string|null,
 *   total_dias_afastados: number|null,
 *   medico: string|null,
 *   crm: string|null
 * }>}
 */
async function extractCertificate(fileBuffer, mimeType) {
  const client = getClient();

  async function tryModel(modelName) {
    const model = client.getGenerativeModel({ model: modelName });
    const base64 = fileBuffer.toString('base64');

    const result = await model.generateContent([
      EXTRACTION_PROMPT,
      {
        inlineData: {
          mimeType,
          data: base64,
        },
      },
    ]);

    const rawText = result.response.text().trim();

    // Strip markdown code fences if present (model sometimes wraps anyway)
    const jsonText = rawText
      .replace(/^```json?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed = JSON.parse(jsonText);

    // Normalise total_dias_afastados to integer
    if (parsed.total_dias_afastados !== null && parsed.total_dias_afastados !== undefined) {
      parsed.total_dias_afastados = parseInt(parsed.total_dias_afastados, 10) || 0;
    } else {
      parsed.total_dias_afastados = null;
    }

    return parsed;
  }

  // Primary model
  try {
    return await tryModel('gemini-2.5-flash');
  } catch (primaryErr) {
    const shouldFallback =
      primaryErr.status === 429 ||
      (primaryErr.message &&
        (primaryErr.message.includes('quota') ||
          primaryErr.message.includes('unavailable') ||
          primaryErr.message.includes('RESOURCE_EXHAUSTED') ||
          primaryErr.message.includes('overloaded')));

    if (shouldFallback) {
      console.warn('[gemini] Primary model unavailable, falling back to lite:', primaryErr.message);
      return await tryModel('gemini-2.5-flash-lite-preview-06-17');
    }
    throw primaryErr;
  }
}

module.exports = { extractCertificate };
