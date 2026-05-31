import React, { useState, useEffect, useMemo, useCallback } from 'react'
import faltaApi from '../api/faltaClient'

// Today's date (YYYY-MM-DD) in Brasília time.
function hojeISO() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

function formatDateBR(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso
}

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function dataExtenso(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return iso
  return `${parseInt(m[3], 10)} de ${MESES[parseInt(m[2], 10) - 1]}`
}

// ════════════════════════════════════════════════════════════════════════════
// PIN screen
// ════════════════════════════════════════════════════════════════════════════
function PinScreen({ onSuccess }) {
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const press = (d) => {
    setError(null)
    setPin(p => (p.length >= 8 ? p : p + d))
  }
  const back = () => { setError(null); setPin(p => p.slice(0, -1)) }

  const submit = useCallback(async (value) => {
    setLoading(true)
    setError(null)
    try {
      const res = await faltaApi.post('/acesso/pin-login', { pin: value })
      localStorage.setItem('falta-token', res.data.token)
      localStorage.setItem('falta-nome', res.data.nome || '')
      onSuccess(res.data.nome || '')
    } catch (err) {
      setError(err.response?.data?.error || 'Não foi possível validar o PIN.')
      setPin('')
    } finally {
      setLoading(false)
    }
  }, [onSuccess])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ backgroundColor: '#1c1917' }}>
      <div className="w-full max-w-xs text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl mx-auto mb-4"
          style={{ backgroundColor: '#9a7520', color: '#1c1917' }}>AG</div>
        <h1 className="text-xl font-bold" style={{ color: '#c9a96e' }}>Lançar Faltas</h1>
        <p className="text-stone-400 text-sm mb-6">Digite seu PIN para entrar</p>

        {/* PIN dots */}
        <div className="flex justify-center gap-3 mb-2 h-5">
          {Array.from({ length: Math.max(pin.length, 4) }).map((_, i) => (
            <span key={i} className="w-3 h-3 rounded-full" style={{ backgroundColor: i < pin.length ? '#c9a96e' : '#3c3330' }} />
          ))}
        </div>
        <div className="h-6 mb-3">
          {error && <p className="text-red-400 text-sm">{error}</p>}
          {loading && <p className="text-stone-400 text-sm">Validando…</p>}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
            <button key={n} onClick={() => press(String(n))} disabled={loading}
              className="aspect-square rounded-2xl text-2xl font-semibold text-stone-100 active:scale-95 transition-transform disabled:opacity-50"
              style={{ backgroundColor: '#241f1c', border: '1px solid #3c3330' }}>
              {n}
            </button>
          ))}
          <button onClick={back} disabled={loading}
            className="aspect-square rounded-2xl text-xl text-stone-400 active:scale-95 transition-transform disabled:opacity-50"
            style={{ backgroundColor: 'transparent' }}>⌫</button>
          <button onClick={() => press('0')} disabled={loading}
            className="aspect-square rounded-2xl text-2xl font-semibold text-stone-100 active:scale-95 transition-transform disabled:opacity-50"
            style={{ backgroundColor: '#241f1c', border: '1px solid #3c3330' }}>0</button>
          <button onClick={() => pin.length >= 4 && submit(pin)} disabled={loading || pin.length < 4}
            className="aspect-square rounded-2xl text-xl font-bold active:scale-95 transition-transform disabled:opacity-30"
            style={{ backgroundColor: '#9a7520', color: 'white' }}>OK</button>
        </div>
      </div>
      <p className="text-stone-600 text-xs mt-8">Araçá Grill © {new Date().getFullYear()}</p>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Launch screen
