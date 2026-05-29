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
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: `${borderColor}30`, color: borderColor }}
          >
            {count}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

export default function Step3Page() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [resolving, setResolving] = useState({})

  async function handleUpload(file) {
    setLoading(true)
    setResult(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('fechamento_id', id)
      const res = await api.post('/upload/vales', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setResult(res.data)
    } catch (err) {
      setResult({ error: err.response?.data?.error || 'Erro ao processar arquivo' })
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
        const newAmbiguous = (prev.ambiguous || prev.ambiguos || []).filter(a => a.alias !== alias)
        return { ...prev, ambiguous: newAmbiguous, ambiguos: newAmbiguous }
      })
    } catch (err) {
      console.error('Resolve error:', err)
    } finally {
      setResolving(r => ({ ...r, [alias]: false }))
    }
  }

  const ambiguous = result?.ambiguous || result?.ambiguos || []
  const hasOpenAmbiguous = ambiguous.length > 0
  const matched = result?.matched || []
  const blocked = result?.blocked || []
  const notFound = result?.not_found || result?.nao_encontrados || []
  const ignored = result?.ignored || result?.ignorados || []

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <StepIndicator currentStep={3} fechamentoId={id} />

        <div className="mb-6">
          <h1 className="text-xl font-bold text-stone-100">Relatório de Vales</h1>
          <p className="text-stone-400 text-sm mt-1">
            Faça upload do relatório de vales (.html) exportado do sistema.
          </p>
        </div>

        {/* Upload zone */}
        <div
          className="rounded-xl border p-6 mb-6"
          style={{ backgroundColor: '#241f1c', borderColor: '#3c3330' }}
        >
          <UploadZone
            accept=".html,.htm"
            label="Relatório de Vales (.html)"
            onUpload={handleUpload}
            loading={loading}
            result={result}
          />
        </div>

        {/* Results */}
        {result && !result.error && (
          <div className="space-y-4">
            {matched.length > 0 && (
              <Section
                title="Funcionários Identificados"
                color="bg-green-900/10"
                borderColor="#16a34a"
                count={matched.length}
              >
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
                          <td className="py-2 text-stone-300">{m.alias || m.nome_relatorio}</td>
                          <td className="py-2 text-stone-200 font-medium">{m.funcionario_nome || m.nome}</td>
                          <td className="py-2 text-right text-green-300">{formatBRL(m.valor || m.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            )}

            {ambiguous.length > 0 && (
              <Section
                title="Nomes Ambíguos — Requer Ação"
                color="bg-yellow-900/10"
                borderColor="#eab308"
                count={ambiguous.length}
              >
                <p className="text-yellow-300 text-xs mb-3">
                  Associe cada nome do relatório ao funcionário correto para continuar.
                </p>
                <div className="space-y-3">
                  {ambiguous.map((a, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg p-3 border"
                      style={{ backgroundColor: 'rgba(234,179,8,0.05)', borderColor: '#854d0e' }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <p className="text-yellow-200 font-medium">"{a.alias || a.nome}"</p>
                          <p className="text-stone-400 text-xs mt-0.5">
                            Candidatos: {(a.candidates || a.candidatos || []).map(c => c.nome).join(', ')}
                          </p>
                        </div>
                        <div className="flex-shrink-0 flex gap-2 flex-wrap">
                          {(a.candidates || a.candidatos || []).map((c, cidx) => (
                            <button
                              key={cidx}
                              onClick={() => resolveAmbiguous(a.alias || a.nome, c.id)}
                              disabled={resolving[a.alias || a.nome]}
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
              <Section
                title="Nomes Bloqueados"
                color="bg-red-900/10"
                borderColor="#dc2626"
                count={blocked.length}
              >
                <div className="space-y-1.5">
                  {blocked.map((b, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                      <span className="text-red-200">{b.alias || b.nome}</span>
                      {b.motivo && <span className="text-red-400 text-xs">— {b.motivo}</span>}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {notFound.length > 0 && (
              <Section
                title="Não Encontrados"
                color="bg-orange-900/10"
                borderColor="#f97316"
                count={notFound.length}
              >
                <div className="space-y-1.5">
                  {notFound.map((n, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
                      <span className="text-orange-200">{n.alias || n.nome || n.valor}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {ignored.length > 0 && (
              <Section
                title="Ignorados"
                color="bg-stone-800/30"
                borderColor="#57534e"
                count={ignored.length}
              >
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {ignored.map((ig, idx) => (
                    <div key={idx} className="text-stone-500 text-xs">
                      {ig.alias || ig.nome || ig}
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>
        )}

        {/* Navigation */}
        {result && !result.error && (
          <div className="flex justify-between mt-8">
            <button
              onClick={() => navigate(`/fechamento/${id}/consumo`)}
              className="px-5 py-2.5 rounded-lg border font-medium text-stone-300 hover:bg-stone-800 transition-colors"
              style={{ borderColor: '#3c3330' }}
            >
              ← Voltar
            </button>
            <div className="relative group">
              <button
                onClick={() => navigate(`/fechamento/${id}/faltas`)}
                disabled={hasOpenAmbiguous}
                className="px-6 py-2.5 rounded-lg font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#9a7520' }}
              >
                Próximo: Faltas →
              </button>
              {hasOpenAmbiguous && (
                <div className="absolute bottom-full right-0 mb-2 px-3 py-2 rounded bg-stone-700 text-xs text-stone-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  Resolva todos os nomes ambíguos antes de continuar
                </div>
              )}
            </div>
          </div>
        )}

        {!result && (
          <div className="flex justify-between mt-8">
            <button
              onClick={() => navigate(`/fechamento/${id}/consumo`)}
              className="px-5 py-2.5 rounded-lg border font-medium text-stone-300 hover:bg-stone-800 transition-colors"
              style={{ borderColor: '#3c3330' }}
            >
              ← Voltar
            </button>
            <button
              onClick={() => navigate(`/fechamento/${id}/faltas`)}
              className="px-6 py-2.5 rounded-lg border font-medium transition-colors"
              style={{ borderColor: '#3c3330', color: '#78716c' }}
            >
              Pular →
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}
