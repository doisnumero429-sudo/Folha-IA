import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import api from '../api/client'

const FUNCOES = [
  'Garçom', 'Aux. Cozinha', 'Aux. Limpeza', 'Churrasqueiro',
  'Caixa', 'Compras', 'Estoque', 'Bar', 'Cumim', 'Vigia', 'Outro'
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('funcionarios')

  // Funcionários state
  const [employees, setEmployees] = useState([])
  const [empLoading, setEmpLoading] = useState(true)
  const [newNome, setNewNome] = useState('')
  const [newFuncao, setNewFuncao] = useState('')
  const [addingEmp, setAddingEmp] = useState(false)
  const [deletingEmp, setDeletingEmp] = useState(null)
  const [empError, setEmpError] = useState(null)

  // Correlações state
  const [correlacoes, setCorrelacoes] = useState([])
  const [corrLoading, setCorrLoading] = useState(true)
  const [newAlias, setNewAlias] = useState('')
  const [newEmployeeId, setNewEmployeeId] = useState('')
  const [addingCorr, setAddingCorr] = useState(false)
  const [deletingCorr, setDeletingCorr] = useState(null)
  const [corrError, setCorrError] = useState(null)

  useEffect(() => {
    loadEmployees()
    loadCorrelacoes()
  }, [])

  async function loadEmployees() {
    setEmpLoading(true)
    try {
      const res = await api.get('/funcionarios')
      setEmployees(res.data || [])
    } catch (err) {
      setEmpError(err.response?.data?.error || 'Erro ao carregar funcionários')
    } finally {
      setEmpLoading(false)
    }
  }

  async function loadCorrelacoes() {
    setCorrLoading(true)
    try {
      const res = await api.get('/correlacoes')
      setCorrelacoes(res.data || [])
    } catch (err) {
      console.error('Erro ao carregar correlações', err)
    } finally {
      setCorrLoading(false)
    }
  }

  // --- Funcionários ---

  async function handleAddEmployee(e) {
    e.preventDefault()
    if (!newNome.trim() || !newFuncao) return
    setAddingEmp(true)
    setEmpError(null)
    try {
      await api.post('/funcionarios', { nome: newNome.trim(), funcao: newFuncao })
      setNewNome('')
      setNewFuncao('')
      await loadEmployees()
    } catch (err) {
      setEmpError(err.response?.data?.error || 'Erro ao adicionar funcionário')
    } finally {
      setAddingEmp(false)
    }
  }

  async function handleDeleteEmployee(id) {
    if (!window.confirm('Desativar este funcionário? Ele não aparecerá mais em novos fechamentos.')) return
    setDeletingEmp(id)
    try {
      await api.delete(`/funcionarios/${id}`)
      setEmployees(prev => prev.filter(e => e.id !== id))
    } catch (err) {
      setEmpError(err.response?.data?.error || 'Erro ao desativar funcionário')
    } finally {
      setDeletingEmp(null)
    }
  }

  // --- Correlações ---

  async function handleAddCorr(e) {
    e.preventDefault()
    if (!newAlias.trim() || !newEmployeeId) return
    setAddingCorr(true)
    setCorrError(null)
    try {
      const res = await api.post('/correlacoes', {
        alias: newAlias.trim(),
        funcionario_id: newEmployeeId
      })
      const nova = res.data.correlacao || res.data
      const emp = employees.find(e => String(e.id) === String(newEmployeeId))
      setCorrelacoes(prev => [...prev, { ...nova, funcionario_nome: emp?.nome }])
      setNewAlias('')
      setNewEmployeeId('')
    } catch (err) {
      setCorrError(err.response?.data?.error || 'Erro ao adicionar correlação')
    } finally {
      setAddingCorr(false)
    }
  }

  async function handleDeleteCorr(id) {
    setDeletingCorr(id)
    try {
      await api.delete(`/correlacoes/${id}`)
      setCorrelacoes(prev => prev.filter(c => c.id !== id))
    } catch (err) {
      console.error('Delete error:', err)
    } finally {
      setDeletingCorr(null)
    }
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-stone-100">Configurações</h1>
          <p className="text-stone-400 mt-1">Gerencie funcionários e correlações de nomes</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b" style={{ borderColor: '#3c3330' }}>
          {[
            { id: 'funcionarios', label: 'Funcionários' },
            { id: 'correlacoes', label: 'Correlações' },
          ].map(tab => (
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
              {tab.label}
            </button>
          ))}
        </div>

        {/* ===== FUNCIONÁRIOS ===== */}
        {activeTab === 'funcionarios' && (
          <div
            className="rounded-xl border"
            style={{ backgroundColor: '#241f1c', borderColor: '#3c3330' }}
          >
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: '#3c3330' }}>
              <div>
                <h2 className="font-semibold text-stone-100">Funcionários Ativos</h2>
                <p className="text-stone-500 text-xs mt-0.5">Cadastre ou desative funcionários</p>
              </div>
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ backgroundColor: 'rgba(154,117,32,0.15)', color: '#c9a96e' }}
              >
                {employees.length} funcionário{employees.length !== 1 ? 's' : ''}
              </span>
            </div>

            {empLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#9a7520', borderTopColor: 'transparent' }} />
              </div>
            ) : (
              <>
                {empError && (
                  <div className="mx-6 mt-4 px-4 py-2 rounded bg-red-800/30 border border-red-600 text-red-300 text-sm">{empError}</div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ backgroundColor: '#2c2420' }}>
                        <th className="text-left px-6 py-3 font-semibold" style={{ color: '#c9a96e' }}>Nome</th>
                        <th className="text-left px-6 py-3 font-semibold" style={{ color: '#c9a96e' }}>Função</th>
                        <th className="text-center px-6 py-3 font-semibold" style={{ color: '#c9a96e' }}>Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((emp, idx) => (
                        <tr
                          key={emp.id}
                          className="border-t"
                          style={{ borderColor: '#2c2420', backgroundColor: idx % 2 === 0 ? '#1e1a17' : '#1c1917' }}
                        >
                          <td className="px-6 py-3 text-stone-200 font-medium">{emp.nome}</td>
                          <td className="px-6 py-3 text-stone-400">{emp.funcao}</td>
                          <td className="px-6 py-3 text-center">
                            <button
                              onClick={() => handleDeleteEmployee(emp.id)}
                              disabled={deletingEmp === emp.id}
                              className="px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50"
                              style={{ color: '#ef4444' }}
                              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'}
                              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              {deletingEmp === emp.id ? '...' : 'Desativar'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Add new employee */}
                <div className="px-6 py-5 border-t" style={{ borderColor: '#3c3330' }}>
                  <h3 className="font-medium text-stone-300 mb-3 text-sm">Adicionar Novo Funcionário</h3>
                  <form onSubmit={handleAddEmployee} className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={newNome}
                        onChange={e => setNewNome(e.target.value)}
                        placeholder="Nome completo"
                        required
                        className="w-full px-4 py-2.5 rounded-lg bg-stone-800 border text-stone-100 placeholder-stone-600 text-sm focus:outline-none"
                        style={{ borderColor: '#3c3330' }}
                        onFocus={e => e.target.style.borderColor = '#9a7520'}
                        onBlur={e => e.target.style.borderColor = '#3c3330'}
                      />
                    </div>
                    <div className="flex-1">
                      <select
                        value={newFuncao}
                        onChange={e => setNewFuncao(e.target.value)}
                        required
                        className="w-full px-4 py-2.5 rounded-lg bg-stone-800 border text-stone-100 text-sm focus:outline-none appearance-none"
                        style={{ borderColor: '#3c3330' }}
                        onFocus={e => e.target.style.borderColor = '#9a7520'}
                        onBlur={e => e.target.style.borderColor = '#3c3330'}
                      >
                        <option value="">Selecione a função...</option>
                        {FUNCOES.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={addingEmp || !newNome.trim() || !newFuncao}
                      className="px-5 py-2.5 rounded-lg font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
                      style={{ backgroundColor: '#9a7520' }}
                    >
                      {addingEmp ? 'Adicionando...' : '+ Adicionar'}
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        )}

        {/* ===== CORRELAÇÕES ===== */}
        {activeTab === 'correlacoes' && (
          <div
            className="rounded-xl border"
            style={{ backgroundColor: '#241f1c', borderColor: '#3c3330' }}
          >
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: '#3c3330' }}>
              <div>
                <h2 className="font-semibold text-stone-100">Correlações de Nomes</h2>
                <p className="text-stone-500 text-xs mt-0.5">Mapeia nomes dos relatórios para funcionários cadastrados</p>
              </div>
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ backgroundColor: 'rgba(154,117,32,0.15)', color: '#c9a96e' }}
              >
                {correlacoes.length} correlação{correlacoes.length !== 1 ? 'ões' : ''}
              </span>
            </div>

            <div
              className="mx-6 mt-4 mb-2 rounded-lg p-3 flex items-start gap-2"
              style={{ backgroundColor: 'rgba(234,179,8,0.08)', borderLeft: '3px solid #eab308' }}
            >
              <svg className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-yellow-400/80 text-xs">
                Alterações afetam apenas futuros processamentos. Fechamentos anteriores não são alterados.
              </p>
            </div>

            {corrLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#9a7520', borderTopColor: 'transparent' }} />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ backgroundColor: '#2c2420' }}>
                        <th className="text-left px-6 py-3 font-semibold" style={{ color: '#c9a96e' }}>Alias (Nome no Relatório)</th>
                        <th className="text-left px-6 py-3 font-semibold" style={{ color: '#c9a96e' }}>Funcionário</th>
                        <th className="text-center px-6 py-3 font-semibold" style={{ color: '#c9a96e' }}>Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {correlacoes.length === 0 ? (
                        <tr><td colSpan={3} className="px-6 py-10 text-center text-stone-500">Nenhuma correlação cadastrada</td></tr>
                      ) : correlacoes.map((c, idx) => {
                        const emp = employees.find(e => String(e.id) === String(c.funcionario_id))
                        return (
                          <tr
                            key={c.id || idx}
                            className="border-t"
                            style={{ borderColor: '#2c2420', backgroundColor: idx % 2 === 0 ? '#1e1a17' : '#1c1917' }}
                          >
                            <td className="px-6 py-3">
                              <code className="px-2 py-0.5 rounded text-sm font-mono" style={{ backgroundColor: 'rgba(154,117,32,0.15)', color: '#c9a96e' }}>
                                {c.alias}
                              </code>
                            </td>
                            <td className="px-6 py-3 text-stone-200">{emp?.nome || c.funcionario_nome || c.funcionario_id}</td>
                            <td className="px-6 py-3 text-center">
                              <button
                                onClick={() => handleDeleteCorr(c.id)}
                                disabled={deletingCorr === c.id}
                                className="px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50"
                                style={{ color: '#ef4444' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                {deletingCorr === c.id ? '...' : 'Excluir'}
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Add new correlation */}
                <div className="px-6 py-5 border-t" style={{ borderColor: '#3c3330' }}>
                  <h3 className="font-medium text-stone-300 mb-3 text-sm">Adicionar Nova Correlação</h3>
                  {corrError && (
                    <div className="mb-3 px-4 py-2 rounded bg-red-800/30 border border-red-600 text-red-300 text-sm">{corrError}</div>
                  )}
                  <form onSubmit={handleAddCorr} className="flex flex-col sm:flex-row gap-3">
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
                      disabled={addingCorr || !newAlias.trim() || !newEmployeeId}
                      className="px-5 py-2.5 rounded-lg font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
                      style={{ backgroundColor: '#9a7520' }}
                    >
                      {addingCorr ? 'Adicionando...' : '+ Adicionar'}
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}
