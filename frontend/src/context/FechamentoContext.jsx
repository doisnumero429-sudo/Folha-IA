import React, { createContext, useContext, useReducer } from 'react'

const FechamentoContext = createContext(null)

const initialState = {
  fechamentoId: null,
  mes: null,
  ano: null,
  status: null,
  consumoResult: null,
  valesResult: null,
  faltas: [],
  pendencias: [],
  lancamentos: []
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_FECHAMENTO':
      return {
        ...state,
        fechamentoId: action.payload.id,
        mes: action.payload.mes,
        ano: action.payload.ano,
        status: action.payload.status
      }
    case 'SET_CONSUMO_RESULT':
      return { ...state, consumoResult: action.payload }
    case 'SET_VALES_RESULT':
      return { ...state, valesResult: action.payload }
    case 'ADD_FALTA':
      return { ...state, faltas: [...state.faltas, action.payload] }
    case 'REMOVE_FALTA':
      return {
        ...state,
        faltas: state.faltas.filter((_, i) => i !== action.payload)
      }
    case 'SET_FALTAS':
      return { ...state, faltas: action.payload }
    case 'SET_PENDENCIAS':
      return { ...state, pendencias: action.payload }
    case 'SET_LANCAMENTOS':
      return { ...state, lancamentos: action.payload }
    case 'UPDATE_LANCAMENTO':
      return {
        ...state,
        lancamentos: state.lancamentos.map(l =>
          l.funcionario_id === action.payload.funcionario_id
            ? { ...l, ...action.payload }
            : l
        )
      }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

export function FechamentoProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  return (
    <FechamentoContext.Provider value={{ state, dispatch }}>
      {children}
    </FechamentoContext.Provider>
  )
}

export function useFechamento() {
  const ctx = useContext(FechamentoContext)
  if (!ctx) throw new Error('useFechamento must be used within FechamentoProvider')
  return ctx
}
