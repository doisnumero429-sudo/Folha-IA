import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import api from '../api/client'

export default function SettingsPage() {
  const [correlacoes, setCorrelacoes] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [newAlias, setNewAlias] = useState('')
  const [newEmployeeId, setNewEmployeeId] = useState('')
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [addError, setAddError] = useState(null)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setLoadError(null)
      try {
        const [corrRes, empRes] = await Promise.all([
          api.get('/correlacoes'),
          api.get('/funcionarios')
        ])
        setCorrelacoes(corrRes.data || [])
        setEmployees(empRes.data || [])
      } catch (err) {
        setLoadError(err.response?.data?.error || 'Erro ao carregar dados')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleAdd(e) {
    e.preventDefault()
    if (!newAlias.trim() || !newEmployeeId) return
    setAdding(true)
    setAddError(null)
    try {
      const res = await api.post('/correlacoes', {
        alias: newAlias.trim(),
        funcionario_id: newEmployeeId
      })
      const nova = res.data.correlacao || res.data
      const emp = employees.find(e => e.id === newEmployeeId)
      setCorrelacoes(prev => [...prev, { ...nova, funcionario_nome: emp?.nome }])
      setNewAlias('')
      setNewEmployeeId('')
    } catch (err) {
      setAddError(err.response?.data?.error || 'Erro ao adicionar correlação')
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(correlacaoId) {
    setDeleting(correlacaoId)
    try {
      await api.delete(`/correlacoes/${correlacaoId}`)
      setCorrelacoes(prev => prev.filter(c => c.id !== correlacaoId))
    } catch (err) {
      console.error('Delete error:', err)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-stone-100">Configurações</h1>
          <p className="text-stone-400 mt-1">Gerencie as correlações de nomes do sistema</p>
        </div>

        {/* Warning notice */}
        <div
          className="rounded-lg p-4 mb-8 flex items-start gap-3"
          style={{ backgroundColor: 'rgba(234,179,8,0.08)', borderLeft: '3px solid #eab308' }}
        >
          <svg className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-yellow-300 font-medium text-sm">Atenção</p>
            <p className="text-yellow-400/80 text-sm mt-1">
              Alterações nas correlações afetam futuros processamentos. Correlações existentes em fechamentos
              anteriores não são alteradas retroativamente.
            </p>
          </div>
        </div>

        {/* Correlações table */}
        <div
          className="rounded-xl border"
          style={{ backgroundColor: '#241f1c', borderColor: '#3c3330' }}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: '#3c3330' }}>
            <div>
              <h2 className="font-semibold text-stone-100">Correlações de Nomes</h2>
              <p className="text-stone-500 text-xs mt-0.5">
                Mapeia nomes dos relatórios para funcionários cadastrados
              </p>
            </div>
            <span
              className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ backgroundColor: 'rgba(154,117,32,0.15)', color: '#c9a96e' }}
            >
              {correlacoes.length} correlação{correlacoes.length !== 1 ? 'ões' : ''}
            </span>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div
                className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: '#9a7520', borderTopColor: 'transparent' }}
              />
            </div>
          )}

          {/* Load error */}
          {loadError && !loading && (
            <div className="px-6 py-4 text-red-300 text-sm">{loadError}</div>
          )}

          {/* Table */}
          {!loading && !loadError && (
            <>
              {correlacoes.length === 0 ? (
                <div className="text-center py-10 text-stone-500">
                  <svg className="w-10 h-10 mx-auto mb-2 text-stone-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Nenhuma correlação cadastrada
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ backgroundColor: '#2c2420' }}>
                        <th className="text-left px-6 py-3 font-semibold" style={{ color: '#c9a96e' }}>
                          Alias (Nome no Relatório)
                        </th>
                        <th className="text-left px-6 py-3 font-semibold" style={{ color: '#c9a96e' }}>
                          Funcionário
                        </th>
                        <th className="text-center px-6 py-3 font-semibold" style={{ color: '#c9a96e' }}>
                          Ação
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {correlacoes.map((c, idx) => {
                        const emp = employees.find(e => e.id === c.funcionario_id)
                        const empNome = emp?.nome || c.funcionario_nome || c.funcionario_id

                        return (
                          <tr
                            key={c.id || idx}
                            className="border-t"
                            style={{
                              borderColor: '#2c2420',
                              backgroundColor: idx % 2 === 0 ? '#1e1a17' : '#1c1917'
                            }}
                          >
                            <td className="px-6 py-3">
                              <code
                                className="px-2 py-0.5 rounded text-sm font-mono"
                                style={{ backgroundColor: 'rgba(154,117,32,0.15)', color: '#c9a96e' }}
                              >
                                {c.alias}
                              </code>
                            </td>
                            <td className="px-6 py-3 text-stone-200">
                              {empNome}
                            </td>
                            <td className="px-6 py-3 text-center">
                              <button
                                onClick={() => handleDelete(c.id)}
                                disabled={deleting === c.id}
                                className="px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50"
                                style={{ color: '#ef4444', backgroundColor: 'transparent' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                {deleting === c.id ? (
                                  <span className="flex items-center gap-1">
                                    <span className="w-3 h-3 border border-t-transparent rounded-full animate-spin" style={{ borderColor: '#ef4444', borderTopColor: 'transparent' }} />
                                    ...
                                  </span>
                                ) : (
                                  'Excluir'
                                )}
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* Add new */}
          <div className="px-6 py-5 border-t" style={{ borderColor: '#3c3330' }}>
            <h3 className="font-medium text-stone-300 mb-3 text-sm">Adicionar Nova Correlação</h3>

            {addError && (
              <div className="mb-3 px-4 py-2 rounded bg-red-800/30 border border-red-600 text-red-300 text-sm">
                {addError}
              </div>
            )}

            <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={newAlias}
                  onChange={e => setNewAlias(e.target.value)}
                  placeholder="Nome no relatório (ex: JOAO SILVA)"
                  required
                  className="w-full px-4 py-2.5 rounded-lg bg-stone-800 border text-stone-100 placeholder-stone-600 text-sm focus:outline-none"
                  style={{ borderColor: '#3c3330' }}
                  onFocus={e => e.target.style.borderColor = '#9a7520'}
                  onBlur={e => e.target.style.borderColor = '#3c3330'}
                />
              </div>

              <div className="flex-1">
                <select
                  value={newEmployeeId}
                  onChange={e => setNewEmployeeId(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-lg bg-stone-800 border text-stone-100 text-sm focus:outline-none appearance-none"
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

              <button
                type="submit"
                disabled={adding || !newAlias.trim() || !newEmployeeId}
                className="px-5 py-2.5 rounded-lg font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
                style={{ backgroundColor: '#9a7520' }}
              >
                {adding ? 'Adicionando...' : '+ Adicionar'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  )
}
