import React from 'react'
import { Link } from 'react-router-dom'

const STEPS = [
  { num: 1, label: 'Mês/Ano', path: '' },
  { num: 2, label: 'Consumo', path: 'consumo' },
  { num: 3, label: 'Vales', path: 'vales' },
  { num: 4, label: 'Faltas', path: 'faltas' },
  { num: 5, label: 'Atestados', path: 'atestados' },
  { num: 6, label: 'Conferência', path: 'conferencia' },
  { num: 7, label: 'Gerar', path: 'gerar' }
]

export default function StepIndicator({ currentStep, fechamentoId }) {
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between relative">
        {/* Connecting line */}
        <div
          className="absolute top-5 left-0 right-0 h-0.5"
          style={{ backgroundColor: '#2c2420', zIndex: 0 }}
        />

        {STEPS.map((step, idx) => {
          const isCompleted = step.num < currentStep
          const isActive = step.num === currentStep
          const isFuture = step.num > currentStep

          let circleStyle = {}
          let textStyle = {}

          if (isCompleted) {
            circleStyle = { backgroundColor: '#16a34a', color: '#fff', borderColor: '#16a34a' }
            textStyle = { color: '#86efac' }
          } else if (isActive) {
            circleStyle = { backgroundColor: '#9a7520', color: '#fff', borderColor: '#9a7520' }
            textStyle = { color: '#c9a96e' }
          } else {
            circleStyle = { backgroundColor: '#292524', color: '#78716c', borderColor: '#44403c' }
            textStyle = { color: '#78716c' }
          }

          const stepPath = step.num === 1
            ? (fechamentoId ? `/fechamento/${fechamentoId}/consumo` : '/fechamento/novo')
            : fechamentoId
              ? `/fechamento/${fechamentoId}/${step.path}`
              : '#'

          const content = (
            <div className="flex flex-col items-center gap-1.5" key={step.num}>
              <div
                className="w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-sm z-10 relative transition-all"
                style={circleStyle}
              >
                {isCompleted ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.num
                )}
              </div>
              <span className="text-xs font-medium hidden sm:block" style={textStyle}>
                {step.label}
              </span>
            </div>
          )

          // Free navigation: every step is clickable as long as we already have
          // a fechamento. The visual style (done = green, current = gold,
          // others = grey) stays the same — only the lock is removed.
          if (fechamentoId) {
            return (
              <Link to={stepPath} key={step.num}>
                {content}
              </Link>
            )
          }

          return <div key={step.num}>{content}</div>
        })}
      </div>

      {/* Mobile step label */}
      <div className="mt-3 text-center sm:hidden">
        <span className="text-sm font-medium" style={{ color: '#c9a96e' }}>
          Passo {currentStep}: {STEPS[currentStep - 1]?.label}
        </span>
      </div>
    </div>
  )
}
