import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import StepIndicator from '../components/StepIndicator'
import UploadZone from '../components/UploadZone'
import api from '../api/client'
import { formatDate } from '../utils/format'

function AtestadoCard({ atestado, employees, onUpdate, onRemove }) {
  const [editing, setEditing] = useState(false)
  const [data, setData] = useState({ ...atestado })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await api.put(`/atestados/${atestado.id}`, data)
      onUpdate && onUpdate(data)
      setEditing(false)
    } catch (err) {
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  const emp = employees.find(e => e.id === (data.funcionario_id || atestado.funcionario_id))

  return (
    <div
      className="rounded-xl border p-5"
      style={{ backgroundColor: '#1e1a17', borderColor: editing ? '#9a7520' : '#3c3330' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'rgba(59,130,246,0.15)' }}
          >
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-stone-100 text-sm">
              {emp?.nome || data.nome_extraido || 'Paciente não identificado'}
            </p>
            <p className="text-stone-500 text-xs">{data.dias_afastados || 0} dia(s) afastado(s)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!editing ? (
            <>
              <button
                onClick={() => setEditing(true)}
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
              <button
                onClick={() => onRemove && onRemove(atestado.id)}
                className="p-1.5 rounded transition-colors"
                style={{ color: '#ef4444' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                title="Remover"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </>
          ) : (
            <div className="flex gap-1.5">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-1 rounded text-xs font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: '#16a34a' }}
              >
                {saving ? '...' : 'Salvar'}
              </button>
              <button
                onClick={() => { setEditing(false); setData({ ...atestado }) }}
                className="px-3 py-1 rounded text-xs font-medium bg-stone-600 text-stone-200 hover:bg-stone-500"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Fields */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        {/* Patient name */}
        <div>
          <label className="text-stone-500 text-xs block mb-1">Paciente</label>
          {editing ? (
            <input
              type="text"
              value={data.nome_extraido || ''}
              onChange={e => setData(d => ({ ...d, nome_extraido: e.target.value }))}
              className="w-full px-3 py-1.5 rounded bg-stone-700 border border-stone-500 text-stone-100 text-sm focus:outline-none"
              style={{ borderColor: '#9a7520' }}
            />
          ) : (
            <span className="text-stone-200">{data.nome_extraido || '—'}</span>
          )}
        </div>

        {/* Employee match */}
        <div>
          <label className="text-stone-500 text-xs block mb-1">Funcionário vinculado</label>
          {editing ? (
            <select
              value={data.funcionario_id || ''}
              onChange={e => setData(d => ({ ...d, funcionario_id: e.target.value }))}
              className="w-full px-3 py-1.5 rounded bg-stone-700 border text-stone-100 text-sm focus:outline-none appearance-none"
              style={{ borderColor: '#9a7520' }}
            >
              <option value="">Não identificado</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>
          ) : (
            <span className={emp ? 'text-green-400' : 'text-stone-500'}>
              {emp?.nome || 'Não identificado'}
            </span>
          )}
        </div>

        {/* Issue date */}
        <div>
          <label className="text-stone-500 text-xs block mb-1">Data de Emissão</label>
          {editing ? (
            <input
              type="date"
              value={data.data_emissao || ''}
              onChange={e => setData(d => ({ ...d, data_emissao: e.target.value }))}
              className="w-full px-3 py-1.5 rounded bg-stone-700 border text-stone-100 text-sm focus:outline-none"
              style={{ borderColor: '#9a7520' }}
            />
          ) : (
            <span className="text-stone-200">{formatDate(data.data_emissao) || '—'}</span>
          )}
        </div>

        {/* Days away */}
        <div>
          <label className="text-stone-500 text-xs block mb-1">Dias Afastados</label>
          {editing ? (
            <input
              type="number"
              min="0"
              value={data.dias_afastados || 0}
              onChange={e => setData(d => ({ ...d, dias_afastados: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-1.5 rounded bg-stone-700 border text-stone-100 text-sm focus:outline-none"
              style={{ borderColor: '#9a7520' }}
            />
          ) : (
            <span className="text-blue-400 font-semibold">{data.dias_afastados || 0}</span>
          )}
        </div>

        {/* Period start */}
        <div>
          <label className="text-stone-500 text-xs block mb-1">Período Início</label>
          {editing ? (
            <input
              type="date"
              value={data.periodo_inicio || ''}
              onChange={e => setData(d => ({ ...d, periodo_inicio: e.target.value }))}
              className="w-full px-3 py-1.5 rounded bg-stone-700 border text-stone-100 text-sm focus:outline-none"
              style={{ borderColor: '#9a7520' }}
            />
          ) : (
            <span className="text-stone-200">{formatDate(data.periodo_inicio) || '—'}</span>
          )}
        </div>

        {/* Period end */}
        <div>
          <label className="text-stone-500 text-xs block mb-1">Período Fim</label>
          {editing ? (
            <input
              type="date"
              value={data.periodo_fim || ''}
              onChange={e => setData(d => ({ ...d, periodo_fim: e.target.value }))}
              className="w-full px-3 py-1.5 rounded bg-stone-700 border text-stone-100 text-sm focus:outline-none"
              style={{ borderColor: '#9a7520' }}
            />
          ) : (
            <span className="text-stone-200">{formatDate(data.periodo_fim) || '—'}</span>
          )}
        </div>

        {/* Doctor */}
        <div>
          <label className="text-stone-500 text-xs block mb-1">Médico</label>
          {editing ? (
            <input
              type="text"
              value={data.medico || ''}
              onChange={e => setData(d => ({ ...d, medico: e.target.value }))}
              className="w-full px-3 py-1.5 rounded bg-stone-700 border text-stone-100 text-sm focus:outline-none"
              style={{ borderColor: '#9a7520' }}
            />
          ) : (
            <span className="text-stone-300">{data.medico || '—'}</span>
          )}
        </div>

        {/* CRM */}
        <div>
          <label className="text-stone-500 text-xs block mb-1">CRM</label>
          {editing ? (
            <input
              type="text"
              value={data.crm || ''}
              onChange={e => setData(d => ({ ...d, crm: e.target.value }))}
              className="w-full px-3 py-1.5 rounded bg-stone-700 border text-stone-100 text-sm focus:outline-none"
              style={{ borderColor: '#9a7520' }}
            />
          ) : (
            <span className="text-stone-300">{data.crm || '—'}</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Step5Page() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [atestados, setAtestados] = useState([])
  const [employees, setEmployees] = useState([])

  useEffect(() => {
    async function load() {
      try {
        const [empRes, atestadosRes] = await Promise.all([
          api.get('/funcionarios'),
          api.get(`/atestados/${id}`)
        ])
        setEmployees(empRes.data || [])
        setAtestados(atestadosRes.data || [])
      } catch (err) {
        console.error('Load error:', err)
      }
    }
    load()
  }, [id])

  async function handleUpload(file) {
    setLoading(true)
    setUploadResult(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('fechamento_id', id)
      const res = await api.post('/atestados', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      const newAtestado = res.data.atestado || res.data
      setAtestados(prev => [...prev, newAtestado])
      setUploadResult({ success: true })
    } catch (err) {
      setUploadResult({ error: err.response?.data?.error || 'Erro ao processar atestado' })
    } finally {
      setLoading(false)
    }
  }

  function handleUpdate(updated) {
    setAtestados(prev => prev.map(a => a.id === updated.id ? { ...a, ...updated } : a))
  }

  async function handleRemove(atestadoId) {
    try {
      await api.delete(`/atestados/${atestadoId}`)
      setAtestados(prev => prev.filter(a => a.id !== atestadoId))
    } catch (err) {
      console.error('Remove error:', err)
    }
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <StepIndicator currentStep={5} fechamentoId={id} />

        <div className="mb-6">
          <h1 className="text-xl font-bold text-stone-100">Atestados Médicos</h1>
          <p className="text-stone-400 text-sm mt-1">
            Faça upload dos atestados médicos. O sistema extrai automaticamente as informações via IA.
          </p>
        </div>

        {/* Upload zone */}
        <div
          className="rounded-xl border p-6 mb-6"
          style={{ backgroundColor: '#241f1c', borderColor: '#3c3330' }}
        >
          <UploadZone
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            label="Atestado Médico (PDF, JPG, PNG)"
            onUpload={handleUpload}
            loading={loading}
            result={uploadResult}
          />
          {loading && (
            <p className="text-center text-stone-400 text-sm mt-2">
              Processando com IA... isso pode levar alguns segundos.
            </p>
          )}
        </div>

        {/* Atestados list */}
        {atestados.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-stone-200">Atestados Cadastrados</h2>
              <span
                className="text-xs px-2.5 py-1 rounded-full"
                style={{ backgroundColor: 'rgba(59,130,246,0.15)', color: '#93c5fd' }}
              >
                {atestados.length} atestado{atestados.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="space-y-3">
              {atestados.map(a => (
                <AtestadoCard
                  key={a.id}
                  atestado={a}
                  employees={employees}
                  onUpdate={handleUpdate}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          </div>
        )}

        {atestados.length === 0 && !loading && (
          <div
            className="rounded-xl border-2 border-dashed text-center py-10 mb-6"
            style={{ borderColor: '#2c2420' }}
          >
            <svg className="w-10 h-10 mx-auto mb-2 text-stone-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-stone-500 text-sm">Nenhum atestado cadastrado</p>
            <p className="text-stone-600 text-xs mt-1">
              Se não houver atestados, você pode pular esta etapa.
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-4">
          <button
            onClick={() => navigate(`/fechamento/${id}/faltas`)}
            className="px-5 py-2.5 rounded-lg border font-medium text-stone-300 hover:bg-stone-800 transition-colors"
            style={{ borderColor: '#3c3330' }}
          >
            ← Voltar
          </button>
          <button
            onClick={() => navigate(`/fechamento/${id}/conferencia`)}
            className="px-6 py-2.5 rounded-lg font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#9a7520' }}
          >
            Próximo: Conferência →
          </button>
        </div>
      </div>
    </Layout>
  )
}
