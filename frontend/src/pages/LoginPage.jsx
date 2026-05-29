import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login(email, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Credenciais inválidas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: '#1c1917' }}
    >
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-10">
          <div
            className="w-20 h-20 rounded-xl flex items-center justify-center font-black text-2xl mx-auto mb-4"
            style={{ backgroundColor: '#9a7520', color: '#1c1917' }}
          >
            AG
          </div>
          <h1 className="text-3xl font-black tracking-widest" style={{ color: '#c9a96e' }}>
            ARAÇÁ GRILL
          </h1>
          <p className="text-stone-400 mt-1">Sistema de Fechamento de Folha</p>
        </div>

        {/* Form card */}
        <div
          className="rounded-2xl border p-8"
          style={{ backgroundColor: '#241f1c', borderColor: '#3c3330' }}
        >
          <h2 className="text-xl font-semibold text-stone-100 mb-6">Entrar</h2>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-900/30 border border-red-600 text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="evandro@araçagrill.com"
                className="w-full px-4 py-3 rounded-lg bg-stone-800 border text-stone-100 placeholder-stone-600 focus:outline-none transition-colors"
                style={{ borderColor: '#3c3330' }}
                onFocus={e => e.target.style.borderColor = '#9a7520'}
                onBlur={e => e.target.style.borderColor = '#3c3330'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1.5">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-lg bg-stone-800 border text-stone-100 placeholder-stone-600 focus:outline-none transition-colors"
                style={{ borderColor: '#3c3330' }}
                onFocus={e => e.target.style.borderColor = '#9a7520'}
                onBlur={e => e.target.style.borderColor = '#3c3330'}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 mt-2"
              style={{ backgroundColor: '#9a7520' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span
                    className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: 'white', borderTopColor: 'transparent' }}
                  />
                  Entrando...
                </span>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-stone-600 text-xs mt-6">
          Folha IA — Araçá Grill © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