// ════════════════════════════════════════════════════════════════════════════
function LaunchScreen({ nome, onLogout }) {
  const [employees, setEmployees] = useState([])
  const [data, setData] = useState(hojeISO())
  const [faltasDoDia, setFaltasDoDia] = useState([])
  const [contagemMes, setContagemMes] = useState({})
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [toast, setToast] = useState(null)
  const [showDatePicker, setShowDatePicker] = useState(false)

  const isToday = data === hojeISO()

  const showToast = (msg, kind = 'ok') => {
    setToast({ msg, kind })
    setTimeout(() => setToast(null), 2200)
  }

  const loadResumo = useCallback(async (d) => {
    try {
      const res = await faltaApi.get('/falta-rapida/resumo', { params: { data: d } })
      setFaltasDoDia(res.data.faltasDoDia || [])
      setContagemMes(res.data.contagemMes || {})
    } catch {
      /* handled by interceptor */
    }
  }, [])

  useEffect(() => {
    async function init() {
      setLoading(true)
      try {
        const res = await faltaApi.get('/falta-rapida/funcionarios')
        setEmployees(res.data || [])
        await loadResumo(data)
      } finally {
        setLoading(false)
      }
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { loadResumo(data) }, [data, loadResumo])

  // funcionario_id → falta record launched on the selected day
  const faltaByEmp = useMemo(() => {
    const map = {}
    for (const f of faltasDoDia) map[f.funcionario_id] = f
    return map
  }, [faltasDoDia])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return employees
    return employees.filter(e => e.nome.toLowerCase().includes(q))
  }, [employees, search])

  async function toggleFalta(emp) {
    if (busyId) return
    setBusyId(emp.id)
    const existing = faltaByEmp[emp.id]
    try {
      if (existing) {
        await faltaApi.delete(`/falta-rapida/${existing.id}`)
        showToast(`Falta de ${emp.nome.split(' ')[0]} desfeita`, 'undo')
      } else {
        await faltaApi.post('/falta-rapida', { funcionario_id: emp.id, data })
        showToast(`Falta de ${emp.nome.split(' ')[0]} registrada`, 'ok')
      }
      await loadResumo(data)
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao salvar.', 'err')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1c1917' }}>
      {/* Header */}
      <div className="sticky top-0 z-20 px-4 pt-4 pb-3" style={{ backgroundColor: '#241f1c', borderBottom: '1px solid #3c3330' }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-stone-400 text-xs">Olá,</p>
            <p className="text-stone-100 font-semibold leading-tight">{nome || 'Operador'}</p>
          </div>
          <button onClick={onLogout} className="text-stone-400 text-xs px-3 py-1.5 rounded-lg" style={{ border: '1px solid #3c3330' }}>
            Sair
          </button>
        </div>

        {/* Date selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDatePicker(s => !s)}
            className="flex-1 flex items-center justify-between px-3 py-2 rounded-lg text-sm"
            style={{ backgroundColor: '#1c1917', border: '1px solid #3c3330', color: '#e7e5e4' }}>
            <span>📅 {isToday ? 'Hoje' : 'Outro dia'} — <strong>{dataExtenso(data)}</strong></span>
            <span className="text-stone-500">{showDatePicker ? '▲' : '▼'}</span>
          </button>
          {!isToday && (
            <button onClick={() => setData(hojeISO())}
              className="px-3 py-2 rounded-lg text-xs font-semibold" style={{ backgroundColor: '#9a7520', color: 'white' }}>
              Hoje
            </button>
          )}
        </div>
        {showDatePicker && (
          <input type="date" value={data} max={hojeISO()}
            onChange={e => { if (e.target.value) { setData(e.target.value); setShowDatePicker(false) } }}
            className="w-full mt-2 px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: '#1c1917', border: '1px solid #9a7520', color: '#e7e5e4' }} />
        )}

        {/* Search */}
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar funcionário…"
          className="w-full mt-2 px-3 py-2 rounded-lg text-sm placeholder-stone-600"
          style={{ backgroundColor: '#1c1917', border: '1px solid #3c3330', color: '#e7e5e4' }} />
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-lg text-sm font-medium shadow-lg"
          style={{
            backgroundColor: toast.kind === 'err' ? '#7f1d1d' : toast.kind === 'undo' ? '#44403c' : '#166534',
            color: 'white',
          }}>
          {toast.kind === 'ok' ? '✓ ' : toast.kind === 'undo' ? '↩ ' : '⚠ '}{toast.msg}
        </div>
      )}

      {/* List */}
      <div className="px-4 py-3 pb-24">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#9a7520', borderTopColor: 'transparent' }} />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-stone-500 py-16 text-sm">Nenhum funcionário encontrado.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map(emp => {
              const faltou = Boolean(faltaByEmp[emp.id])
              const totalMes = contagemMes[emp.id] || 0
              const busy = busyId === emp.id
              return (
                <button
                  key={emp.id}
                  onClick={() => toggleFalta(emp)}
                  disabled={busy}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left active:scale-[0.99] transition-transform"
                  style={{
                    backgroundColor: faltou ? 'rgba(220,38,38,0.12)' : '#241f1c',
                    border: `1px solid ${faltou ? '#dc2626' : '#3c3330'}`,
                    opacity: busy ? 0.6 : 1,
                  }}>
                  {/* Status circle */}
                  <span className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                    style={{ backgroundColor: faltou ? '#dc2626' : '#2c2420', color: faltou ? 'white' : '#78716c' }}>
                    {busy ? '…' : faltou ? '✕' : '+'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-stone-100 font-medium truncate">{emp.nome}</p>
                    <p className="text-stone-500 text-xs">{emp.funcao}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {faltou ? (
                      <span className="text-red-400 text-xs font-semibold">Faltou</span>
                    ) : (
                      <span className="text-stone-600 text-xs">Presente</span>
                    )}
                    {totalMes > 0 && (
                      <p className="text-stone-500 text-[11px] mt-0.5">{totalMes} no mês</p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer summary */}
      <div className="fixed bottom-0 left-0 right-0 px-4 py-3 z-20"
        style={{ backgroundColor: '#241f1c', borderTop: '1px solid #3c3330' }}>
        <p className="text-center text-sm">
          <span className="text-stone-400">Faltas em {formatDateBR(data)}: </span>
          <span className="font-bold" style={{ color: faltasDoDia.length > 0 ? '#f87171' : '#22c55e' }}>
            {faltasDoDia.length}
          </span>
        </p>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Root
// ════════════════════════════════════════════════════════════════════════════
export default function FaltaRapidaPage() {
  const [nome, setNome] = useState(() => localStorage.getItem('falta-nome') || '')
  const [authed, setAuthed] = useState(() => Boolean(localStorage.getItem('falta-token')))

  function handleLogout() {
    localStorage.removeItem('falta-token')
    localStorage.removeItem('falta-nome')
    setAuthed(false)
    setNome('')
  }

  if (!authed) {
    return <PinScreen onSuccess={(n) => { setNome(n); setAuthed(true) }} />
  }
  return <LaunchScreen nome={nome} onLogout={handleLogout} />
}
