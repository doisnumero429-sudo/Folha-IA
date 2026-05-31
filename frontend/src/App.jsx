import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { FechamentoProvider } from './context/FechamentoContext'

import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import Step1Page from './pages/Step1Page'
import Step2Page from './pages/Step2Page'
import Step3Page from './pages/Step3Page'
import Step4Page from './pages/Step4Page'
import Step5Page from './pages/Step5Page'
import Step6Page from './pages/Step6Page'
import Step7Page from './pages/Step7Page'
import SettingsPage from './pages/SettingsPage'
import FaltaRapidaPage from './pages/FaltaRapidaPage'

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-stone-900">
        <div className="text-center">
          <div
            className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: '#9a7520', borderTopColor: 'transparent' }}
          />
          <p style={{ color: '#c9a96e' }}>Carregando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Navigate to="/dashboard" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <FechamentoProvider>
              <DashboardPage />
            </FechamentoProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/fechamento/novo"
        element={
          <ProtectedRoute>
            <FechamentoProvider>
              <Step1Page />
            </FechamentoProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/fechamento/:id/consumo"
        element={
          <ProtectedRoute>
            <FechamentoProvider>
              <Step2Page />
            </FechamentoProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/fechamento/:id/vales"
        element={
          <ProtectedRoute>
            <FechamentoProvider>
              <Step3Page />
            </FechamentoProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/fechamento/:id/faltas"
        element={
          <ProtectedRoute>
            <FechamentoProvider>
              <Step4Page />
            </FechamentoProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/fechamento/:id/atestados"
        element={
          <ProtectedRoute>
            <FechamentoProvider>
              <Step5Page />
            </FechamentoProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/fechamento/:id/conferencia"
        element={
          <ProtectedRoute>
            <FechamentoProvider>
              <Step6Page />
            </FechamentoProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/fechamento/:id/gerar"
        element={
          <ProtectedRoute>
            <FechamentoProvider>
              <Step7Page />
            </FechamentoProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/configuracoes"
        element={
          <ProtectedRoute>
            <FechamentoProvider>
              <SettingsPage />
            </FechamentoProvider>
          </ProtectedRoute>
        }
      />
      <Route path="/faltas" element={<FaltaRapidaPage />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
