import React, { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // On mount, check if there's a stored token and validate it
    const token = localStorage.getItem('sb-token')
    const storedUser = localStorage.getItem('sb-user')
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch {
        localStorage.removeItem('sb-token')
        localStorage.removeItem('sb-user')
      }
    }
    setLoading(false)
  }, [])

  async function login(email, password) {
    const res = await api.post('/auth/login', { email, password })
    const { token, user: userData } = res.data
    localStorage.setItem('sb-token', token)
    localStorage.setItem('sb-user', JSON.stringify(userData))
    setUser(userData)
    return userData
  }

  function logout() {
    localStorage.removeItem('sb-token')
    localStorage.removeItem('sb-user')
    setUser(null)
    window.location.href = '/login'
  }

  const isAuthenticated = Boolean(user)

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
