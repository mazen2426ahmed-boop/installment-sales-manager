import React, { useCallback, useEffect, useState } from 'react'
import Icon, { IconName } from './components/Icon'
import { ToastProvider } from './components/Toast'
import { AppProvider } from './context/AppContext'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import Inventory from './pages/Inventory'
import Sales from './pages/Sales'
import Alerts from './pages/Alerts'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Users from './pages/Users'
import License from './pages/License'
import Login from './pages/Login'
import FirstRunSetup from './pages/FirstRunSetup'
import type { User, LicenseStatus, UserRole } from '../../shared/types'

type PageKey =
  | 'dashboard'
  | 'customers'
  | 'inventory'
  | 'sales'
  | 'alerts'
  | 'reports'
  | 'settings'
  | 'users'
  | 'license'

interface NavDef {
  key: PageKey
  label: string
  icon: IconName
  ownerOnly?: boolean
}

const NAV: NavDef[] = [
  { key: 'dashboard', label: 'الرئيسية', icon: 'dashboard' },
  { key: 'sales', label: 'المبيعات والأقساط', icon: 'cart' },
  { key: 'alerts', label: 'التنبيهات', icon: 'bell' },
  { key: 'customers', label: 'العملاء', icon: 'users' },
  { key: 'inventory', label: 'المخزون والموردون', icon: 'box' },
  { key: 'reports', label: 'التقارير', icon: 'report' },
  { key: 'users', label: 'المستخدمون', icon: 'user', ownerOnly: true },
  { key: 'license', label: 'الترخيص', icon: 'shield', ownerOnly: true },
  { key: 'settings', label: 'الإعدادات', icon: 'settings', ownerOnly: true }
]

const TITLES: Record<PageKey, string> = {
  dashboard: 'لوحة المعلومات',
  customers: 'إدارة العملاء',
  inventory: 'المخزون والموردون',
  sales: 'المبيعات والأقساط',
  alerts: 'تنبيهات الأقساط',
  reports: 'التقارير المالية',
  settings: 'الإعدادات والنسخ الاحتياطي',
  users: 'إدارة المستخدمين',
  license: 'الترخيص'
}

const roleLabel = (r: UserRole): string => (r === 'owner' ? 'مالك' : 'بائع')

type Phase = 'loading' | 'setup' | 'login' | 'ready'

export default function App(): React.JSX.Element {
  const [phase, setPhase] = useState<Phase>('loading')
  const [user, setUser] = useState<User | null>(null)
  const [license, setLicense] = useState<LicenseStatus | null>(null)

  useEffect(() => {
    void (async () => {
      const res = await window.api.getSetupStatus()
      if (res.ok && res.data?.needsSetup) setPhase('setup')
      else setPhase('login')
    })()
  }, [])

  const loadLicense = useCallback(async () => {
    const res = await window.api.licenseStatus()
    if (res.ok && res.data) setLicense(res.data)
  }, [])

  const onAuthed = useCallback(
    async (u: User) => {
      setUser(u)
      await loadLicense()
      setPhase('ready')
    },
    [loadLicense]
  )

  const logout = useCallback(async () => {
    await window.api.logout()
    setUser(null)
    setLicense(null)
    setPhase('login')
  }, [])

  if (phase === 'loading') {
    return (
      <div className="auth-screen">
        <div className="spinner" />
      </div>
    )
  }
  if (phase === 'setup') return <FirstRunSetup onDone={onAuthed} />
  if (phase === 'login' || !user || !license) return <Login onLoggedIn={onAuthed} />

  return (
    <ToastProvider>
      <AppProvider
        value={{
          user,
          license,
          readOnly: license.readOnly,
          isOwner: user.role === 'owner',
          refreshLicense: loadLicense,
          logout
        }}
      >
        <Shell user={user} license={license} onLogout={logout} />
      </AppProvider>
    </ToastProvider>
  )
}

function Shell({
  user,
  license,
  onLogout
}: {
  user: User
  license: LicenseStatus
  onLogout: () => void
}): React.JSX.Element {
  const [page, setPage] = useState<PageKey>('dashboard')
  const [alertCount, setAlertCount] = useState(0)

  const items = NAV.filter((n) => !n.ownerOnly || user.role === 'owner')

  const refreshAlertCount = useCallback(async () => {
    const res = await window.api.getDueAlerts()
    if (res.ok && res.data) setAlertCount(res.data.due.length + res.data.overdue90.length)
  }, [])

  useEffect(() => {
    void refreshAlertCount()
  }, [refreshAlertCount, page])

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">
            <Icon name="wallet" size={24} />
          </div>
          <div className="brand-text">
            <h1>البيع بالتقسيط</h1>
            <span>إدارة الأجهزة والأقساط</span>
          </div>
        </div>
        <nav className="nav">
          {items.map((n) => (
            <button
              key={n.key}
              className={`nav-item ${page === n.key ? 'active' : ''}`}
              onClick={() => setPage(n.key)}
            >
              <Icon name={n.icon} size={19} />
              <span>{n.label}</span>
              {n.key === 'alerts' && alertCount > 0 && <span className="badge">{alertCount}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="su-info">
            <Icon name="user" size={16} />
            <div>
              <strong>{user.name}</strong>
              <span>{roleLabel(user.role)}</span>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm logout-btn" onClick={onLogout} title="تسجيل الخروج">
            <Icon name="logout" size={16} />
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <h2>{TITLES[page]}</h2>
          <div className="spacer" />
          {license.readOnly ? (
            <span className="lic-pill danger">
              <Icon name="lock" size={14} /> وضع العرض فقط — الترخيص منتهٍ
            </span>
          ) : (
            license.daysLeft <= 7 && (
              <span className="lic-pill warn">
                <Icon name="alert" size={14} /> ينتهي الترخيص خلال {license.daysLeft} يوم
              </span>
            )
          )}
          <span className="muted">
            {new Date().toLocaleDateString('ar-EG', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </span>
        </header>
        <main className="content">
          {license.readOnly && (
            <div className="alert-banner" style={{ marginBottom: 16 }}>
              <Icon name="lock" size={18} />
              انتهت صلاحية الترخيص — يمكنك عرض البيانات والتقارير والتصدير، لكن إضافة أو تعديل البيانات متوقفة حتى تجديد
              الترخيص{user.role === 'owner' ? ' من صفحة «الترخيص».' : '. تواصل مع المالك لتجديد الترخيص.'}
            </div>
          )}
          {page === 'dashboard' && <Dashboard onNavigate={(p) => setPage(p as PageKey)} />}
          {page === 'customers' && <Customers />}
          {page === 'inventory' && <Inventory />}
          {page === 'sales' && <Sales onChanged={refreshAlertCount} />}
          {page === 'alerts' && <Alerts onChanged={refreshAlertCount} />}
          {page === 'reports' && <Reports />}
          {page === 'users' && <Users />}
          {page === 'license' && <License />}
          {page === 'settings' && <Settings />}
        </main>
      </div>
    </div>
  )
}
