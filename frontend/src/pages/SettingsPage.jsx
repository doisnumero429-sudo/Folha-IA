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

  // Proibidos state
  const [proibidos, setProibidos] = useState([])
  const [probLoading, setProbLoading] = useState(true)
  const [newProibido, setNewProibido] = useState('')
  const [addingProib, setAddingProib] = useState(false)
  const [deletingProib, setDeletingProib] = useState(null)
  const [probError, setProbError] = useState(null)

  // Ambíguos state
  const [ambiguos, setAmbiguos] = useState([])
  const [ambLoading, setAmbLoading] = useState(true)
  const [newAmbiguo, setNewAmbiguo] = useState('')
  const [addingAmb, setAddingAmb] = useState(false)
  const [deletingAmb, setDeletingAmb] = useState(null)
  const [ambError, setAmbError] = useState(null)

  // Operadores state
  const [operadores, setOperadores] = useState([])
  const [opLoading, setOpLoading] = useState(false)
  const [opError, setOpError] = useState(null)
  const [newOpNome, setNewOpNome] = useState('')
  const [newOpPin, setNewOpPin] = useState('')
  const [addingOp, setAddingOp] = useState(false)
  const [deletingOp, setDeletingOp] = useState(null)
  const [togglingOp, setTogglingOp] = useState(null)

  useEffect(() => {
    loadEmployees()
    loadCorrelacoes()
    loadProibidos()
    loadAmbiguos()
  }, [])

  useEffect(() => {
    if (activeTab === 'operadores' && operadores.length === 0 && !opLoading) {
      loadOperadores()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  async function loadOperadores() {
    setOpLoading(true)
    setOpError(null)
    try {
      const res = await api.get('/operadores')
      setOperadores(res.data || [])
    } catch (err) {
      setOpError(err.response?.data?.error || 'Erro ao carregar operadores')
    } finally {
      setOpLoading(false)
    }
  }

  async function handleAddOperador(e) {
    e.preventDefault()
    if (!newOpNome.trim() || !newOpPin.trim()) return
    setAddingOp(true)
    setOpError(null)
    try {
      await api.post('/operadores', { nome: newOpNome.trim(), pin: newOpPin.trim() })
      setNewOpNome('')
      setNewOpPin('')
      await loadOperadores()
    } catch (err) {
      setOpError(err.response?.data?.error || 'Erro ao adicionar operador')
    } finally {
      setAddingOp(false)
    }
  }

  async function handleToggleOperador(op) {
    setTogglingOp(op.id)
    try {
      await api.put(`/operadores/${op.id}`, { ativo: !op.ativo })
      setOperadores(prev => prev.map(o => o.id === op.id ? { ...o, ativo: !op.ativo } : o))
    } catch (err) {
      setOpError(err.response?.data?.error || 'Erro ao atualizar operador')
    } finally {
      setTogglingOp(null)
    }
  }

  async function handleDeleteOperador(id) {
    if (!window.confirm('Excluir este operador? Esta ação não pode ser desfeita.')) return
    setDeletingOp(id)
    try {
      await api.delete(`/operadores/${id}`)
      setOperadores(prev => prev.filter(o => o.id !== id))
    } catch (err) {
      setOpError(err.response?.data?.error || 'Erro ao excluir operador')
    } finally {
      setDeletingOp(null)
    }
  }

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

  async function loadProibidos() {
    setProbLoading(true)
    try {
      const res = await api.get('/proibidos')
      setProibidos(res.data || [])
    } catch (err) {
      setProbError(err.response?.data?.error || 'Erro ao carregar bloqueados')
    } finally {
      setProbLoading(false)
    }
  }

  async function loadAmbiguos() {
    setAmbLoading(true)
    try {
      const res = await api.get('/ambiguos')
      setAmbiguos(res.data || [])
    } catch (err) {
      setAmbError(err.response?.data?.error || 'Erro ao carregar ambíguos')
    } finally {
      setAmbLoading(false)
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

  // --- Proibidos ---

  async function handleAddProibido(e) {
    e.preventDefault()
    if (!newProibido.trim()) return
    setAddingProib(true)
    setProbError(null)
    try {
      const res = await api.post('/proibidos', { nome: newProibido.trim() })
      setProibidos(prev => [...prev, res.data].sort((a, b) => a.nome_original.localeCompare(b.nome_original)))
      setNewProibido('')
    } catch (err) {
      setProbError(err.response?.data?.error || 'Erro ao adicionar bloqueado')
    } finally {
      setAddingProib(false)
    }
  }

  async function handleDeleteProibido(id) {
    if (!window.confirm('Remover este funcionário da lista de bloqueados?')) return
    setDeletingProib(id)
    try {
      await api.delete(`/proibidos/${id}`)
      setProibidos(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      setProbError(err.response?.data?.error || 'Erro ao remover bloqueado')
    } finally {
      setDeletingProib(null)
    }
  }

  // --- Ambíguos ---

  async function handleAddAmbiguo(e) {
    e.preventDefault()
    if (!newAmbiguo.trim()) return
    setAddingAmb(true)
    setAmbError(null)
    try {
      const res = await api.post('/ambiguos', { nome: newAmbiguo.trim() })
      setAmbiguos(prev => [...prev, res.data].sort((a, b) => a.nome_normalizado.localeCompare(b.nome_normalizado)))
      setNewAmbiguo('')
    } catch (err) {
      setAmbError(err.response?.data?.error || 'Erro ao adicionar ambíguo')
    } finally {
      setAddingAmb(false)
    }
  }

  async function handleDeleteAmbiguo(id) {
    if (!window.confirm('Remover esta regra de nome ambíguo?')) return
    setDeletingAmb(id)
    try {
      await api.delete(`/ambiguos/${id}`)
      setAmbiguos(prev => prev.filter(a => a.id !== id))
    } catch (err) {
      setAmbError(err.response?.data?.error || 'Erro ao remover ambíguo')
    } finally {
      setDeletingAmb(null)
    }
  }

  const tabs = [
    { id: 'funcionarios', label: 'Funcionários' },
    { id: 'correlacoes',  label: 'Correlações' },
    { id: 'operadores',   label: 'Operadores PIN' },
    { id: 'proibidos',    label: 'Bloqueados' },
    { id: 'ambiguos',     label: 'Ambíguos' },
  ]

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-stone-100">Configurações</h1>
          <p className="text-stone-400 mt-1">Gerencie funcionários, correlações e regras de reconhecimento</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b" style={{ borderColor: '#3c3330' }}>
          {tabs.map(tab => (
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

        {/* ===== OPERADORES PIN ===== */}
        {activeTab === 'operadores' && (
          <div
            className="rounded-xl border"
            style={{ backgroundColor: '#241f1c', borderColor: '#3c3330' }}
          >
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: '#3c3330' }}>
              <div>
                <h2 className="font-semibold text-stone-100">Operadores PIN</h2>
                <p className="text-stone-500 text-xs mt-0.5">Acesso à página de lançamento rápido de faltas</p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{ backgroundColor: 'rgba(154,117,32,0.15)', color: '#c9a96e' }}
                >
                  {operadores.filter(o => o.ativo).length} ativo{operadores.filter(o => o.ativo).length !== 1 ? 's' : ''}
                </span>
                <a
                  href="/faltas"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-3 py-1.5 rounded-lg font-medium"
                  style={{ backgroundColor: 'rgba(154,117,32,0.2)', color: '#c9a96e', border: '1px solid #9a7520' }}
                >
                  Abrir página ↗
                </a>
              </div>
            </div>

            {opLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#9a7520', borderTopColor: 'transparent' }} />
              </div>
            ) : (
              <>
                {opError && (
                  <div className="mx-6 mt-4 px-4 py-2 rounded bg-red-800/30 border border-red-600 text-red-300 text-sm">{opError}</div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ backgroundColor: '#2c2420' }}>
                        <th className="text-left px-6 py-3 font-semibold" style={{ color: '#c9a96e' }}>Nome</th>
                        <th className="text-center px-6 py-3 font-semibold" style={{ color: '#c9a96e' }}>Status</th>
                        <th className="text-center px-6 py-3 font-semibold" style={{ color: '#c9a96e' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {operadores.length === 0 ? (
                        <tr><td colSpan={3} className="px-6 py-10 text-center text-stone-500">Nenhum operador cadastrado</td></tr>
                      ) : operadores.map((op, idx) => (
                        <tr
                          key={op.id}
                          className="border-t"
                          style={{ borderColor: '#2c2420', backgroundColor: idx % 2 === 0 ? '#1e1a17' : '#1c1917' }}
                        >
                          <td className="px-6 py-3 text-stone-200 font-medium">{op.nome}</td>
                          <td className="px-6 py-3 text-center">
                            <button
                              onClick={() => handleToggleOperador(op)}
                              disabled={togglingOp === op.id}
                              className="px-3 py-1 rounded-full text-xs font-semibold transition-colors disabled:opacity-50"
                              style={op.ativo
                                ? { backgroundColor: 'rgba(34,197,94,0.15)', color: '#22c55e' }
                                : { backgroundColor: 'rgba(120,113,108,0.15)', color: '#78716c' }}
                            >
                              {togglingOp === op.id ? '...' : op.ativo ? 'Ativo' : 'Inativo'}
                            </button>
                          </td>
                          <td className="px-6 py-3 text-center">
                            <button
                              onClick={() => handleDeleteOperador(op.id)}
                              disabled={deletingOp === op.id}
                              className="px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50"
                              style={{ color: '#ef4444' }}
                              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'}
                              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              {deletingOp === op.id ? '...' : 'Excluir'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Add new operator */}
                <div className="px-6 py-5 border-t" style={{ borderColor: '#3c3330' }}>
                  <h3 className="font-medium text-stone-300 mb-1 text-sm">Adicionar Operador</h3>
                  <p className="text-stone-500 text-xs mb-3">O PIN deve ter entre 4 e 8 dígitos. Nunca é armazenado em texto claro.</p>
                  <form onSubmit={handleAddOperador} className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={newOpNome}
                        onChange={e => setNewOpNome(e.target.value)}
                        placeholder="Nome do operador"
                        required
                        className="w-full px-4 py-2.5 rounded-lg bg-stone-800 border text-stone-100 placeholder-stone-600 text-sm focus:outline-none"
                        style={{ borderColor: '#3c3330' }}
                        onFocus={e => e.target.style.borderColor = '#9a7520'}
                        onBlur={e => e.target.style.borderColor = '#3c3330'}
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="password"
                        inputMode="numeric"
                        value={newOpPin}
                        onChange={e => setNewOpPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        placeholder="PIN (4–8 dígitos)"
                        required
                        minLength={4}
                        maxLength={8}
                        className="w-full px-4 py-2.5 rounded-lg bg-stone-800 border text-stone-100 placeholder-stone-600 text-sm focus:outline-none"
                        style={{ borderColor: '#3c3330' }}
                        onFocus={e => e.target.style.borderColor = '#9a7520'}
                        onBlur={e => e.target.style.borderColor = '#3c3330'}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={addingOp || !newOpNome.trim() || newOpPin.length < 4}
                      className="px-5 py-2.5 rounded-lg font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
                      style={{ backgroundColor: '#9a7520' }}
                    >
                      {addingOp ? 'Adicionando...' : '+ Adicionar'}
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        )}

        {/* ===== BLOQUEADOS ===== */}
        {activeTab === 'proibidos' && (
          <div
            className="rounded-xl border"
            style={{ backgroundColor: '#241f1c', borderColor: '#3c3330' }}
          >
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: '#3c3330' }}>
              <div>
                <h2 className="font-semibold text-stone-100">Funcionários Bloqueados</h2>
                <p className="text-stone-500 text-xs mt-0.5">Nomes que são sempre ignorados no processamento</p>
              </div>
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444' }}
              >
                {proibidos.length} bloqueado{proibidos.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div
              className="mx-6 mt-4 mb-2 rounded-lg p-3 flex items-start gap-2"
              style={{ backgroundColor: 'rgba(239,68,68,0.06)', borderLeft: '3px solid #ef4444' }}
            >
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#ef4444' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              <p className="text-xs" style={{ color: 'rgba(239,68,68,0.8)' }}>
                Qualquer nome cadastrado aqui será marcado como <strong>Bloqueado</strong> no processamento e nunca computado na folha.
              </p>
            </div>

            {probLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#9a7520', borderTopColor: 'transparent' }} />
              </div>
            ) : (
              <>
                {probError && (
                  <div className="mx-6 mt-4 px-4 py-2 rounded bg-red-800/30 border border-red-600 text-red-300 text-sm">{probError}</div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ backgroundColor: '#2c2420' }}>
                        <th className="text-left px-6 py-3 font-semibold" style={{ color: '#c9a96e' }}>Nome Original</th>
                        <th className="text-left px-6 py-3 font-semibold" style={{ color: '#c9a96e' }}>Nome Normalizado</th>
                        <th className="text-center px-6 py-3 font-semibold" style={{ color: '#c9a96e' }}>Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proibidos.length === 0 ? (
                        <tr><td colSpan={3} className="px-6 py-10 text-center text-stone-500">Nenhum funcionário bloqueado</td></tr>
                      ) : proibidos.map((p, idx) => (
                        <tr
                          key={p.id}
                          className="border-t"
                          style={{ borderColor: '#2c2420', backgroundColor: idx % 2 === 0 ? '#1e1a17' : '#1c1917' }}
                        >
                          <td className="px-6 py-3 text-stone-200 font-medium">{p.nome_original}</td>
                          <td className="px-6 py-3">
                            <code className="px-2 py-0.5 rounded text-xs font-mono" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                              {p.nome_normalizado}
                            </code>
                          </td>
                          <td className="px-6 py-3 text-center">
                            <button
                              onClick={() => handleDeleteProibido(p.id)}
                              disabled={deletingProib === p.id}
                              className="px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50"
                              style={{ color: '#ef4444' }}
                              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'}
                              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              {deletingProib === p.id ? '...' : 'Remover'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Add new proibido */}
                <div className="px-6 py-5 border-t" style={{ borderColor: '#3c3330' }}>
                  <h3 className="font-medium text-stone-300 mb-3 text-sm">Adicionar à Lista de Bloqueados</h3>
                  <form onSubmit={handleAddProibido} className="flex gap-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={newProibido}
                        onChange={e => setNewProibido(e.target.value)}
                        placeholder="Nome do funcionário a bloquear"
                        required
                        className="w-full px-4 py-2.5 rounded-lg bg-stone-800 border text-stone-100 placeholder-stone-600 text-sm focus:outline-none"
                        style={{ borderColor: '#3c3330' }}
                        onFocus={e => e.target.style.borderColor = '#9a7520'}
                        onBlur={e => e.target.style.borderColor = '#3c3330'}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={addingProib || !newProibido.trim()}
                      className="px-5 py-2.5 rounded-lg font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
                      style={{ backgroundColor: '#9a7520' }}
                    >
                      {addingProib ? 'Adicionando...' : '+ Bloquear'}
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        )}

        {/* ===== AMBÍGUOS ===== */}
        {activeTab === 'ambiguos' && (
          <div
            className="rounded-xl border"
            style={{ backgroundColor: '#241f1c', borderColor: '#3c3330' }}
          >
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: '#3c3330' }}>
              <div>
                <h2 className="font-semibold text-stone-100">Nomes Ambíguos</h2>
                <p className="text-stone-500 text-xs mt-0.5">Primeiros nomes que geram dúvida quando aparecem sozinhos</p>
              </div>
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ backgroundColor: 'rgba(234,179,8,0.12)', color: '#eab308' }}
              >
                {ambiguos.length} regra{ambiguos.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div
              className="mx-6 mt-4 mb-2 rounded-lg p-3 flex items-start gap-2"
              style={{ backgroundColor: 'rgba(234,179,8,0.08)', borderLeft: '3px solid #eab308' }}
            >
              <svg className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-yellow-400/80 text-xs">
                Quando um nome exato como <code className="px-1 rounded" style={{ backgroundColor: 'rgba(234,179,8,0.15)' }}>ALEX</code> ou <code className="px-1 rounded" style={{ backgroundColor: 'rgba(234,179,8,0.15)' }}>PRISCILA</code> aparece no relatório, o sistema pergunta qual funcionário corresponde. Adicione aqui qualquer primeiro nome que cause essa ambiguidade.
              </p>
            </div>

            {ambLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#9a7520', borderTopColor: 'transparent' }} />
              </div>
            ) : (
              <>
                {ambError && (
                  <div className="mx-6 mt-4 px-4 py-2 rounded bg-red-800/30 border border-red-600 text-red-300 text-sm">{ambError}</div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ backgroundColor: '#2c2420' }}>
                        <th className="text-left px-6 py-3 font-semibold" style={{ color: '#c9a96e' }}>Nome (Normalizado)</th>
                        <th className="text-left px-6 py-3 font-semibold" style={{ color: '#c9a96e' }}>Funcionários que correspondem</th>
                        <th className="text-center px-6 py-3 font-semibold" style={{ color: '#c9a96e' }}>Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ambiguos.length === 0 ? (
                        <tr><td colSpan={3} className="px-6 py-10 text-center text-stone-500">Nenhuma regra de ambiguidade cadastrada</td></tr>
                      ) : ambiguos.map((a, idx) => {
                        const matching = employees.filter(e =>
                          e.nome.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z ]/g, '').trim().startsWith(a.nome_normalizado)
                        )
                        return (
                          <tr
                            key={a.id}
                            className="border-t"
                            style={{ borderColor: '#2c2420', backgroundColor: idx % 2 === 0 ? '#1e1a17' : '#1c1917' }}
                          >
                            <td className="px-6 py-3">
                              <code className="px-2 py-0.5 rounded text-sm font-mono" style={{ backgroundColor: 'rgba(234,179,8,0.15)', color: '#eab308' }}>
                                {a.nome_normalizado}
                              </code>
                            </td>
                            <td className="px-6 py-3 text-stone-400 text-xs">
                              {matching.length > 0
                                ? matching.map(e => e.nome).join(', ')
                                : <span className="text-stone-600 italic">nenhum funcionário encontrado</span>
                              }
                            </td>
                            <td className="px-6 py-3 text-center">
                              <button
                                onClick={() => handleDeleteAmbiguo(a.id)}
                                disabled={deletingAmb === a.id}
                                className="px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50"
                                style={{ color: '#ef4444' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                {deletingAmb === a.id ? '...' : 'Excluir'}
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Add new ambiguo */}
                <div className="px-6 py-5 border-t" style={{ borderColor: '#3c3330' }}>
                  <h3 className="font-medium text-stone-300 mb-3 text-sm">Adicionar Nome Ambíguo</h3>
                  {ambError && (
                    <div className="mb-3 px-4 py-2 rounded bg-red-800/30 border border-red-600 text-red-300 text-sm">{ambError}</div>
                  )}
                  <form onSubmit={handleAddAmbiguo} className="flex gap-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={newAmbiguo}
                        onChange={e => setNewAmbiguo(e.target.value)}
                        placeholder="Primeiro nome (ex: JOAO)"
                        required
                        className="w-full px-4 py-2.5 rounded-lg bg-stone-800 border text-stone-100 placeholder-stone-600 text-sm focus:outline-none"
                        style={{ borderColor: '#3c3330' }}
                        onFocus={e => e.target.style.borderColor = '#9a7520'}
                        onBlur={e => e.target.style.borderColor = '#3c3330'}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={addingAmb || !newAmbiguo.trim()}
                      className="px-5 py-2.5 rounded-lg font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
                      style={{ backgroundColor: '#9a7520' }}
                    >
                      {addingAmb ? 'Adicionando...' : '+ Adicionar'}
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
