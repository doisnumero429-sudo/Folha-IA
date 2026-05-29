import React, { useEffect, useRef, useState } from 'react'
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

function PasswordModal({ action, label, onConfirm, onClose }) {
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!senha) return
    setLoading(true)
    setError(null)
    try {
      await onConfirm(senha)
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Erro ao confirmar')
    } finally {
      setLoading(false)
    }
  }

  const isDelete = action === 'excluir'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="rounded-xl border w-full max-w-sm p-6" style={{ backgroundColor: '#1c1917', borderColor: isDelete ? '#dc2626' : '#9a7520' }}>
        <h2 className="text-lg font-bold mb-1" style={{ color: isDelete ? '#fca5a5' : '#c9a96e' }}>
          {isDelete ? 'Excluir Fechamento' : 'Reabrir Fechamento'}
        </h2>
        <p className="text-stone-400 text-sm mb-4">
          {isDelete
            ? <>Tem certeza que deseja <strong className="text-red-400">excluir permanentemente</strong> o fechamento de <strong className="text-stone-200">{label}</strong>? Esta ação não pode ser desfeita.</>
            : <>Deseja <strong className="text-yellow-300">reabrir</strong> o fechamento de <strong className="text-stone-200">{label}</strong> para edição?</>
          }
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-stone-400 mb-1.5">Confirme sua senha para continuar</label>
            <input
              ref={inputRef}
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 rounded-lg bg-stone-800 border text-stone-100 text-sm focus:outline-none"
              style={{ borderColor: isDelete ? '#dc2626' : '#9a7520' }}
            />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2 rounded-lg border text-sm font-medium text-stone-300 hover:bg-stone-800 transition-colors"
              style={{ borderColor: '#3c3330' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!senha || loading}
              className="flex-1 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
              style={{ backgroundColor: isDelete ? '#dc2626' : '#9a7520' }}
            >
              {loading ? '...' : isDelete ? 'Excluir' : 'Reabrir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ActionMenu({ fechamento, onReabrir, onExcluir }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const isAprovado = fechamento.status === 'aprovado' || fechamento.status === 'gerado'

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-500 hover:text-stone-200 transition-colors"
        style={{ backgroundColor: open ? 'rgba(154,117,32,0.15)' : 'transparent' }}
        title="Ações"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
        </svg>
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-10 rounded-lg border py-1 min-w-[160px] shadow-xl"
          style={{ backgroundColor: '#1c1917', borderColor: '#3c3330' }}
        >
          {isAprovado && (
            <button
              onClick={() => { setOpen(false); onReabrir() }}
              className="w-full text-left px-4 py-2 text-sm text-yellow-300 hover:bg-stone-800 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Reabrir para edição
            </button>
          )}
          <button
            onClick={() => { setOpen(false); onExcluir() }}
            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-stone-800 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Excluir
          </button>
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [fechamentos, setFechamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modal, setModal] = useState(null) // { action, fechamento }

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/fechamento')
      setFechamentos(res.data || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar fechamentos')
    } finally {
      setLoading(false)
    }
  }

  function handleOpenFechamento(f) {
    const step = STATUS_STEP_MAP[f.status] || 'consumo'
    navigate(`/fechamento/${f.id}/${step}`)
  }

  async function handleReabrir(senha) {
    await api.post(`/fechamento/${modal.fechamento.id}/reabrir`, { senha })
    setModal(null)
    load()
  }

  async function handleExcluir(senha) {
    await api.delete(`/fechamento/${modal.fechamento.id}`, { data: { senha } })
    setModal(null)
    load()
  }

  function labelFor(f) {
    const month = MONTHS_PT[(f.mes || 1) - 1] || `Mês ${f.mes}`
    return `${month} ${f.ano}`
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

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div
              className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: '#9a7520', borderTopColor: 'transparent' }}
            />
          </div>
        )}

        {error && !loading && (
          <div className="rounded-lg border border-red-600 bg-red-800/20 px-6 py-4 text-red-300">
            {error}
          </div>
        )}

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

        {!loading && !error && fechamentos.length > 0 && (
          <div className="space-y-3">
            {fechamentos.map(f => {
              const monthLabel = MONTHS_PT[(f.mes || 1) - 1] || `Mês ${f.mes}`
              const isAprovado = f.status === 'aprovado' || f.status === 'gerado'
              return (
                <div
                  key={f.id}
                  className="rounded-xl border flex items-center group transition-all"
                  style={{ backgroundColor: '#241f1c', borderColor: '#3c3330' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#9a7520'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#3c3330'}
                >
                  {/* Clickable main area */}
                  <button
                    onClick={() => handleOpenFechamento(f)}
                    className="flex-1 p-5 text-left flex items-center gap-4"
                  >
                    <div
                      className="w-12 h-12 rounded-lg flex flex-col items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: isAprovado ? 'rgba(22,163,74,0.15)' : 'rgba(154,117,32,0.15)' }}
                    >
                      <span className="text-xs font-bold" style={{ color: isAprovado ? '#86efac' : '#c9a96e' }}>
                        {monthLabel.slice(0, 3).toUpperCase()}
                      </span>
                      <span className="text-lg font-black leading-none" style={{ color: isAprovado ? '#86efac' : '#c9a96e' }}>
                        {f.ano ? String(f.ano).slice(-2) : '--'}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-stone-100">{monthLabel} {f.ano}</h3>
                      <p className="text-stone-500 text-sm mt-0.5">
                        Criado em {formatDate(f.created_at?.slice(0, 10) || f.createdAt?.slice(0, 10))}
                      </p>
                    </div>
                  </button>

                  {/* Status + actions */}
                  <div className="flex items-center gap-3 pr-4">
                    <StatusBadge status={f.status} />
                    <ActionMenu
                      fechamento={f}
                      onReabrir={() => setModal({ action: 'reabrir', fechamento: f })}
                      onExcluir={() => setModal({ action: 'excluir', fechamento: f })}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {modal && (
        <PasswordModal
          action={modal.action}
          label={labelFor(modal.fechamento)}
          onConfirm={modal.action === 'excluir' ? handleExcluir : handleReabrir}
          onClose={() => setModal(null)}
        />
      )}
    </Layout>
  )
}
