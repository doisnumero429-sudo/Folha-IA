import React, { useRef, useState } from 'react'

export default function UploadZone({ accept, label, onUpload, loading, result }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)

  function handleDragOver(e) {
    e.preventDefault()
    setDragging(true)
  }

  function handleDragLeave() {
    setDragging(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) setSelectedFile(file)
  }

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (file) setSelectedFile(file)
  }

  function handleUpload() {
    if (selectedFile && onUpload) {
      onUpload(selectedFile)
    }
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const hasSuccess = result && !result.error
  const hasError = result && result.error

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onClick={() => !loading && inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-all"
        style={{
          borderColor: dragging ? '#c9a96e' : hasSuccess ? '#16a34a' : hasError ? '#dc2626' : '#9a7520',
          backgroundColor: dragging
            ? 'rgba(154,117,32,0.1)'
            : hasSuccess
              ? 'rgba(22,163,74,0.05)'
              : 'rgba(28,25,23,0.5)',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
          disabled={loading}
        />

        {hasSuccess ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-green-800/40 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-green-400 font-medium">Arquivo processado com sucesso</p>
            <p className="text-stone-400 text-sm">Clique para substituir</p>
          </div>
        ) : selectedFile ? (
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(154,117,32,0.2)' }}
            >
              <svg className="w-6 h-6" style={{ color: '#c9a96e' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="font-medium" style={{ color: '#c9a96e' }}>{selectedFile.name}</p>
            <p className="text-stone-400 text-sm">{formatBytes(selectedFile.size)}</p>
            <p className="text-stone-500 text-xs">Clique para trocar</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(154,117,32,0.15)' }}
            >
              <svg className="w-7 h-7" style={{ color: '#9a7520' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div>
              <p className="font-medium" style={{ color: '#c9a96e' }}>{label}</p>
              <p className="text-stone-400 text-sm mt-1">Arraste o arquivo aqui ou clique para selecionar</p>
              {accept && (
                <p className="text-stone-500 text-xs mt-1">Aceita: {accept}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {hasError && (
        <div className="rounded-lg border border-red-600 bg-red-800/20 px-4 py-3">
          <p className="text-red-400 text-sm font-medium">Erro ao processar arquivo</p>
          <p className="text-red-300 text-sm mt-1">{result.error}</p>
        </div>
      )}

      {/* Upload button */}
      {selectedFile && !loading && (
        <button
          onClick={handleUpload}
          className="w-full py-3 rounded-lg font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#9a7520' }}
        >
          Enviar e Processar
        </button>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center gap-3 py-3">
          <div
            className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: '#9a7520', borderTopColor: 'transparent' }}
          />
          <span style={{ color: '#c9a96e' }}>Processando arquivo...</span>
        </div>
      )}
    </div>
  )
}
