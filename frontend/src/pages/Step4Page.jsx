import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import StepIndicator from '../components/StepIndicator'
import api from '../api/client'
import { formatDate } from '../utils/format'

export default function Step4Page() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [employees, setEmployees] = useState([])
  const [faltas, setFaltas] = useState([])
  const [loadingFaltas, setLoadingFaltas] = useState(true)
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [addError, setAddError] = useState(null)

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
    if (!selectedEmployee || !selectedDate) return
    setAdding(true)
    setAddError(null)
    try {
      const res = await api.post(`/fechamento/${id}/faltas`, {
        funcionario_id: selectedEmployee,
        data: selectedDate
      })
      const newFalta = res.data.falta || res.data
      setFaltas(prev => [...prev, newFalta])
      setSelectedDate('')
    } catch (err) {
      setAddError(err.response?.data?.error || 'Erro ao adicionar falta')
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

  // Group faltas by employee for DSR preview
  const faltasByEmployee = faltas.reduce((acc, f) => {
    const empId = f.funcionario_id
    if (!acc[empId]) acc[empId] = { count: 0, nome: f.funcionario_nome || f.nome || empId }
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
            Registre as faltas não justificadas dos funcionários para o mês.
          </p>
        </div>

        {/* Add falta form */}
        <div
          className="rounded-xl border p-6 mb-6"
          style={{ backgroundColor: '#241f1c', borderColor: '#3c3330' }}
        >
          <h2 className="font-semibold text-stone-200 mb-4">Adicionar Falta</h2>

          {addError && (
            <div className="mb-4 px-4 py-2 rounded bg-red-800/30 border border-red-600 text-red-300 text-sm">
              {addError}
            </div>
          )}

          <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
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
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg bg-stone-800 border text-stone-100 focus:outline-none"
                style={{ borderColor: '#3c3330' }}
                onFocus={e => e.target.style.borderColor = '#9a7520'}
                onBlur={e => e.target.style.borderColor = '#3c3330'}
              />
            </div>

            <button
              type="submit"
              disabled={adding || !selectedEmployee || !selectedDate}
              className="px-6 py-3 rounded-lg font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
              style={{ backgroundColor: '#9a7520' }}
            >
              {adding ? 'Adicionando...' : '+ Adicionar'}
            </button>
          </form>
        </div>

        {/* List of faltas */}
        <div
          className="rounded-xl border"
          style={{ backgroundColor: '#241f1c', borderColor: '#3c3330' }}
        >
          <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: '#3c3330' }}>
            <h2 className="font-semibold text-stone-200">Faltas Lançadas</h2>
            <span
              className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ backgroundColor: 'rgba(154,117,32,0.15)', color: '#c9a96e' }}
            >
              {faltas.length} registro{faltas.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loadingFaltas ? (
            <div className="flex items-center justify-center py-10">
              <div
                className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: '#9a7520', borderTopColor: 'transparent' }}
              />
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
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'rgba(245,158,11,0.15)' }}
                    >
                      <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-stone-200">
                        {f.funcionario_nome || f.nome || employees.find(e => e.id === f.funcionario_id)?.nome || 'Funcionário'}
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
          <div
            className="rounded-xl border mt-4 p-5"
            style={{ backgroundColor: '#241f1c', borderColor: '#3c3330' }}
          >
            <h3 className="font-semibold text-stone-300 mb-3 text-sm">Prévia de Descontos por DSR</h3>
            <div className="space-y-2">
              {Object.entries(faltasByEmployee).map(([empId, data]) => {
                const dsrEstimado = Math.floor(data.count / 6)
                return (
                  <div key={empId} className="flex items-center justify-between text-sm">
                    <span className="text-stone-300">{data.nome}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-amber-400">{data.count} falta{data.count !== 1 ? 's' : ''}</span>
                      {dsrEstimado > 0 && (
                        <span className="text-orange-400">~{dsrEstimado} DSR</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-stone-600 text-xs mt-3">
              * O cálculo exato de DSR é feito pelo sistema na etapa de conferência.
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <button
            onClick={() => navigate(`/fechamento/${id}/vales`)}
            className="px-5 py-2.5 rounded-lg border font-medium text-stone-300 hover:bg-stone-800 transition-colors"
            style={{ borderColor: '#3c3330' }}
          >
            ← Voltar
          </button>
          <button
            onClick={() => navigate(`/fechamento/${id}/atestados`)}
            className="px-6 py-2.5 rounded-lg font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#9a7520' }}
          >
            Próximo: Atestados →
          </button>
        </div>
      </div>
    </Layout>
  )
}
