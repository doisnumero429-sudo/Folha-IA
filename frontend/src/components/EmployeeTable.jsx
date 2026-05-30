import React, { useState } from 'react'
import api from '../api/client'
import { formatBRL } from '../utils/format'

export default function EmployeeTable({ lancamentos, fechamentoId, onUpdate }) {
  const [editingId, setEditingId] = useState(null)
  const [editData, setEditData] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  function startEdit(lancamento) {
    setEditingId(lancamento.funcionario_id)
    setEditData({
      consumo: lancamento.consumo || 0,
      vales: lancamento.vales || 0,
      faltas: lancamento.faltas || 0,
      dsr: lancamento.dsr || 0,
      dias_descontados: lancamento.dias_descontados || 0,
      dias_afastados: lancamento.dias_afastados || 0
    })
    setSaveError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditData({})
    setSaveError(null)
  }

  async function saveEdit(lancamento) {
    setSaving(true)
    setSaveError(null)
    try {
      const res = await api.put(
        `/fechamento/${fechamentoId}/lancamentos/${lancamento.funcionario_id}`,
        editData
      )
      onUpdate && onUpdate({ ...lancamento, ...editData, ...res.data })
      setEditingId(null)
      setEditData({})
    } catch (err) {
      setSaveError(err.response?.data?.error || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  // Calculate totals
  const totals = lancamentos.reduce(
    (acc, l) => ({
      consumo: acc.consumo + (parseFloat(l.consumo) || 0),
      vales: acc.vales + (parseFloat(l.vales) || 0),
      faltas: acc.faltas + (parseInt(l.faltas) || 0),
      dsr: acc.dsr + (parseInt(l.dsr) || 0),
      dias_descontados: acc.dias_descontados + (parseInt(l.dias_descontados) || 0),
      dias_afastados: acc.dias_afastados + (parseInt(l.dias_afastados) || 0)
    }),
    { consumo: 0, vales: 0, faltas: 0, dsr: 0, dias_descontados: 0, dias_afastados: 0 }
  )

  if (!lancamentos || lancamentos.length === 0) {
    return (
      <div className="text-center py-12 text-stone-400">
        <svg className="w-12 h-12 mx-auto mb-3 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <p>Nenhum lançamento encontrado</p>
      </div>
    )
  }

  return (
    <div>
      {saveError && (
        <div className="mb-3 px-4 py-2 rounded bg-red-800/30 border border-red-600 text-red-300 text-sm">
          {saveError}
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: '#3c3330' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: '#2c2420' }}>
              <th className="text-left px-4 py-3 font-semibold" style={{ color: '#c9a96e' }}>Funcionário</th>
              <th className="text-left px-4 py-3 font-semibold" style={{ color: '#c9a96e' }}>Função</th>
              <th className="text-right px-4 py-3 font-semibold" style={{ color: '#c9a96e' }}>Consumo</th>
              <th className="text-right px-4 py-3 font-semibold" style={{ color: '#c9a96e' }}>Vales</th>
              <th className="text-center px-4 py-3 font-semibold" style={{ color: '#c9a96e' }}>Faltas</th>
              <th className="text-center px-4 py-3 font-semibold" style={{ color: '#c9a96e' }}>DSR</th>
              <th className="text-center px-4 py-3 font-semibold" style={{ color: '#c9a96e' }}>Dias Desc.</th>
              <th className="text-center px-4 py-3 font-semibold" style={{ color: '#c9a96e' }}>Afastados</th>
              <th className="text-center px-4 py-3 font-semibold" style={{ color: '#c9a96e' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {lancamentos.map((l, idx) => {
              const isEditing = editingId === l.funcionario_id
              const hasFaltas = (parseInt(l.faltas) || 0) > 0
              const hasAfastamento = (parseInt(l.dias_afastados) || 0) > 0

              let rowBg = idx % 2 === 0 ? '#1e1a17' : '#1c1917'
              if (isEditing) rowBg = 'rgba(154,117,32,0.08)'
              else if (hasFaltas && hasAfastamento) rowBg = 'rgba(59,130,246,0.07)'
              else if (hasFaltas) rowBg = 'rgba(245,158,11,0.07)'
              else if (hasAfastamento) rowBg = 'rgba(59,130,246,0.07)'

              return (
                <tr
                  key={l.funcionario_id || idx}
                  style={{ backgroundColor: rowBg }}
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-stone-100">{l.funcionario?.nome || l.funcionarios?.nome || l.nome || l.funcionario_nome || '—'}</span>
                    {hasFaltas && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-amber-800/40 text-amber-300">F</span>
                    )}
                    {hasAfastamento && (
                      <span className="ml-1 text-xs px-1.5 py-0.5 rounded bg-blue-800/40 text-blue-300">A</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-stone-400">{l.funcionario?.funcao || l.funcionarios?.funcao || l.funcao || l.cargo || '—'}</td>

                  {/* Consumo */}
                  <td className="px-4 py-3 text-right">
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editData.consumo}
                        onChange={e => setEditData(d => ({ ...d, consumo: parseFloat(e.target.value) || 0 }))}
                        className="w-24 px-2 py-1 rounded text-right text-sm bg-stone-700 border border-stone-500 text-white focus:outline-none"
                        style={{ borderColor: '#9a7520' }}
                      />
                    ) : (
                      <span className="text-stone-200">{formatBRL(l.consumo)}</span>
                    )}
                  </td>

                  {/* Vales */}
                  <td className="px-4 py-3 text-right">
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editData.vales}
                        onChange={e => setEditData(d => ({ ...d, vales: parseFloat(e.target.value) || 0 }))}
                        className="w-24 px-2 py-1 rounded text-right text-sm bg-stone-700 border border-stone-500 text-white focus:outline-none"
                        style={{ borderColor: '#9a7520' }}
                      />
                    ) : (
                      <span className="text-stone-200">{formatBRL(l.vales)}</span>
                    )}
                  </td>

                  {/* Faltas */}
                  <td className="px-4 py-3 text-center">
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        value={editData.faltas}
                        onChange={e => setEditData(d => ({ ...d, faltas: parseInt(e.target.value) || 0 }))}
                        className="w-16 px-2 py-1 rounded text-center text-sm bg-stone-700 border border-stone-500 text-white focus:outline-none"
                        style={{ borderColor: '#9a7520' }}
                      />
                    ) : (
                      <span className={hasFaltas ? 'text-amber-400 font-semibold' : 'text-stone-400'}>
                        {l.faltas || 0}
                      </span>
                    )}
                  </td>

                  {/* DSR */}
                  <td className="px-4 py-3 text-center">
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        value={editData.dsr}
                        onChange={e => setEditData(d => ({ ...d, dsr: parseInt(e.target.value) || 0 }))}
                        className="w-16 px-2 py-1 rounded text-center text-sm bg-stone-700 border border-stone-500 text-white focus:outline-none"
                        style={{ borderColor: '#9a7520' }}
                      />
                    ) : (
                      <span className="text-stone-400">{l.dsr || 0}</span>
                    )}
                  </td>

                  {/* Dias Descontados */}
                  <td className="px-4 py-3 text-center">
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        value={editData.dias_descontados}
                        onChange={e => setEditData(d => ({ ...d, dias_descontados: parseInt(e.target.value) || 0 }))}
                        className="w-16 px-2 py-1 rounded text-center text-sm bg-stone-700 border border-stone-500 text-white focus:outline-none"
                        style={{ borderColor: '#9a7520' }}
                      />
                    ) : (
                      <span className="text-stone-400">{l.dias_descontados || 0}</span>
                    )}
                  </td>

                  {/* Dias Afastados */}
                  <td className="px-4 py-3 text-center">
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        value={editData.dias_afastados}
                        onChange={e => setEditData(d => ({ ...d, dias_afastados: parseInt(e.target.value) || 0 }))}
                        className="w-16 px-2 py-1 rounded text-center text-sm bg-stone-700 border border-stone-500 text-white focus:outline-none"
                        style={{ borderColor: '#9a7520' }}
                      />
                    ) : (
                      <span className={hasAfastamento ? 'text-blue-400 font-semibold' : 'text-stone-400'}>
                        {l.dias_afastados || 0}
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-center">
                    {isEditing ? (
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => saveEdit(l)}
                          disabled={saving}
                          className="px-2.5 py-1 rounded text-xs font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50"
                          style={{ backgroundColor: '#16a34a' }}
                        >
                          {saving ? '...' : 'Salvar'}
                        </button>
                        <button
                          onClick={cancelEdit}
                          disabled={saving}
                          className="px-2.5 py-1 rounded text-xs font-medium text-stone-300 bg-stone-600 hover:bg-stone-500 transition-colors disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(l)}
                        className="p-1.5 rounded transition-colors"
                        style={{ color: '#9a7520' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(154,117,32,0.15)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        title="Editar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
          {/* Totals row */}
          <tfoot>
            <tr style={{ backgroundColor: '#2c2420', borderTop: '2px solid #9a7520' }}>
              <td className="px-4 py-3 font-bold" style={{ color: '#c9a96e' }} colSpan={2}>
                TOTAL
              </td>
              <td className="px-4 py-3 text-right font-bold" style={{ color: '#c9a96e' }}>
                {formatBRL(totals.consumo)}
              </td>
              <td className="px-4 py-3 text-right font-bold" style={{ color: '#c9a96e' }}>
                {formatBRL(totals.vales)}
              </td>
              <td className="px-4 py-3 text-center font-bold" style={{ color: '#c9a96e' }}>
                {totals.faltas}
              </td>
              <td className="px-4 py-3 text-center font-bold" style={{ color: '#c9a96e' }}>
                {totals.dsr}
              </td>
              <td className="px-4 py-3 text-center font-bold" style={{ color: '#c9a96e' }}>
                {totals.dias_descontados}
              </td>
              <td className="px-4 py-3 text-center font-bold" style={{ color: '#c9a96e' }}>
                {totals.dias_afastados}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
