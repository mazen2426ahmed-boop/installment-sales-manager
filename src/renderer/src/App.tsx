import React, { useCallback, useEffect, useState } from 'react'
import Icon, { IconName } from './components/Icon'
import { ToastProvider } from './components/Toast'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import Inventory from './pages/Inventory'
import Sales from './pages/Sales'
import Alerts from './pages/Alerts'
import Reports from './pages/Reports'
import Settings from './pages/Settings'

type PageKey = 'dashboard' | 'customers' | 'inventory' | 'sales' | 'alerts' | 'reports' | 'settings'

interface NavDef {
  key: PageKey
  label: string
  icon: IconName
}

const NAV: NavDef[] = [
  { key: 'dashboard', label: 'الرئيسية', icon: 'dashboard' },
  { key: 'sales', label: 'المبيعات والأقساط', icon: 'cart' },
  { key: 'alerts', label: 'التنبيهات', icon: 'bell' },
  { key: 'customers', label: 'العملاء', icon: 'users' },
  { key: 'inventory', label: 'المخزون والموردون', icon: 'box' },
  { key: 'reports', label: 'التقارير', icon: 'report' },
  { key: 'settings', label: 'الإعدادات', icon: 'settings' }
]

const TITLES: Record<PageKey, string> = {
  dashboard: 'لوحة المعلومات',
  customers: 'إدارة العملاء',
  inventory: 'المخزون والموردون',
  sales: 'المبيعات والأقساط',
  alerts: 'تنبيهات الأقساط',
  reports: 'التقارير المالية',
  settings: 'الإعدادات والنسخ الاحتياطي'
}

export default function App(): React.JSX.Element {
  const [page, setPage] = useState<PageKey>('dashboard')
  const [alertCount, setAlertCount] = useState(0)

  const refreshAlertCount = useCallback(async () => {
    const res = await window.api.getDueAlerts()
    if (res.ok && res.data) {
      setAlertCount(res.data.due.length + res.data.overdue90.length)
    }
  }, [])

  useEffect(() => {
    void refreshAlertCount()
  }, [refreshAlertCount, page])

  return (
    <ToastProvider>
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
            {NAV.map((n) => (
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
          <div className="sidebar-footer">الإصدار 1.0.0</div>
        </aside>

        <div className="main">
          <header className="topbar">
            <h2>{TITLES[page]}</h2>
            <div className="spacer" />
            <span className="muted">{new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </header>
          <main className="content">
            {page === 'dashboard' && <Dashboard onNavigate={(p) => setPage(p as PageKey)} />}
            {page === 'customers' && <Customers />}
            {page === 'inventory' && <Inventory />}
            {page === 'sales' && <Sales onChanged={refreshAlertCount} />}
            {page === 'alerts' && <Alerts onChanged={refreshAlertCount} />}
            {page === 'reports' && <Reports />}
            {page === 'settings' && <Settings />}
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
