import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import StepIndicator from '../components/StepIndicator'
import EmployeeTable from '../components/EmployeeTable'
import PendingBanner from '../components/PendingBanner'
import api from '../api/client'
import { formatBRL } from '../utils/format'

function SummaryCard({ label, value, sub, color }) {
  return (
    <div
      className="rounded-xl border p-5"
      style={{ backgroundColor: '#241f1c', borderColor: '#3c3330' }}
    >
      <p className="text-stone-400 text-sm mb-1">{label}</p>
      <p className="text-2xl font-bold" style={{ color: color || '#c9a96e' }}>{value}</p>
      {sub && <p className="text-stone-500 text-xs mt-1">{sub}</p>}
    </div>
  )
}

function PendenciaItem({ pendencia, employees, onResolve }) {
  const [resolving, setResolving] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState('')

  async function handleAmbiguousResolve() {
    if (!selectedEmployee) return
    setResolving(true)
    try {
      await api.post('/correlacoes', {
        alias: pendencia.nome_original,
        funcionario_id: selectedEmployee
      })
      onResolve && onResolve(pendencia.id)
    } catch (err) {
      console.error('Resolve error:', err)
    } finally {
      setResolving(false)
    }
  }

  async function handleConflictResolve(action) {
    setResolving(true)
    try {
      await api.put(`/fechamento/${pendencia.fechamento_id}/pendencias/${pendencia.id}`, {
        status: 'resolvida',
        resolucao: action
      })
      onResolve && onResolve(pendencia.id)
    } catch (err) {
      console.error('Resolve error:', err)
    } finally {
      setResolving(false)
    }
  }

  const typeMap = {
    blocked: { label: 'Bloqueado', color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
    bloqueado: { label: 'Bloqueado', color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
    proibido: { label: 'Bloqueado', color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
    ambiguous: { label: 'Ambíguo', color: '#eab308', bg: 'rgba(234,179,8,0.08)' },
    ambiguo: { label: 'Ambíguo', color: '#eab308', bg: 'rgba(234,179,8,0.08)' },
    conflict: { label: 'Conflito', color: '#f97316', bg: 'rgba(249,115,22,0.08)' },
    conflito: { label: 'Conflito', color: '#f97316', bg: 'rgba(249,115,22,0.08)' },
    conflito_falta_atestado: { label: 'Conflito', color: '#f97316', bg: 'rgba(249,115,22,0.08)' },
    nao_encontrado: { label: 'Não encontrado', color: '#f97316', bg: 'rgba(249,115,22,0.08)' },
    ignorado: { label: 'Ignorado', color: '#78716c', bg: 'rgba(120,113,108,0.08)' },
  }
  const typeInfo = typeMap[pendencia.tipo] || { label: pendencia.tipo, color: '#78716c', bg: 'rgba(120,113,108,0.08)' }

  const hasSpecificAction = ['ambiguous', 'ambiguo', 'conflict', 'conflito', 'conflito_falta_atestado'].includes(pendencia.tipo)

  return (
    <div
      className="rounded-lg border p-4"
      style={{ backgroundColor: typeInfo.bg, borderColor: typeInfo.color + '40' }}
    >
      <div className="flex items-start gap-3">
        <span
          className="text-xs px-2 py-0.5 rounded font-medium mt-0.5 flex-shrink-0"
          style={{ backgroundColor: typeInfo.bg, color: typeInfo.color, border: `1px solid ${typeInfo.color}40` }}
        >
          {typeInfo.label}
        </span>
        <div className="flex-1">
          <p className="text-stone-200 text-sm font-medium">
            {pendencia.descricao || pendencia.mensagem || pendencia.message || `${pendencia.tipo}: ${pendencia.nome_original || pendencia.id}`}
          </p>

          {/* Ambiguous resolution UI */}
          {(pendencia.tipo === 'ambiguous' || pendencia.tipo === 'ambiguo') && (
            <div className="mt-3 flex items-center gap-2">
              <select
                value={selectedEmployee}
                onChange={e => setSelectedEmployee(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded bg-stone-700 border text-stone-100 text-sm focus:outline-none"
                style={{ borderColor: '#9a7520' }}
              >
                <option value="">Selecione o funcionário...</option>
                {(pendencia.candidates || pendencia.candidatos || employees).map(e => (
                  <option key={e.id} value={e.id}>{e.nome}</option>
                ))}
              </select>
              <button
                onClick={handleAmbiguousResolve}
                disabled={!selectedEmployee || resolving}
                className="px-3 py-1.5 rounded text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: '#9a7520' }}
              >
                {resolving ? '...' : 'Resolver'}
              </button>
            </div>
          )}

          {/* Generic dismiss button for informational pending items */}
          {!hasSpecificAction && (
            <div className="mt-3">
              <button
                onClick={() => handleConflictResolve('ciente')}
                disabled={resolving}
                className="px-3 py-1.5 rounded text-sm font-medium border transition-colors disabled:opacity-50"
                style={{ borderColor: '#16a34a', color: '#4ade80' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(22,163,74,0.1)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                ✓ Marcar como ciente
              </button>
            </div>
          )}

          {/* Conflict resolution UI */}
          {(pendencia.tipo === 'conflict' || pendencia.tipo === 'conflito' || pendencia.tipo === 'conflito_falta_atestado') && (
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => handleConflictResolve('afastamento')}
                disabled={resolving}
                className="px-3 py-1.5 rounded text-sm font-medium border transition-colors disabled:opacity-50"
                style={{ borderColor: '#3b82f6', color: '#93c5fd' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.1)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                Converter em Afastamento
              </button>
              <button
                onClick={() => handleConflictResolve('falta')}
                disabled={resolving}
                className="px-3 py-1.5 rounded text-sm font-medium border transition-colors disabled:opacity-50"
                style={{ borderColor: '#f59e0b', color: '#fcd34d' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(245,158,11,0.1)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                Manter como Falta
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const TABS = [
  { id: 'funcionarios', label: 'Por Funcionário' },
  { id: 'resumo', label: 'Resumo Geral' },
  { id: 'pendencias', label: 'Pendências' }
]

export default function Step6Page() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('funcionarios')
  const [lancamentos, setLancamentos] = useState([])
  const [pendencias, setPendencias] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)
  const [approveError, setApproveError] = useState(null)
  const [fechamento, setFechamento] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [lancRes, pendRes, empRes, fechRes] = await Promise.all([
        api.get(`/fechamento/${id}/lancamentos`),
        api.get(`/fechamento/${id}/pendencias`),
        api.get('/funcionarios'),
        api.get(`/fechamento/${id}`)
      ])
      setLancamentos(lancRes.data || [])
      setPendencias(pendRes.data || [])
      setEmployees(empRes.data || [])
      setFechamento(fechRes.data || null)
    } catch (err) {
      console.error('Load error:', err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadData() }, [loadData])

  function handleLancamentoUpdate(updated) {
    setLancamentos(prev => prev.map(l =>
      l.funcionario_id === updated.funcionario_id ? { ...l, ...updated } : l
    ))
  }

  function handlePendenciaResolved(pendenciaId) {
    setPendencias(prev => prev.map(p =>
      p.id === pendenciaId ? { ...p, status: 'resolvida' } : p
    ))
  }

  const openPendencias = pendencias.filter(p => p.status !== 'resolvida' && p.status !== 'resolved' && p.status !== 'resolvido')
  const hasOpenPendencias = openPendencias.length > 0

  // Summary calculations
  const totals = lancamentos.reduce(
    (acc, l) => ({
      consumo: acc.consumo + (parseFloat(l.consumo) || 0),
      vales: acc.vales + (parseFloat(l.vales) || 0),
      faltas: acc.faltas + (parseInt(l.faltas) || 0),
      afastados: acc.afastados + (parseInt(l.dias_afastados) || 0),
      descontados: acc.descontados + (parseInt(l.dias_descontados) || 0)
    }),
    { consumo: 0, vales: 0, faltas: 0, afastados: 0, descontados: 0 }
  )

  const comFaltas = lancamentos.filter(l => (parseInt(l.faltas) || 0) > 0).length
  const comAfastamentos = lancamentos.filter(l => (parseInt(l.dias_afastados) || 0) > 0).length

  async function handleApprove() {
    if (hasOpenPendencias) return
    setApproving(true)
    setApproveError(null)
    try {
      await api.post(`/fechamento/${id}/aprovar`)
      navigate(`/fechamento/${id}/gerar`)
    } catch (err) {
      setApproveError(err.response?.data?.error || 'Erro ao aprovar fechamento')
    } finally {
      setApproving(false)
    }
  }

  const pendenciasTab = (
    <span>
      Pendências
      {openPendencias.length > 0 && (
        <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs bg-red-700 text-white">
          {openPendencias.length}
        </span>
      )}
    </span>
  )

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-64">
          <div
            className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: '#9a7520', borderTopColor: 'transparent' }}
          />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <StepIndicator currentStep={6} fechamentoId={id} />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-stone-100">Conferência</h1>
            <p className="text-stone-400 text-sm mt-1">
              Revise os dados antes de aprovar o fechamento.
            </p>
          </div>
          {/* Approve button */}
          <div className="relative group">
            <button
              onClick={handleApprove}
              disabled={hasOpenPendencias || approving}
              className="px-6 py-2.5 rounded-lg font-semibold text-white transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: hasOpenPendencias ? '#57534e' : '#16a34a' }}
            >
              {approving ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderTopColor: 'transparent' }} />
                  Aprovando...
                </span>
              ) : (
                'Aprovar Fechamento ✓'
              )}
            </button>
            {hasOpenPendencias && (
              <div className="absolute bottom-full right-0 mb-2 px-3 py-2 rounded bg-stone-700 text-xs text-stone-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                Resolva todas as pendências antes de aprovar
              </div>
            )}
          </div>
        </div>

        {approveError && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-800/20 border border-red-600 text-red-300 text-sm">
            {approveError}
          </div>
        )}

        {/* Pending banner */}
        <PendingBanner pendencias={openPendencias} />

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b" style={{ borderColor: '#3c3330' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2"
              style={
                activeTab === tab.id
                  ? { color: '#c9a96e', borderBottomColor: '#9a7520', backgroundColor: 'rgba(154,117,32,0.1)' }
                  : { color: '#78716c', borderBottomColor: 'transparent' }
              }
            >
              {tab.id === 'pendencias' ? pendenciasTab : tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'funcionarios' && (
          <EmployeeTable
            lancamentos={lancamentos}
            fechamentoId={id}
            onUpdate={handleLancamentoUpdate}
          />
        )}

        {activeTab === 'resumo' && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <SummaryCard
                label="Total Consumo"
                value={formatBRL(totals.consumo)}
                sub="Descontos de cantina"
              />
              <SummaryCard
                label="Total Vales"
                value={formatBRL(totals.vales)}
                sub="Adiantamentos e vales"
              />
              <SummaryCard
                label="Total Faltas"
                value={totals.faltas}
                sub={`${comFaltas} funcionário(s) com faltas`}
                color="#fbbf24"
              />
              <SummaryCard
                label="Dias Afastados"
                value={totals.afastados}
                sub={`${comAfastamentos} funcionário(s) afastado(s)`}
                color="#60a5fa"
              />
              <SummaryCard
                label="Dias Descontados"
                value={totals.descontados}
                sub="Total de dias a descontar"
                color="#f87171"
              />
              <SummaryCard
                label="Funcionários"
                value={lancamentos.length}
                sub="Total no fechamento"
                color="#a3e635"
              />
            </div>

            {/* Per-employee summary */}
            <div
              className="rounded-xl border overflow-hidden"
              style={{ borderColor: '#3c3330' }}
            >
              <div className="px-5 py-3 border-b" style={{ backgroundColor: '#2c2420', borderColor: '#3c3330' }}>
                <h3 className="font-semibold text-sm" style={{ color: '#c9a96e' }}>Detalhamento por Funcionário</h3>
              </div>
              <div className="divide-y" style={{ borderColor: '#2c2420' }}>
                {lancamentos.map((l, idx) => (
                  <div key={idx} className="px-5 py-3 flex items-center justify-between text-sm">
                    <span className="text-stone-200 font-medium">{l.funcionario?.nome || l.funcionarios?.nome || l.nome}</span>
                    <div className="flex items-center gap-6 text-xs">
                      <span className="text-stone-400">Consumo: <span className="text-stone-200">{formatBRL(l.consumo)}</span></span>
                      <span className="text-stone-400">Vales: <span className="text-stone-200">{formatBRL(l.vales)}</span></span>
                      {(parseInt(l.faltas) || 0) > 0 && (
                        <span className="text-amber-400">{l.faltas} falta(s)</span>
                      )}
                      {(parseInt(l.dias_afastados) || 0) > 0 && (
                        <span className="text-blue-400">{l.dias_afastados} dia(s) afastado(a)</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pendencias' && (
          <div>
            {openPendencias.length === 0 ? (
              <div
                className="rounded-xl border-2 border-dashed text-center py-16"
                style={{ borderColor: '#2c5e2c' }}
              >
                <svg className="w-12 h-12 mx-auto mb-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-green-400 font-semibold">Nenhuma pendência em aberto</p>
                <p className="text-stone-500 text-sm mt-1">
                  Todas as pendências foram resolvidas. Você pode aprovar o fechamento.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-stone-400 text-sm mb-4">
                  {openPendencias.length} pendência{openPendencias.length !== 1 ? 's' : ''} aguardando resolução:
                </p>
                {openPendencias.map((p, idx) => (
                  <PendenciaItem
                    key={p.id || idx}
                    pendencia={p}
                    employees={employees}
                    onResolve={handlePendenciaResolved}
                  />
                ))}
              </div>
            )}

            {/* Also show resolved */}
            {pendencias.filter(p => p.status === 'resolvida' || p.status === 'resolved' || p.status === 'resolvido').length > 0 && (
              <div className="mt-6">
                <h3 className="text-stone-500 text-sm mb-2">Resolvidas:</h3>
                <div className="space-y-2">
                  {pendencias
                    .filter(p => p.status === 'resolvida' || p.status === 'resolved' || p.status === 'resolvido')
                    .map((p, idx) => (
                      <div
                        key={p.id || idx}
                        className="rounded-lg border px-4 py-2 flex items-center gap-3 text-sm opacity-50"
                        style={{ borderColor: '#2c5e2c', backgroundColor: 'rgba(22,163,74,0.05)' }}
                      >
                        <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-stone-400 line-through">
                          {p.descricao || p.mensagem || p.message || p.nome_original || p.id}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <button
            onClick={() => navigate(`/fechamento/${id}/atestados`)}
            className="px-5 py-2.5 rounded-lg border font-medium text-stone-300 hover:bg-stone-800 transition-colors"
            style={{ borderColor: '#3c3330' }}
          >
            ← Voltar
          </button>
          <div className="relative group">
            <button
              onClick={handleApprove}
              disabled={hasOpenPendencias || approving}
              className="px-6 py-2.5 rounded-lg font-semibold text-white transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: hasOpenPendencias ? '#57534e' : '#16a34a' }}
            >
              {approving ? 'Aprovando...' : 'Aprovar e Gerar →'}
            </button>
            {hasOpenPendencias && (
              <div className="absolute bottom-full right-0 mb-2 px-3 py-2 rounded bg-stone-700 text-xs text-stone-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                Resolva todas as pendências antes de aprovar
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
