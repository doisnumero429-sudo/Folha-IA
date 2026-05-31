import axios from 'axios'

/**
 * Separate axios instance for the quick "Lançar Faltas" PWA flow.
 *
 * It uses its own token (`falta-token`) stored independently from the main
 * app login (`sb-token`), so an operator with only a PIN never touches the
 * admin session, and vice-versa.
 */
const faltaApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 120000,
})

faltaApi.interceptors.request.use(config => {
  const token = localStorage.getItem('falta-token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

faltaApi.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 || err.response?.status === 403) {
      localStorage.removeItem('falta-token')
      localStorage.removeItem('falta-nome')
      if (!window.location.pathname.startsWith('/faltas')) return Promise.reject(err)
      // Send back to the PIN screen
      if (window.location.pathname !== '/faltas') window.location.href = '/faltas'
    }
    return Promise.reject(err)
  }
)

export default faltaApi
