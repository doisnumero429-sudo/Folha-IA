import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import StepIndicator from '../components/StepIndicator'
import UploadZone from '../components/UploadZone'
import api from '../api/client'
import { formatDate } from '../utils/format'

// ---------------------------------------------------------------------------
// Prompt to copy to ChatGPT
// ---------------------------------------------------------------------------
const CHATGPT_PROMPT = `Você é um assistente especializado em leitura de atestados médicos brasileiros.

Analise as imagens que vou enviar e extraia as informações de CADA documento.

━━━ TIPOS DE DOCUMENTO ━━━

1. ATESTADO MÉDICO (afastamento): documento que libera o funcionário por doença/lesão por um ou mais dias.
2. DECLARAÇÃO DE COMPARECIMENTO: documento que comprova apenas que o funcionário esteve presente na unidade de saúde em determinado dia — NÃO é afastamento de múltiplos dias.
   → Para declaração de comparecimento: total_dias_afastados = 1, periodo_inicio = data_emissao, periodo_fim = data_emissao.

━━━ REGRAS SOBRE PERÍODO E DIAS ━━━

- Se o documento diz "X dias a partir desta data" (ou "a partir de DD/MM/YYYY"):
  → periodo_inicio = data do início informada (ou data_emissao se disser "desta data")
  → periodo_fim = periodo_inicio + (X - 1) dias
  → total_dias_afastados = X

- Se o documento menciona "pelo turno [Noturno / Vespertino / Matutino]" sem especificar quantidade de dias:
  → total_dias_afastados = 1, periodo_inicio = data_emissao, periodo_fim = data_emissao

- Se já existem periodo_inicio E periodo_fim explícitos no documento, calcule total_dias_afastados = diferença em dias + 1.

- NUNCA deixe periodo_fim como null se você conseguir calculá-lo a partir de periodo_inicio + total_dias_afastados.

━━━ OUTRAS REGRAS ━━━

- NUNCA invente dados. Campo não visível ou ilegível = null.
- Datas no formato YYYY-MM-DD.
- total_dias_afastados deve ser um número inteiro (nunca string).
- crm: somente os dígitos (remova "CRM", "CRM-SP", "SP", traços, espaços).
- cid: código CID-10 como está no documento (ex: M796, J11, M54.5). Se não houver CID = null.
- nome_paciente: nome completo como escrito no documento.

━━━ FORMATO DE RESPOSTA ━━━

Responda APENAS com um bloco de código JSON, sem nenhum texto antes ou depois.
Se for UM documento → retorne um único objeto JSON.
Se forem MÚLTIPLOS documentos → retorne um array JSON com um objeto por documento.

\`\`\`json
{
  "nome_paciente": "nome completo ou null",
  "data_emissao": "YYYY-MM-DD ou null",
  "periodo_inicio": "YYYY-MM-DD ou null",
  "periodo_fim": "YYYY-MM-DD ou null",
  "total_dias_afastados": número inteiro ou null,
  "medico": "nome completo do médico ou null",
  "crm": "somente os dígitos do CRM ou null",
  "cid": "código CID-10 como está no documento ou null"
}
\`\`\`

Envie agora as imagens dos atestados.`

