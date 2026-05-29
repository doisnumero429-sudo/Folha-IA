'use strict';

/**
 * AI cascade for medical certificate (atestado) OCR.
 *
 * Providers tried in order:
 *   1. Google Gemini  — gemini-2.5-flash → gemini-2.5-flash-lite (native PDF support)
 *   2. xAI Grok       — grok-2-vision-1212 (OpenAI-compatible)
 *   3. OpenRouter     — qwen/qwen2.5-vl-72b-instruct:free (OpenAI-compatible)
 *
 * Each provider is skipped if its API key is not configured.
 * Falls through on rate-limit, quota, or any error.
 *
 * CID (disease code) is never extracted or stored.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

// ---------------------------------------------------------------------------
// Shared prompt
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
// Helpers
// ---------------------------------------------------------------------------

function normalizeResult(parsed) {
  if (parsed.total_dias_afastados !== null && parsed.total_dias_afastados !== undefined) {
    parsed.total_dias_afastados = parseInt(parsed.total_dias_afastados, 10) || 0;
  } else {
    parsed.total_dias_afastados = null;
  }
  return parsed;
}

function parseJSON(rawText) {
  const jsonText = rawText
    .replace(/^```json?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  return JSON.parse(jsonText);
}

function isRateLimit(err) {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  const status = err.status || err.statusCode || (err.response && err.response.status);
  return (
    status === 429 ||
    msg.includes('quota') ||
    msg.includes('rate') ||
    msg.includes('resource_exhausted') ||
    msg.includes('overloaded') ||
    msg.includes('unavailable') ||
    msg.includes('too many requests')
  );
}

// ---------------------------------------------------------------------------
// Provider 1: Google Gemini
// ---------------------------------------------------------------------------
async function tryGemini(fileBuffer, mimeType) {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY não configurada — skip');

  const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const base64 = fileBuffer.toString('base64');

  async function callModel(modelName) {
    const model = client.getGenerativeModel({ model: modelName });
    const result = await model.generateContent([
      EXTRACTION_PROMPT,
      { inlineData: { mimeType, data: base64 } },
    ]);
    return normalizeResult(parseJSON(result.response.text().trim()));
  }

  try {
    return await callModel('gemini-2.5-flash');
  } catch (err) {
    if (isRateLimit(err)) {
      console.warn('[ai/gemini] Flash rate-limited, trying lite:', err.message);
      return await callModel('gemini-2.5-flash-lite-preview-06-17');
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Provider 2: xAI Grok (OpenAI-compatible)
// ---------------------------------------------------------------------------
async function tryGrok(fileBuffer, mimeType) {
  if (!process.env.GROK_API_KEY) throw new Error('GROK_API_KEY não configurada — skip');

  // Grok supports images natively; PDF is passed as image/jpeg fallback
  const supportedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const effectiveMime = supportedMimes.includes(mimeType) ? mimeType : 'image/jpeg';

  const client = new OpenAI({
    apiKey: process.env.GROK_API_KEY,
    baseURL: 'https://api.x.ai/v1',
  });

  const base64 = fileBuffer.toString('base64');
  const dataUrl = `data:${effectiveMime};base64,${base64}`;

  const response = await client.chat.completions.create({
    model: 'grok-2-vision-1212',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: EXTRACTION_PROMPT },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
    max_tokens: 512,
  });

  const rawText = response.choices[0]?.message?.content?.trim() || '';
  return normalizeResult(parseJSON(rawText));
}

// ---------------------------------------------------------------------------
// Provider 3: OpenRouter (OpenAI-compatible)
// ---------------------------------------------------------------------------
async function tryOpenRouter(fileBuffer, mimeType) {
  if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY não configurada — skip');

  const supportedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const effectiveMime = supportedMimes.includes(mimeType) ? mimeType : 'image/jpeg';

  const client = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': 'https://folha-ia.vercel.app',
      'X-Title': 'Folha IA Araçá Grill',
    },
  });

  const base64 = fileBuffer.toString('base64');
  const dataUrl = `data:${effectiveMime};base64,${base64}`;

  const response = await client.chat.completions.create({
    model: 'qwen/qwen2.5-vl-72b-instruct:free',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: EXTRACTION_PROMPT },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
    max_tokens: 512,
  });

  const rawText = response.choices[0]?.message?.content?.trim() || '';
  return normalizeResult(parseJSON(rawText));
}

// ---------------------------------------------------------------------------
// Public: cascade through all providers
// ---------------------------------------------------------------------------
const PROVIDERS = [
  { name: 'Gemini',      fn: tryGemini      },
  { name: 'Grok',        fn: tryGrok        },
  { name: 'OpenRouter',  fn: tryOpenRouter  },
];

async function extractCertificate(fileBuffer, mimeType) {
  let lastError;

  for (const { name, fn } of PROVIDERS) {
    try {
      const result = await fn(fileBuffer, mimeType);
      console.log(`[ai] Sucesso com ${name}`);
      return result;
    } catch (err) {
      const msg = err.message || '';
      const isSkip = msg.includes('— skip');
      if (!isSkip) {
        console.warn(`[ai/${name}] Falhou, tentando próximo:`, msg);
      }
      lastError = err;
    }
  }

  throw new Error(
    `Todos os provedores de IA falharam. Último erro: ${lastError?.message || 'desconhecido'}`
  );
}

module.exports = { extractCertificate };
