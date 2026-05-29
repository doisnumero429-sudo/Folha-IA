import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import StepIndicator from '../components/StepIndicator'
import api from '../api/client'
import { MONTHS_PT } from '../utils/format'

export default function Step1Page() {
  const navigate = useNavigate()
  const currentYear = new Date().getFullYear()

  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [ano, setAno] = useState(currentYear)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await api.post('/fechamento', { mes: parseInt(mes), ano: parseInt(ano) })
      const id = res.data.id || res.data.fechamento?.id
      navigate(`/fechamento/${id}/consumo`)
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar fechamento')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-xl mx-auto">
        <StepIndicator currentStep={1} fechamentoId={null} />

        <div
          className="rounded-xl border p-8"
          style={{ backgroundColor: '#241f1c', borderColor: '#3c3330' }}
        >
          <h1 className="text-xl font-bold text-stone-100 mb-1">Novo Fechamento</h1>
          <p className="text-stone-400 text-sm mb-8">
            Selecione o mês e ano de referência para o fechamento de folha.
          </p>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-lg bg-red-900/30 border border-red-600 text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Month */}
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1.5">
                Mês de Referência
              </label>
              <select
                value={mes}
                onChange={e => setMes(parseInt(e.target.value))}
                required
                className="w-full px-4 py-3 rounded-lg bg-stone-800 border text-stone-100 focus:outline-none appearance-none"
                style={{ borderColor: '#3c3330' }}
                onFocus={e => e.target.style.borderColor = '#9a7520'}
                onBlur={e => e.target.style.borderColor = '#3c3330'}
              >
                {MONTHS_PT.map((m, idx) => (
                  <option key={idx + 1} value={idx + 1}>{m}</option>
                ))}
              </select>
            </div>

            {/* Year */}
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1.5">
                Ano
              </label>
              <input
                type="number"
                value={ano}
                onChange={e => setAno(parseInt(e.target.value))}
                min="2020"
                max={currentYear + 1}
                required
                className="w-full px-4 py-3 rounded-lg bg-stone-800 border text-stone-100 focus:outline-none"
                style={{ borderColor: '#3c3330' }}
                onFocus={e => e.target.style.borderColor = '#9a7520'}
                onBlur={e => e.target.style.borderColor = '#3c3330'}
              />
            </div>

            {/* Summary */}
            <div
              className="rounded-lg p-4"
              style={{ backgroundColor: 'rgba(154,117,32,0.08)', borderLeft: '3px solid #9a7520' }}
            >
              <p className="text-sm text-stone-300">
                Fechamento de{' '}
                <span className="font-semibold" style={{ color: '#c9a96e' }}>
                  {MONTHS_PT[mes - 1]} {ano}
                </span>
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="flex-1 py-3 rounded-lg border font-semibold text-stone-300 transition-colors hover:bg-stone-800"
                style={{ borderColor: '#3c3330' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 rounded-lg font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: '#9a7520' }}
              >
                {loading ? 'Criando...' : 'Criar e Continuar →'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  )
}
