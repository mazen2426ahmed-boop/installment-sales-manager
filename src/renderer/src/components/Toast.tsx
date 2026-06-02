import React, { createContext, useCallback, useContext, useState } from 'react'
import Icon from './Icon'

type ToastKind = 'success' | 'error' | 'info'
interface ToastState {
  message: string
  kind: ToastKind
}

interface ToastCtx {
  notify: (message: string, kind?: ToastKind) => void
}

const Ctx = createContext<ToastCtx>({ notify: () => {} })

export function useToast(): ToastCtx {
  return useContext(Ctx)
}

export function ToastProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [toast, setToast] = useState<ToastState | null>(null)

  const notify = useCallback((message: string, kind: ToastKind = 'info') => {
    setToast({ message, kind })
    window.setTimeout(() => setToast(null), 3200)
  }, [])

  return (
    <Ctx.Provider value={{ notify }}>
      {children}
      {toast && (
        <div className={`toast ${toast.kind}`}>
          <Icon name={toast.kind === 'error' ? 'alert' : 'check'} size={18} />
          <span>{toast.message}</span>
        </div>
      )}
    </Ctx.Provider>
  )
}
