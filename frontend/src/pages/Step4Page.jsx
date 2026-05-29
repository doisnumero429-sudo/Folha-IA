import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import StepIndicator from '../components/StepIndicator'
import api from '../api/client'
import { formatDate } from '../utils/format'

function getDatesInRange(start, end) {
  if (!start || !end || start > end) return []
  const dates = []
  const cur = new Date(start + 'T12:00:00Z')
  const endDate = new Date(end + 'T12:00:00Z')
  while (cur <= endDate) {
    dates.push(cur.toISOString().slice(0, 10))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return dates
}

export default function Step4Page() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [employees, setEmployees] = useState([])
  const [faltas, setFaltas] = useState([])
  const [loadingFaltas, setLoadingFaltas] = useState(true)

  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [rangeMode, setRangeMode] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')

  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [addError, setAddError] = useState(null)

  const previewDates = rangeMode ? getDatesInRange(rangeStart, rangeEnd) : []

  useEffect(() => {
    async function load() {
      try {
        const [empRes, faltasRes] = await Promise.all([
          api.get('/funcionarios'),
          api.get(`/fechamento/${id}/faltas`)
        ])
        setEmployees(empRes.data || [])
        setFaltas(faltasRes.data || [])
      } catch (err) {
        console.error('Load error:', err)
      } finally {
        setLoadingFaltas(false)
      }
    }
    load()
  }, [id])

  async function handleAdd(e) {
    e.preventDefault()
    if (!selectedEmployee) return
    setAdding(true)
    setAddError(null)

    try {
      if (rangeMode) {
        if (!rangeStart || !rangeEnd) { setAddError('Selecione início e fim do período.'); return }
        if (previewDates.length === 0) { setAddError('Período inválido.'); return }
        const res = await api.post(`/fechamento/${id}/faltas/range`, {
          funcionario_id: selectedEmployee,
          data_inicio: rangeStart,
          data_fim: rangeEnd,
        })
        const novos = res.data.inserted || []
        setFaltas(prev => [...prev, ...novos])
        setRangeStart('')
        setRangeEnd('')
      } else {
        if (!selectedDate) { setAddError('Selecione uma data.'); return }
        const res = await api.post(`/fechamento/${id}/faltas`, {
          funcionario_id: selectedEmployee,
          data: selectedDate,
        })
        const newFalta = res.data.falta || res.data
        setFaltas(prev => [...prev, newFalta])
        setSelectedDate('')
      }
    } catch (err) {
      setAddError(err.response?.data?.error || 'Erro ao adicionar falta(s)')
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(faltaId, idx) {
    setDeleting(faltaId || idx)
    try {
      await api.delete(`/fechamento/${id}/faltas/${faltaId}`)
      setFaltas(prev => prev.filter(f => f.id !== faltaId))
    } catch (err) {
      console.error('Delete error:', err)
    } finally {
      setDeleting(null)
    }
  }

  const faltasByEmployee = faltas.reduce((acc, f) => {
    const empId = f.funcionario_id
    if (!acc[empId]) acc[empId] = { count: 0, nome: f.funcionarios?.nome || f.funcionario_nome || f.nome || empId }
    acc[empId].count++
    return acc
  }, {})

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <StepIndicator currentStep={4} fechamentoId={id} />

        <div className="mb-6">
          <h1 className="text-xl font-bold text-stone-100">Lançamento de Faltas</h1>
          <p className="text-stone-400 text-sm mt-1">
            Registre as faltas não justificadas. Use "Período" para lançar vários dias de uma vez.
          </p>
        </div>

        {/* Add falta form */}
        <div className="rounded-xl border p-6 mb-6" style={{ backgroundColor: '#241f1c', borderColor: '#3c3330' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-stone-200">Adicionar Falta</h2>
            {/* Mode toggle */}
            <div className="flex rounded-lg overflow-hidden border text-xs font-medium" style={{ borderColor: '#3c3330' }}>
              <button
                type="button"
                onClick={() => setRangeMode(false)}
                className="px-3 py-1.5 transition-colors"
                style={{ backgroundColor: !rangeMode ? '#9a7520' : 'transparent', color: !rangeMode ? 'white' : '#78716c' }}
              >
                Data única
              </button>
              <button
                type="button"
                onClick={() => setRangeMode(true)}
                className="px-3 py-1.5 transition-colors"
                style={{ backgroundColor: rangeMode ? '#9a7520' : 'transparent', color: rangeMode ? 'white' : '#78716c' }}
              >
                Período
              </button>
            </div>
          </div>

          {addError && (
            <div className="mb-4 px-4 py-2 rounded bg-red-800/30 border border-red-600 text-red-300 text-sm">{addError}</div>
          )}

          <form onSubmit={handleAdd} className="space-y-3">
            <select
              value={selectedEmployee}
              onChange={e => setSelectedEmployee(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg bg-stone-800 border text-stone-100 focus:outline-none appearance-none"
              style={{ borderColor: '#3c3330' }}
              onFocus={e => e.target.style.borderColor = '#9a7520'}
              onBlur={e => e.target.style.borderColor = '#3c3330'}
            >
              <option value="">Selecione o funcionário...</option>
              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.nome}</option>)}
            </select>

            {!rangeMode ? (
              <div className="flex gap-3">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  required
                  className="flex-1 px-4 py-3 rounded-lg bg-stone-800 border text-stone-100 focus:outline-none"
                  style={{ borderColor: '#3c3330' }}
                  onFocus={e => e.target.style.borderColor = '#9a7520'}
                  onBlur={e => e.target.style.borderColor = '#3c3330'}
                />
                <button
                  type="submit"
                  disabled={adding || !selectedEmployee || !selectedDate}
                  className="px-6 py-3 rounded-lg font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
                  style={{ backgroundColor: '#9a7520' }}
                >
                  {adding ? 'Adicionando...' : '+ Adicionar'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-stone-500 block mb-1">Início do período</label>
                    <input
                      type="date"
                      value={rangeStart}
                      onChange={e => setRangeStart(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-stone-800 border text-stone-100 focus:outline-none"
                      style={{ borderColor: '#3c3330' }}
                      onFocus={e => e.target.style.borderColor = '#9a7520'}
                      onBlur={e => e.target.style.borderColor = '#3c3330'}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500 block mb-1">Fim do período</label>
                    <input
                      type="date"
                      value={rangeEnd}
                      onChange={e => setRangeEnd(e.target.value)}
                      min={rangeStart}
                      className="w-full px-4 py-3 rounded-lg bg-stone-800 border text-stone-100 focus:outline-none"
                      style={{ borderColor: '#3c3330' }}
                      onFocus={e => e.target.style.borderColor = '#9a7520'}
                      onBlur={e => e.target.style.borderColor = '#3c3330'}
                    />
                  </div>
                </div>

                {previewDates.length > 0 && (
                  <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(154,117,32,0.08)', border: '1px solid rgba(154,117,32,0.3)' }}>
                    <p className="text-xs text-stone-400 mb-2">
                      <span className="font-semibold text-yellow-300">{previewDates.length} dia(s)</span> serão adicionados:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {previewDates.map(d => (
                        <span key={d} className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#fcd34d' }}>
                          {formatDate(d)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={adding || !selectedEmployee || previewDates.length === 0}
                  className="w-full px-6 py-3 rounded-lg font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: '#9a7520' }}
                >
                  {adding ? 'Adicionando...' : `+ Adicionar ${previewDates.length > 0 ? previewDates.length + ' dia(s)' : 'período'}`}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Faltas list */}
        <div className="rounded-xl border" style={{ backgroundColor: '#241f1c', borderColor: '#3c3330' }}>
          <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: '#3c3330' }}>
            <h2 className="font-semibold text-stone-200">Faltas Lançadas</h2>
            <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: 'rgba(154,117,32,0.15)', color: '#c9a96e' }}>
              {faltas.length} registro{faltas.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loadingFaltas ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#9a7520', borderTopColor: 'transparent' }} />
            </div>
          ) : faltas.length === 0 ? (
            <div className="text-center py-10 text-stone-500">
              <svg className="w-10 h-10 mx-auto mb-2 text-stone-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Nenhuma falta lançada ainda
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: '#2c2420' }}>
              {faltas.map((f, idx) => (
                <div key={f.id || idx} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(245,158,11,0.15)' }}>
                      <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-stone-200">
                        {f.funcionarios?.nome || f.funcionario_nome || f.nome || employees.find(e => e.id === f.funcionario_id)?.nome || 'Funcionário'}
                      </p>
                      <p className="text-sm text-stone-400">{formatDate(f.data)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(f.id, idx)}
                    disabled={deleting === f.id || deleting === idx}
                    className="p-2 rounded transition-colors disabled:opacity-50"
                    style={{ color: '#ef4444' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    title="Remover falta"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* DSR Preview */}
        {Object.keys(faltasByEmployee).length > 0 && (
          <div className="rounded-xl border mt-4 p-5" style={{ backgroundColor: '#241f1c', borderColor: '#3c3330' }}>
            <h3 className="font-semibold text-stone-300 mb-3 text-sm">Prévia por Funcionário</h3>
            <div className="space-y-2">
              {Object.entries(faltasByEmployee).map(([empId, data]) => (
                <div key={empId} className="flex items-center justify-between text-sm">
                  <span className="text-stone-300">{data.nome}</span>
                  <span className="text-amber-400 font-semibold">{data.count} falta{data.count !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
            <p className="text-stone-600 text-xs mt-3">* DSR exato calculado na conferência.</p>
          </div>
        )}

        <div className="flex justify-between mt-8">
          <button onClick={() => navigate(`/fechamento/${id}/vales`)}
            className="px-5 py-2.5 rounded-lg border font-medium text-stone-300 hover:bg-stone-800 transition-colors"
            style={{ borderColor: '#3c3330' }}>
            ← Voltar
          </button>
          <button onClick={() => navigate(`/fechamento/${id}/atestados`)}
            className="px-6 py-2.5 rounded-lg font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#9a7520' }}>
            Próximo: Atestados →
          </button>
        </div>
      </div>
    </Layout>
  )
}
