import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import StepIndicator from '../components/StepIndicator'
import api from '../api/client'
import { MONTHS_PT, formatDate } from '../utils/format'

function DownloadCard({ title, description, icon, onDownload, loading, format }) {
  return (
    <div
      className="rounded-xl border p-6 flex flex-col"
      style={{ backgroundColor: '#241f1c', borderColor: '#3c3330' }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'rgba(154,117,32,0.15)' }}
        >
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-stone-100">{title}</h3>
          <p className="text-stone-400 text-xs mt-0.5">{description}</p>
        </div>
      </div>

      <div className="mt-auto">
        <button
          onClick={onDownload}
          disabled={loading}
          className="w-full py-2.5 rounded-lg font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ backgroundColor: '#9a7520' }}
        >
          {loading ? (
            <>
              <span
                className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: 'white', borderTopColor: 'transparent' }}
              />
              Gerando...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Baixar {format}
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default function Step7Page() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [fechamento, setFechamento] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generatingExcel, setGeneratingExcel] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [generatingHtml, setGeneratingHtml] = useState(false)
  const [downloadErrors, setDownloadErrors] = useState({})

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`/fechamento/${id}`)
        setFechamento(res.data)
      } catch (err) {
        console.error('Load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function downloadFile(url, filename, setLoadingFn, key) {
    setLoadingFn(true)
    setDownloadErrors(prev => ({ ...prev, [key]: null }))
    try {
      const res = await api.get(url, { responseType: 'blob' })
      const blob = new Blob([res.data])
      const href = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = href
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(href)
    } catch (err) {
      setDownloadErrors(prev => ({
        ...prev,
        [key]: err.response?.data?.error || 'Erro ao gerar arquivo'
      }))
    } finally {
      setLoadingFn(false)
    }
  }

  async function handleHtmlDownload() {
    setGeneratingHtml(true)
    setDownloadErrors(prev => ({ ...prev, html: null }))
    try {
      const res = await api.get(`/gerar/html/${id}`, { responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'text/html' })
      const href = URL.createObjectURL(blob)
      window.open(href, '_blank')
    } catch (err) {
      setDownloadErrors(prev => ({
        ...prev,
        html: err.response?.data?.error || 'Erro ao gerar HTML'
      }))
    } finally {
      setGeneratingHtml(false)
    }
  }

  const monthLabel = fechamento ? MONTHS_PT[(fechamento.mes || 1) - 1] : ''
  const approvedDate = fechamento?.aprovado_em

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-64">
          <div
            className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: '#9a7520', borderTopColor: 'transparent' }}
          />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <StepIndicator currentStep={7} fechamentoId={id} />

        {/* Success banner */}
        <div
          className="rounded-xl border p-6 mb-8 flex items-center gap-5"
          style={{ backgroundColor: 'rgba(22,163,74,0.08)', borderColor: '#16a34a' }}
        >
          <div className="w-14 h-14 rounded-full bg-green-800/40 flex items-center justify-center flex-shrink-0">
            <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="font-bold text-green-300 text-lg">Fechamento Aprovado!</h2>
            <p className="text-green-400/70 text-sm mt-0.5">
              {monthLabel} {fechamento?.ano}
            </p>
            <div className="flex items-center gap-4 mt-2 text-xs">
              <span className="text-stone-400">
                Status:{' '}
                <span className="font-semibold text-green-300 uppercase">
                  {fechamento?.status || 'APROVADO'}
                </span>
              </span>
              {approvedDate && (
                <span className="text-stone-400">
                  Aprovado em: <span className="text-stone-200">{formatDate(approvedDate.slice(0, 10))}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Document generation cards */}
        <h2 className="font-semibold text-stone-200 mb-4">Gerar Documentos</h2>
        <p className="text-stone-400 text-sm mb-6">
          Selecione o formato de saída desejado. A geração pode levar alguns segundos.
        </p>

        <div className="grid gap-4 sm:grid-cols-3">
          {/* Excel */}
          <div>
            <DownloadCard
              title="Excel"
              description="Planilha completa com todos os lançamentos"
              format=".xlsx"
              loading={generatingExcel}
              onDownload={() =>
                downloadFile(
                  `/gerar/excel/${id}`,
                  `folha_${monthLabel?.toLowerCase()}_${fechamento?.ano}.xlsx`,
                  setGeneratingExcel,
                  'excel'
                )
              }
              icon={
                <svg className="w-6 h-6" style={{ color: '#c9a96e' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              }
            />
            {downloadErrors.excel && (
              <p className="text-red-400 text-xs mt-1.5 text-center">{downloadErrors.excel}</p>
            )}
          </div>

          {/* PDF */}
          <div>
            <DownloadCard
              title="PDF"
              description="Documento formal para arquivo"
              format=".pdf"
              loading={generatingPdf}
              onDownload={() =>
                downloadFile(
                  `/gerar/pdf/${id}`,
                  `folha_${monthLabel?.toLowerCase()}_${fechamento?.ano}.pdf`,
                  setGeneratingPdf,
                  'pdf'
                )
              }
              icon={
                <svg className="w-6 h-6" style={{ color: '#c9a96e' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              }
            />
            {downloadErrors.pdf && (
              <p className="text-red-400 text-xs mt-1.5 text-center">{downloadErrors.pdf}</p>
            )}
          </div>

          {/* HTML */}
          <div>
            <DownloadCard
              title="HTML"
              description="Visualização no navegador"
              format=".html"
              loading={generatingHtml}
              onDownload={handleHtmlDownload}
              icon={
                <svg className="w-6 h-6" style={{ color: '#c9a96e' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              }
            />
            {downloadErrors.html && (
              <p className="text-red-400 text-xs mt-1.5 text-center">{downloadErrors.html}</p>
            )}
          </div>
        </div>

        {/* Note about generation time */}
        <div
          className="mt-6 rounded-lg p-4 flex items-start gap-3"
          style={{ backgroundColor: 'rgba(154,117,32,0.08)', borderLeft: '3px solid #9a7520' }}
        >
          <svg className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#c9a96e' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-stone-400 text-sm">
            A geração de documentos pode levar de 5 a 10 segundos. Por favor, aguarde o download iniciar.
          </p>
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-5 py-2.5 rounded-lg border font-medium text-stone-300 hover:bg-stone-800 transition-colors"
            style={{ borderColor: '#3c3330' }}
          >
            ← Dashboard
          </button>
        </div>
      </div>
    </Layout>
  )
}