// ---------------------------------------------------------------------------
// Post-process each parsed atestado to fill in derivable fields
// ---------------------------------------------------------------------------
function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function normalizeAtestado(item) {
  const out = { ...item }

  // If periodo_inicio is null but we know it starts on data_emissao (most common case)
  // Only infer when total_dias_afastados is present AND periodo_fim is also null
  // (if the AI explicitly left both null it means the doc only said "X days")
  // We leave this decision to post-processing below.

  // Calculate periodo_fim from periodo_inicio + total_dias (if fim is missing)
  if (out.periodo_inicio && out.total_dias_afastados > 0 && !out.periodo_fim) {
    out.periodo_fim = addDays(out.periodo_inicio, out.total_dias_afastados - 1)
    out._derived_fim = true
  }

  // Calculate periodo_inicio/fim from data_emissao + total_dias when inicio is also missing
  // (covers "X dias a partir desta data" where AI only filled total_dias_afastados)
  if (!out.periodo_inicio && !out.periodo_fim && out.total_dias_afastados > 0 && out.data_emissao) {
    out.periodo_inicio = out.data_emissao
    out.periodo_fim = addDays(out.data_emissao, out.total_dias_afastados - 1)
    out._derived_periodo = true
  }

  // Normalize CID: uppercase, trim spaces
  if (out.cid) out.cid = String(out.cid).toUpperCase().trim()

  // Flag items that need attention
  const warnings = []
  if (!out.nome_paciente) warnings.push('Nome do paciente não identificado')
  if (out.total_dias_afastados === null || out.total_dias_afastados === undefined)
    warnings.push('Dias afastados não identificados — revise')
  if (!out.medico && !out.crm) warnings.push('Médico/CRM não identificado')
  out._warnings = warnings

  return out
}

// ---------------------------------------------------------------------------
// Parse AI response (markdown with JSON code block or raw JSON)
// ---------------------------------------------------------------------------
function parseAIResponse(text) {
  // Try ```json ... ``` block first
  const blockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (blockMatch) {
    try {
      const parsed = JSON.parse(blockMatch[1].trim())
      const arr = Array.isArray(parsed) ? parsed : [parsed]
      return { ok: true, data: arr.map(normalizeAtestado) }
    } catch (e) {
      return { ok: false, error: 'JSON inválido dentro do bloco de código: ' + e.message }
    }
  }
  // Try raw JSON
  const trimmed = text.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      const arr = Array.isArray(parsed) ? parsed : [parsed]
      return { ok: true, data: arr.map(normalizeAtestado) }
    } catch (e) {
      return { ok: false, error: 'JSON inválido: ' + e.message }
    }
  }
  return { ok: false, error: 'Não foi possível encontrar um JSON válido na resposta. Verifique se copiou a resposta completa do ChatGPT.' }
}

