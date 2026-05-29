import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import StepIndicator from '../components/StepIndicator'
import UploadZone from '../components/UploadZone'
import api from '../api/client'
import { formatBRL } from '../utils/format'

function Section({ title, color, borderColor, children, count }) {
  return (
    <div className={`rounded-lg border p-4 ${color}`} style={{ borderColor }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm" style={{ color: borderColor }}>{title}</h3>
        {count !== undefined && (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${borderColor}30`, color: borderColor }}>
            {count}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

function NotFoundRow({ item, employees, onResolved }) {
  const [open, setOpen] = useState(false)
  const [empId, setEmpId] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleCreate() {
    if (!empId) return
    setSaving(true)
    try {
      await api.post('/correlacoes', { alias: item.originalName, funcionario_id: empId })
      onResolved && onResolved(item.originalName)
    } catch (err) {
      console.error('Correlação error:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg p-3 border" style={{ backgroundColor: 'rgba(249,115,22,0.05)', borderColor: '#c2410c40' }}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
          <span className="text-orange-200 text-sm">{item.originalName}</span>
          {item.valor > 0 && <span className="text-orange-400 text-xs">{formatBRL(item.valor)}</span>}
        </div>
        <button
          onClick={() => setOpen(o => !o)}
          className="text-xs px-2.5 py-1 rounded border transition-colors whitespace-nowrap"
          style={{ borderColor: '#9a7520', color: '#c9a96e' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(154,117,32,0.15)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          {open ? 'Cancelar' : '+ Criar Correlação'}
        </button>
      </div>
      {open && (
        <div className="mt-3 flex gap-2">
          <select
            value={empId}
            onChange={e => setEmpId(e.target.value)}
            className="flex-1 px-3 py-1.5 rounded bg-stone-700 border text-stone-100 text-sm focus:outline-none appearance-none"
            style={{ borderColor: '#9a7520' }}
          >
            <option value="">Selecione o funcionário...</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
          <button
            onClick={handleCreate}
            disabled={!empId || saving}
            className="px-3 py-1.5 rounded text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: '#9a7520' }}
          >
            {saving ? '...' : 'Salvar'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function Step2Page() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [employees, setEmployees] = useState([])
  const [resolving, setResolving] = useState({})

  async function handleUpload(file) {
    setLoading(true)
    setResult(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('fechamento_id', id)
      const [res, empRes] = await Promise.all([
        api.post('/upload/consumo', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
        api.get('/funcionarios')
      ])
      setResult(res.data)
      setEmployees(empRes.data || [])
    } catch (err) {
      setResult({ error: err.response?.data?.error || err.message || 'Erro ao processar arquivo' })
    } finally {
      setLoading(false)
    }
  }

  async function resolveAmbiguous(alias, funcionarioId) {
    setResolving(r => ({ ...r, [alias]: true }))
    try {
      await api.post('/correlacoes', { alias, funcionario_id: funcionarioId })
      setResult(prev => {
        if (!prev) return prev
        const newAmbiguous = (prev.ambiguous || []).filter(a => a.originalName !== alias)
        return { ...prev, ambiguous: newAmbiguous }
      })
    } catch (err) {
      console.error('Resolve error:', err)
    } finally {
      setResolving(r => ({ ...r, [alias]: false }))
    }
  }

  function handleNotFoundResolved(originalName) {
    setResult(prev => ({
      ...prev,
      notFound: (prev.notFound || []).filter(n => n.originalName !== originalName)
    }))
  }

  const ambiguous = result?.ambiguous || []
  const hasOpenAmbiguous = ambiguous.length > 0
  const matched = result?.matched || []
  const blocked = result?.blocked || []
  const notFound = result?.notFound || result?.not_found || []
  const ignored = result?.ignored || []
  const rawTotal = result?.rawTotal || 0

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <StepIndicator currentStep={2} fechamentoId={id} />

        <div className="mb-6">
          <h1 className="text-xl font-bold text-stone-100">Relatório de Consumo</h1>
          <p className="text-stone-400 text-sm mt-1">Faça upload do relatório de consumo (.xls) exportado do sistema.</p>
        </div>

        <div className="rounded-xl border p-6 mb-6" style={{ backgroundColor: '#241f1c', borderColor: '#3c3330' }}>
          <UploadZone
            accept=".xls,.xlsx"
            label="Relatório de Consumo (.xls)"
            onUpload={handleUpload}
            loading={loading}
            result={result}
          />
        </div>

        {result && !result.error && (
          <div className="space-y-4">
            {/* Total card */}
            {rawTotal > 0 && (
              <div className="rounded-lg p-4 flex items-center justify-between" style={{ backgroundColor: '#2c2420', border: '1px solid #3c3330' }}>
                <span className="text-stone-400 text-sm">Total processado</span>
                <span className="text-xl font-bold" style={{ color: '#c9a96e' }}>{formatBRL(rawTotal)}</span>
              </div>
            )}

            {matched.length > 0 && (
              <Section title="Funcionários Identificados" color="bg-green-900/10" borderColor="#16a34a" count={matched.length}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-green-800/30">
                        <th className="text-left py-2 text-green-400 font-medium">Nome no Relatório</th>
                        <th className="text-left py-2 text-green-400 font-medium">Funcionário</th>
                        <th className="text-right py-2 text-green-400 font-medium">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matched.map((m, idx) => (
                        <tr key={idx} className="border-b border-green-800/10">
                          <td className="py-2 text-stone-300">{m.entries?.[0]?.originalName || m.alias}</td>
                          <td className="py-2 text-stone-200 font-medium">{m.funcionario?.nome || m.funcionario_nome}</td>
                          <td className="py-2 text-right text-green-300">{formatBRL(m.total || m.valor)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            )}

            {ambiguous.length > 0 && (
              <Section title="Nomes Ambíguos — Requer Ação" color="bg-yellow-900/10" borderColor="#eab308" count={ambiguous.length}>
                <p className="text-yellow-300 text-xs mb-3">Associe cada nome ao funcionário correto para continuar.</p>
                <div className="space-y-3">
                  {ambiguous.map((a, idx) => (
                    <div key={idx} className="rounded-lg p-3 border" style={{ backgroundColor: 'rgba(234,179,8,0.05)', borderColor: '#854d0e' }}>
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <p className="text-yellow-200 font-medium">"{a.originalName}"</p>
                          <p className="text-stone-400 text-xs mt-0.5">Candidatos: {(a.options || []).map(c => c.nome).join(', ')}</p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {(a.options || []).map((c, cidx) => (
                            <button
                              key={cidx}
                              onClick={() => resolveAmbiguous(a.originalName, c.id)}
                              disabled={resolving[a.originalName]}
                              className="px-3 py-1.5 rounded text-xs font-medium border transition-colors disabled:opacity-50"
                              style={{ borderColor: '#9a7520', color: '#c9a96e' }}
                              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(154,117,32,0.15)'}
                              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              {c.nome}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {blocked.length > 0 && (
              <Section title="Nomes Bloqueados" color="bg-red-900/10" borderColor="#dc2626" count={blocked.length}>
                <div className="space-y-1.5">
                  {blocked.map((b, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                      <span className="text-red-200">{b.originalName}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {notFound.length > 0 && (
              <Section title="Não Encontrados — Criar Correlação" color="bg-orange-900/10" borderColor="#f97316" count={notFound.length}>
                <p className="text-orange-300 text-xs mb-3">
                  Esses nomes têm token FUNCIONARIO mas não foram identificados. Crie uma correlação para vinculá-los ao funcionário correto.
                </p>
                <div className="space-y-2">
                  {notFound.map((n, idx) => (
                    <NotFoundRow key={idx} item={n} employees={employees} onResolved={handleNotFoundResolved} />
                  ))}
                </div>
              </Section>
            )}

            {ignored.length > 0 && (
              <Section title="Ignorados" color="bg-stone-800/30" borderColor="#57534e" count={ignored.length}>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {ignored.map((ig, idx) => (
                    <div key={idx} className="text-stone-500 text-xs">{ig.originalName}</div>
                  ))}
                </div>
              </Section>
            )}
          </div>
        )}

        {result && !result.error && (
          <div className="flex justify-between mt-8">
            <button onClick={() => navigate('/fechamento/novo')} className="px-5 py-2.5 rounded-lg border font-medium text-stone-300 hover:bg-stone-800 transition-colors" style={{ borderColor: '#3c3330' }}>
              ← Voltar
            </button>
            <div className="relative group">
              <button
                onClick={() => navigate(`/fechamento/${id}/vales`)}
                disabled={hasOpenAmbiguous}
                className="px-6 py-2.5 rounded-lg font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#9a7520' }}
              >
                Próximo: Vales →
              </button>
              {hasOpenAmbiguous && (
                <div className="absolute bottom-full right-0 mb-2 px-3 py-2 rounded bg-stone-700 text-xs text-stone-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  Resolva todos os nomes ambíguos antes de continuar
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
