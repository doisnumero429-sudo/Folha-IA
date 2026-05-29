import React from 'react'

export default function PendingBanner({ pendencias }) {
  if (!pendencias || pendencias.length === 0) return null

  const openPendencias = pendencias.filter(p => p.status === 'open' || p.status === 'pendente' || !p.resolved)

  if (openPendencias.length === 0) return null

  const blocked = openPendencias.filter(p => p.tipo === 'blocked' || p.tipo === 'bloqueado')
  const ambiguous = openPendencias.filter(p => p.tipo === 'ambiguous' || p.tipo === 'ambiguo')
  const conflicts = openPendencias.filter(p => p.tipo === 'conflict' || p.tipo === 'conflito')
  const others = openPendencias.filter(
    p => !['blocked', 'bloqueado', 'ambiguous', 'ambiguo', 'conflict', 'conflito'].includes(p.tipo)
  )

  const critical = [...blocked, ...ambiguous, ...conflicts]

  return (
    <div className="rounded-lg border border-red-600 bg-red-900/20 p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-red-800/50 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-red-300">
            {openPendencias.length} pendência{openPendencias.length !== 1 ? 's' : ''} em aberto
          </p>

          {/* Counts by type */}
          <div className="flex flex-wrap gap-3 mt-2">
            {blocked.length > 0 && (
              <span className="text-xs px-2 py-1 rounded-full bg-red-800/40 text-red-300 border border-red-700">
                {blocked.length} bloqueado{blocked.length !== 1 ? 's' : ''}
              </span>
            )}
            {ambiguous.length > 0 && (
              <span className="text-xs px-2 py-1 rounded-full bg-yellow-800/40 text-yellow-300 border border-yellow-700">
                {ambiguous.length} ambíguo{ambiguous.length !== 1 ? 's' : ''}
              </span>
            )}
            {conflicts.length > 0 && (
              <span className="text-xs px-2 py-1 rounded-full bg-orange-800/40 text-orange-300 border border-orange-700">
                {conflicts.length} conflito{conflicts.length !== 1 ? 's' : ''}
              </span>
            )}
            {others.length > 0 && (
              <span className="text-xs px-2 py-1 rounded-full bg-stone-700/40 text-stone-300 border border-stone-600">
                {others.length} outro{others.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Critical items list */}
          {critical.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {critical.slice(0, 5).map((p, idx) => (
                <div key={p.id || idx} className="flex items-start gap-2 text-sm">
                  <span
                    className="inline-block w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                    style={{
                      backgroundColor:
                        p.tipo === 'blocked' || p.tipo === 'bloqueado'
                          ? '#ef4444'
                          : p.tipo === 'ambiguous' || p.tipo === 'ambiguo'
                            ? '#eab308'
                            : '#f97316'
                    }}
                  />
                  <span className="text-red-200">
                    {p.mensagem || p.message || `${p.tipo}: ${p.nome || p.alias || p.id}`}
                  </span>
                </div>
              ))}
              {critical.length > 5 && (
                <p className="text-red-400 text-xs ml-4">
                  +{critical.length - 5} mais na aba Pendências
                </p>
              )}
            </div>
          )}

          <p className="text-red-400 text-xs mt-3">
            Resolva todas as pendências na aba "Pendências" antes de aprovar o fechamento.
          </p>
        </div>
      </div>
    </div>
  )
}
