import React, { createContext, useContext } from 'react'
import type { User, LicenseStatus } from '../../../shared/types'

interface AppContextValue {
  user: User
  license: LicenseStatus
  readOnly: boolean
  isOwner: boolean
  refreshLicense: () => Promise<void>
  logout: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({
  value,
  children
}: {
  value: AppContextValue
  children: React.ReactNode
}): React.JSX.Element {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
