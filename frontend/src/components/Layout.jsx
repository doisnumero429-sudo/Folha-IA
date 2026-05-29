import React from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const location = useLocation()

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/configuracoes', label: 'Configurações' }
  ]

  return (
    <div className="min-h-screen bg-stone-900 flex flex-col">
      {/* Header */}
      <header
        className="border-b"
        style={{ backgroundColor: '#1c1917', borderColor: '#9a7520' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded flex items-center justify-center font-black text-sm"
                style={{ backgroundColor: '#9a7520', color: '#1c1917' }}
              >
                AG
              </div>
              <div>
                <div className="font-bold tracking-widest text-sm" style={{ color: '#c9a96e' }}>
                  ARAÇÁ GRILL
                </div>
                <div className="text-xs text-stone-400">Folha IA</div>
              </div>
            </Link>

            {/* Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="px-4 py-2 rounded text-sm font-medium transition-colors"
                  style={
                    location.pathname === link.to
                      ? { color: '#c9a96e', backgroundColor: 'rgba(154,117,32,0.15)' }
                      : { color: '#a8a29e' }
                  }
                  onMouseEnter={e => {
                    if (location.pathname !== link.to) {
                      e.currentTarget.style.color = '#c9a96e'
                    }
                  }}
                  onMouseLeave={e => {
                    if (location.pathname !== link.to) {
                      e.currentTarget.style.color = '#a8a29e'
                    }
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* User area */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-stone-400 hidden sm:block">
                {user?.email || 'Evandro'}
              </span>
              <button
                onClick={logout}
                className="px-3 py-1.5 rounded text-sm border transition-colors"
                style={{ borderColor: '#9a7520', color: '#c9a96e' }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'rgba(154,117,32,0.15)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t py-4 text-center text-xs text-stone-500" style={{ borderColor: '#2c2420' }}>
        Folha IA — Araçá Grill © {new Date().getFullYear()}
      </footer>
    </div>
  )
}