// ---------------------------------------------------------------------------
// AtestadoCard (existing saved certificates)
// ---------------------------------------------------------------------------
function AtestadoCard({ atestado, employees, onUpdate, onRemove }) {
  const [editing, setEditing] = useState(false)
  const [data, setData] = useState({ ...atestado })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await api.put(`/atestados/${atestado.id}`, data)
      onUpdate && onUpdate(data)
      setEditing(false)
    } catch (err) {
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  const emp = employees.find(e => e.id === (data.funcionario_id || atestado.funcionario_id))

  return (
    <div className="rounded-xl border p-5" style={{ backgroundColor: '#1e1a17', borderColor: editing ? '#9a7520' : '#3c3330' }}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(59,130,246,0.15)' }}>
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-stone-100 text-sm">{emp?.nome || data.nome_extraido || 'Paciente não identificado'}</p>
            <p className="text-stone-500 text-xs">{data.dias_afastados || 0} dia(s) afastado(s)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!editing ? (
            <>
              <button onClick={() => setEditing(true)} className="p-1.5 rounded transition-colors" style={{ color: '#9a7520' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(154,117,32,0.15)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'} title="Editar">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button onClick={() => onRemove && onRemove(atestado.id)} className="p-1.5 rounded transition-colors" style={{ color: '#ef4444' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'} title="Remover">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </>
          ) : (
            <div className="flex gap-1.5">
              <button onClick={handleSave} disabled={saving} className="px-3 py-1 rounded text-xs font-medium text-white disabled:opacity-50" style={{ backgroundColor: '#16a34a' }}>
                {saving ? '...' : 'Salvar'}
              </button>
              <button onClick={() => { setEditing(false); setData({ ...atestado }) }} className="px-3 py-1 rounded text-xs font-medium bg-stone-600 text-stone-200 hover:bg-stone-500">
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        {[
          { label: 'Paciente', field: 'nome_extraido', type: 'text' },
          { label: 'Data de Emissão', field: 'data_emissao', type: 'date' },
          { label: 'Período Início', field: 'periodo_inicio', type: 'date' },
          { label: 'Período Fim', field: 'periodo_fim', type: 'date' },
          { label: 'Dias Afastados', field: 'dias_afastados', type: 'number' },
          { label: 'Médico', field: 'medico', type: 'text' },
          { label: 'CRM', field: 'crm', type: 'text' },
          { label: 'CID', field: 'cid', type: 'text' },
        ].map(({ label, field, type }) => (
          <div key={field}>
            <label className="text-stone-500 text-xs block mb-1">{label}</label>
            {editing ? (
              <input type={type} min={type === 'number' ? 0 : undefined}
                value={data[field] || (type === 'number' ? 0 : '')}
                onChange={e => setData(d => ({ ...d, [field]: type === 'number' ? parseInt(e.target.value) || 0 : e.target.value }))}
                className="w-full px-3 py-1.5 rounded bg-stone-700 border text-stone-100 text-sm focus:outline-none"
                style={{ borderColor: '#9a7520' }} />
            ) : (
              <span className={field === 'dias_afastados' ? 'text-blue-400 font-semibold' : 'text-stone-200'}>
                {type === 'date' ? (formatDate(data[field]) || '—') : (data[field] ?? '—')}
              </span>
            )}
          </div>
        ))}
        <div>
          <label className="text-stone-500 text-xs block mb-1">Funcionário vinculado</label>
          {editing ? (
            <select value={data.funcionario_id || ''} onChange={e => setData(d => ({ ...d, funcionario_id: e.target.value }))}
              className="w-full px-3 py-1.5 rounded bg-stone-700 border text-stone-100 text-sm focus:outline-none appearance-none"
              style={{ borderColor: '#9a7520' }}>
              <option value="">Não identificado</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          ) : (
            <span className={emp ? 'text-green-400' : 'text-stone-500'}>{emp?.nome || 'Não identificado'}</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function Step5Page() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [employees, setEmployees] = useState([])
  const [atestados, setAtestados] = useState([])

  // ChatGPT flow state
  const [copied, setCopied] = useState(false)
  const [pastedText, setPastedText] = useState('')
  const [parseError, setParseError] = useState(null)
  const [preview, setPreview] = useState(null) // array of parsed items with funcionario_id overrides
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)

  // Direct upload state (secondary method)
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [empRes, atestadosRes] = await Promise.all([
          api.get('/funcionarios'),
          api.get(`/atestados/${id}`)
        ])
        setEmployees(empRes.data || [])
        setAtestados(atestadosRes.data || [])
      } catch (err) {
        console.error('Load error:', err)
      }
    }
    load()
  }, [id])

  function handleCopyPrompt() {
    navigator.clipboard.writeText(CHATGPT_PROMPT).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }).catch(() => {
      // Fallback for browsers without clipboard API
      const ta = document.createElement('textarea')
      ta.value = CHATGPT_PROMPT
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  function handleProcess() {
    setParseError(null)
    setPreview(null)
    if (!pastedText.trim()) return
    const result = parseAIResponse(pastedText)
    if (!result.ok) {
      setParseError(result.error)
      return
    }
    // Enrich each item with funcionario_id (empty by default; user can override)
    setPreview(result.data.map(item => ({ ...item, funcionario_id: '' })))
  }

  async function handleSaveLote() {
    if (!preview || preview.length === 0) return
    setSaving(true)
    setSaveMsg(null)
    try {
      const res = await api.post('/atestados/lote', {
        fechamento_id: id,
        atestados: preview,
      })
      const novos = res.data.saved || []
      setAtestados(prev => [...prev, ...novos])
      setPastedText('')
      setPreview(null)
      setSaveMsg(`${novos.length} atestado(s) salvo(s) com sucesso.`)
    } catch (err) {
      setSaveMsg('Erro ao salvar: ' + (err.response?.data?.error || err.message))
    } finally {
      setSaving(false)
    }
  }

  async function handleUpload(file) {
    setUploading(true)
    setUploadResult(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('fechamento_id', id)
      const res = await api.post('/atestados', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      const newAtestado = res.data.atestado || res.data
      setAtestados(prev => [...prev, newAtestado])
      setUploadResult({ success: true })
    } catch (err) {
      setUploadResult({ error: err.response?.data?.error || 'Não foi possível processar o atestado.' })
    } finally {
      setUploading(false)
    }
  }

  function handleUpdate(updated) {
    setAtestados(prev => prev.map(a => a.id === updated.id ? { ...a, ...updated } : a))
  }

  async function handleRemove(atestadoId) {
    try {
      await api.delete(`/atestados/${atestadoId}`)
      setAtestados(prev => prev.filter(a => a.id !== atestadoId))
    } catch (err) {
      console.error('Remove error:', err)
    }
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <StepIndicator currentStep={5} fechamentoId={id} />

        <div className="mb-6">
          <h1 className="text-xl font-bold text-stone-100">Atestados Médicos</h1>
          <p className="text-stone-400 text-sm mt-1">
            Use o ChatGPT para extrair as informações dos atestados e cole o resultado abaixo.
          </p>
        </div>

        {/* ── ChatGPT Flow ──────────────────────────────────────────────────── */}
        <div className="rounded-xl border mb-5" style={{ backgroundColor: '#241f1c', borderColor: '#3c3330' }}>
          <div className="px-6 py-4 border-b flex items-center gap-3" style={{ borderColor: '#3c3330' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: 'rgba(154,117,32,0.15)' }}>
              🤖
            </div>
            <div>
              <h2 className="font-semibold text-stone-100">Via ChatGPT</h2>
              <p className="text-stone-500 text-xs">Copie o prompt, vá ao ChatGPT, envie as fotos e cole a resposta aqui</p>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Steps */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { n: '1', label: 'Copie o prompt abaixo' },
                { n: '2', label: 'Abra o ChatGPT e cole o prompt' },
                { n: '3', label: 'Envie as fotos dos atestados' },
                { n: '4', label: 'Copie a resposta e cole abaixo' },
              ].map(s => (
                <div key={s.n} className="flex flex-col items-center text-center gap-1.5">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: '#9a7520' }}>{s.n}</div>
                  <p className="text-stone-400 text-xs leading-snug">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Copy prompt button */}
            <div>
              <p className="text-xs text-stone-500 mb-2">Passo 1 — copie este prompt e cole no ChatGPT:</p>
              <button
                onClick={handleCopyPrompt}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition-all"
                style={{
                  backgroundColor: copied ? '#16a34a' : '#9a7520',
                  color: 'white',
                }}
              >
                {copied ? (
                  <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Copiado!</>
                ) : (
                  <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> Copiar Prompt</>
                )}
              </button>
            </div>

            {/* Paste area */}
            <div>
              <p className="text-xs text-stone-500 mb-2">Passo 4 — cole aqui a resposta do ChatGPT:</p>
              <textarea
                value={pastedText}
                onChange={e => { setPastedText(e.target.value); setParseError(null); setPreview(null); setSaveMsg(null) }}
                placeholder={'Cole aqui o JSON retornado pelo ChatGPT...\n\nExemplo:\n```json\n[\n  { "nome_paciente": "João Silva", "total_dias_afastados": 3, ... }\n]\n```'}
                rows={7}
                className="w-full px-4 py-3 rounded-lg bg-stone-900 border text-stone-100 text-sm font-mono focus:outline-none resize-y"
                style={{ borderColor: parseError ? '#dc2626' : '#3c3330' }}
                onFocus={e => !parseError && (e.target.style.borderColor = '#9a7520')}
                onBlur={e => !parseError && (e.target.style.borderColor = '#3c3330')}
              />
              {parseError && <p className="text-red-400 text-xs mt-1.5">{parseError}</p>}
            </div>

            <button
              onClick={handleProcess}
              disabled={!pastedText.trim()}
              className="px-5 py-2.5 rounded-lg font-semibold text-white disabled:opacity-40 transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#9a7520' }}
            >
              Processar resposta →
            </button>

            {/* Preview */}
            {preview && (
              <div>
                <p className="text-sm font-semibold text-stone-200 mb-1">
                  {preview.length} atestado(s) encontrado(s)
                </p>
                <p className="text-xs text-stone-500 mb-3">Revise e corrija os campos antes de salvar. Campos em vermelho precisam de atenção.</p>
                <div className="space-y-3">
                  {preview.map((item, idx) => {
                    const hasWarn = item._warnings && item._warnings.length > 0
                    function upd(field, val) {
                      setPreview(prev => prev.map((p, i) => i === idx ? { ...p, [field]: val } : p))
                    }
                    const inp = (field, type = 'text', placeholder = '') => (
                      <input
                        type={type}
                        value={item[field] ?? ''}
                        placeholder={placeholder || '—'}
                        onChange={e => upd(field, type === 'number' ? (parseInt(e.target.value) || null) : (e.target.value || null))}
                        className="w-full px-2 py-1.5 rounded bg-stone-900 border text-stone-100 text-xs focus:outline-none"
                        style={{ borderColor: (item[field] === null || item[field] === undefined || item[field] === '') ? '#dc2626' : '#4b5563' }}
                        onFocus={e => e.target.style.borderColor = '#9a7520'}
                        onBlur={e => e.target.style.borderColor = (item[field] === null || item[field] === undefined || item[field] === '') ? '#dc2626' : '#4b5563'}
                      />
                    )
                    return (
                      <div key={idx} className="rounded-lg border p-4" style={{ backgroundColor: '#1e1a17', borderColor: hasWarn ? '#dc2626' : '#3c3330' }}>
                        {/* Header */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold text-stone-400">Atestado {idx + 1}</span>
                          {hasWarn && (
                            <div className="flex flex-col gap-0.5">
                              {item._warnings.map((w, wi) => (
                                <span key={wi} className="text-xs text-red-400 flex items-center gap-1">
                                  <span>⚠</span> {w}
                                </span>
                              ))}
                            </div>
                          )}
                          {item._derived_periodo && (
                            <span className="text-xs text-amber-400">período calculado automaticamente</span>
                          )}
                        </div>

                        {/* Editable fields grid */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs mb-3">
                          <div>
                            <label className="text-stone-500 block mb-1">Nome do paciente</label>
                            {inp('nome_paciente', 'text', 'Nome completo')}
                          </div>
                          <div>
                            <label className="text-stone-500 block mb-1">Data de emissão</label>
                            {inp('data_emissao', 'date')}
                          </div>
                          <div>
                            <label className="text-stone-500 block mb-1">
                              Dias afastados
                              {(item.total_dias_afastados === null || item.total_dias_afastados === undefined) && (
                                <span className="text-red-400 ml-1">*obrigatório</span>
                              )}
                            </label>
                            {inp('total_dias_afastados', 'number', '0')}
                          </div>
                          <div>
                            <label className="text-stone-500 block mb-1">CID</label>
                            {inp('cid', 'text', 'ex: J11, M543')}
                          </div>
                          <div>
                            <label className="text-stone-500 block mb-1">Período início</label>
                            {inp('periodo_inicio', 'date')}
                          </div>
                          <div>
                            <label className="text-stone-500 block mb-1">
                              Período fim
                              {item._derived_fim && <span className="text-amber-400 ml-1">(calculado)</span>}
                            </label>
                            {inp('periodo_fim', 'date')}
                          </div>
                          <div>
                            <label className="text-stone-500 block mb-1">Médico</label>
                            {inp('medico', 'text', 'Nome do médico')}
                          </div>
                          <div>
                            <label className="text-stone-500 block mb-1">CRM</label>
                            {inp('crm', 'text', 'Somente dígitos')}
                          </div>
                        </div>

                        {/* Employee binding */}
                        <div>
                          <label className="text-xs text-stone-400 block mb-1">Vincular ao funcionário:</label>
                          <select
                            value={item.funcionario_id || ''}
                            onChange={e => upd('funcionario_id', e.target.value)}
                            className="w-full px-3 py-2 rounded bg-stone-800 border text-stone-100 text-sm focus:outline-none appearance-none"
                            style={{ borderColor: '#9a7520' }}
                          >
                            <option value="">— Sistema identifica pelo nome automaticamente —</option>
                            {employees.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                          </select>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {saveMsg && (
                  <div className={`mt-3 px-4 py-2 rounded text-sm ${saveMsg.startsWith('Erro') ? 'bg-red-800/30 border border-red-600 text-red-300' : 'bg-green-800/30 border border-green-600 text-green-300'}`}>
                    {saveMsg}
                  </div>
                )}

                <button
                  onClick={handleSaveLote}
                  disabled={saving}
                  className="mt-4 flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#16a34a' }}
                >
                  {saving ? 'Salvando...' : `Salvar ${preview.length} atestado(s)`}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Direct Upload (secondary) ─────────────────────────────────────── */}
        <div className="rounded-xl border mb-5" style={{ backgroundColor: '#241f1c', borderColor: '#3c3330' }}>
          <button
            onClick={() => setShowUpload(o => !o)}
            className="w-full px-6 py-4 flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <span className="text-stone-400 text-sm font-medium">ou faça upload direto para IA</span>
              <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(154,117,32,0.15)', color: '#c9a96e' }}>
                requer chave de API
              </span>
            </div>
            <svg className={`w-4 h-4 text-stone-500 transition-transform ${showUpload ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showUpload && (
            <div className="px-6 pb-6 border-t" style={{ borderColor: '#3c3330' }}>
              <div className="pt-4">
                <UploadZone
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  label="Atestado Médico (PDF, JPG, PNG)"
                  onUpload={handleUpload}
                  loading={uploading}
                  result={uploadResult}
                />
                {uploading && <p className="text-center text-stone-400 text-xs mt-2">Processando com IA...</p>}
              </div>
            </div>
          )}
        </div>

        {/* ── Saved certificates ────────────────────────────────────────────── */}
        {atestados.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-stone-200">Atestados Cadastrados</h2>
              <span className="text-xs px-2.5 py-1 rounded-full" style={{ backgroundColor: 'rgba(59,130,246,0.15)', color: '#93c5fd' }}>
                {atestados.length} atestado{atestados.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="space-y-3">
              {atestados.map(a => (
                <AtestadoCard key={a.id} atestado={a} employees={employees} onUpdate={handleUpdate} onRemove={handleRemove} />
              ))}
            </div>
          </div>
        )}

        {atestados.length === 0 && (
          <div className="rounded-xl border-2 border-dashed text-center py-8 mb-6" style={{ borderColor: '#2c2420' }}>
            <p className="text-stone-500 text-sm">Nenhum atestado cadastrado ainda</p>
            <p className="text-stone-600 text-xs mt-1">Se não houver atestados, você pode pular esta etapa.</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-4">
          <button onClick={() => navigate(`/fechamento/${id}/faltas`)}
            className="px-5 py-2.5 rounded-lg border font-medium text-stone-300 hover:bg-stone-800 transition-colors"
            style={{ borderColor: '#3c3330' }}>
            ← Voltar
          </button>
          <button onClick={() => navigate(`/fechamento/${id}/conferencia`)}
            className="px-6 py-2.5 rounded-lg font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#9a7520' }}>
            Próximo: Conferência →
          </button>
        </div>
      </div>
    </Layout>
  )
}
