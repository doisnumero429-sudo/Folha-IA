import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import api from '../api/client'
import { MONTHS_PT, formatDate } from '../utils/format'

const STATUS_STEP_MAP = {
  'novo': 'consumo',
  'consumo': 'consumo',
  'vales': 'vales',
  'faltas': 'faltas',
  'atestados': 'atestados',
  'conferencia': 'conferencia',
  'aprovado': 'gerar',
  'gerado': 'gerar'
}

function StatusBadge({ status }) {
  const map = {
    aprovado: { label: 'Aprovado', bg: 'bg-green-800/30', border: 'border-green-600', text: 'text-green-300' },
    gerado: { label: 'Gerado', bg: 'bg-blue-800/30', border: 'border-blue-600', text: 'text-blue-300' },
    em_andamento: { label: 'Em Andamento', bg: 'bg-yellow-800/30', border: 'border-yellow-600', text: 'text-yellow-300' },
  }
  const norm = status === 'aprovado' ? 'aprovado' : status === 'gerado' ? 'gerado' : 'em_andamento'
  const s = map[norm]
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${s.bg} ${s.border} ${s.text}`}>
      {s.label}
    </span>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [fechamentos, setFechamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/fechamento')
        setFechamentos(res.data || [])
      } catch (err) {
        setError(err.response?.data?.error || 'Erro ao carregar fechamentos')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function handleOpenFechamento(f) {
    const step = STATUS_STEP_MAP[f.status] || 'consumo'
    navigate(`/fechamento/${f.id}/${step}`)
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-stone-100">Fechamentos</h1>
            <p className="text-stone-400 mt-1">Gerencie os fechamentos mensais de folha</p>
          </div>
          <button
            onClick={() => navigate('/fechamento/novo')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#9a7520' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Novo Fechamento
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div
              className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: '#9a7520', borderTopColor: 'transparent' }}
            />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="rounded-lg border border-red-600 bg-red-800/20 px-6 py-4 text-red-300">
            {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && fechamentos.length === 0 && (
          <div
            className="rounded-xl border-2 border-dashed flex flex-col items-center py-20 text-center"
            style={{ borderColor: '#3c3330' }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: 'rgba(154,117,32,0.15)' }}
            >
              <svg className="w-8 h-8" style={{ color: '#9a7520' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-stone-300 font-semibold text-lg">Nenhum fechamento ainda</h2>
            <p className="text-stone-500 mt-2 mb-6">Crie o primeiro fechamento mensal para começar</p>
            <button
              onClick={() => navigate('/fechamento/novo')}
              className="px-6 py-2.5 rounded-lg font-semibold text-white"
              style={{ backgroundColor: '#9a7520' }}
            >
              Criar Fechamento
            </button>
          </div>
        )}

        {/* List */}
        {!loading && !error && fechamentos.length > 0 && (
          <div className="space-y-3">
            {fechamentos.map(f => {
              const monthLabel = MONTHS_PT[(f.mes || 1) - 1] || `Mês ${f.mes}`
              const isAprovado = f.status === 'aprovado' || f.status === 'gerado'
              return (
                <button
                  key={f.id}
                  onClick={() => handleOpenFechamento(f)}
                  className="w-full rounded-xl border p-5 text-left transition-all group"
                  style={{ backgroundColor: '#241f1c', borderColor: '#3c3330' }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#9a7520'
                    e.currentTarget.style.backgroundColor = '#2a231f'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#3c3330'
                    e.currentTarget.style.backgroundColor = '#241f1c'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Month icon */}
                      <div
                        className="w-12 h-12 rounded-lg flex flex-col items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: isAprovado ? 'rgba(22,163,74,0.15)' : 'rgba(154,117,32,0.15)' }}
                      >
                        <span
                          className="text-xs font-bold"
                          style={{ color: isAprovado ? '#86efac' : '#c9a96e' }}
                        >
                          {monthLabel.slice(0, 3).toUpperCase()}
                        </span>
                        <span
                          className="text-lg font-black leading-none"
                          style={{ color: isAprovado ? '#86efac' : '#c9a96e' }}
                        >
                          {f.ano ? String(f.ano).slice(-2) : '--'}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-semibold text-stone-100">
                          {monthLabel} {f.ano}
                        </h3>
                        <p className="text-stone-500 text-sm mt-0.5">
                          Criado em {formatDate(f.created_at?.slice(0, 10) || f.createdAt?.slice(0, 10))}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <StatusBadge status={f.status} />
                      <svg
                        className="w-5 h-5 text-stone-600 group-hover:text-stone-400 transition-colors"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
