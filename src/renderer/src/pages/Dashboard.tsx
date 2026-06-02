import React, { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import Icon from '../components/Icon'
import { Spinner, StatCard } from '../components/ui'
import { formatMoney } from '../lib/format'
import type { DashboardStats, DueAlert } from '../../../shared/types'

export default function Dashboard({ onNavigate }: { onNavigate: (p: string) => void }): React.JSX.Element {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [monthly, setMonthly] = useState<{ month: string; collected: number }[]>([])
  const [alerts, setAlerts] = useState<{ due: DueAlert[]; overdue90: DueAlert[] }>({ due: [], overdue90: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      const [s, m, a] = await Promise.all([
        window.api.getDashboardStats(),
        window.api.getMonthlyCollection(),
        window.api.getDueAlerts()
      ])
      if (s.ok && s.data) setStats(s.data)
      if (m.ok && m.data) setMonthly(m.data)
      if (a.ok && a.data) setAlerts(a.data)
      setLoading(false)
    })()
  }, [])

  if (loading || !stats) return <Spinner />

  const chartData = monthly.map((m) => ({ name: m.month.slice(5) + '/' + m.month.slice(2, 4), value: m.collected }))

  return (
    <>
      <div className="stat-grid">
        <StatCard icon="users" label="عدد العملاء" value={String(stats.customersCount)} color="#6366f1" />
        <StatCard icon="cart" label="عدد عمليات البيع" value={String(stats.salesCount)} color="#0d9488" />
        <StatCard icon="money" label="إجمالي المبيعات" value={formatMoney(stats.totalSales)} suffix="ج.م" color="#0ea5e9" />
        <StatCard icon="wallet" label="إجمالي المحصّل" value={formatMoney(stats.totalCollected)} suffix="ج.م" color="#16a34a" />
        <StatCard icon="trending" label="إجمالي الأرباح" value={formatMoney(stats.totalProfit)} suffix="ج.م" color="#8b5cf6" />
        <StatCard icon="alert" label="المتبقي على العملاء" value={formatMoney(stats.totalOutstanding)} suffix="ج.م" color="#f59e0b" />
      </div>

      <div className="two-col">
        <div className="chart-card">
          <div className="section-title">
            <Icon name="trending" size={18} /> التحصيل الشهري (آخر 12 شهراً)
          </div>
          {chartData.length === 0 ? (
            <div className="empty">
              <Icon name="report" size={40} />
              <p>لا توجد بيانات تحصيل بعد</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} width={70} />
                <Tooltip formatter={(v: number) => [formatMoney(v) + ' ج.م', 'المحصّل']} />
                <Bar dataKey="value" fill="#0d9488" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            className="card card-pad"
            style={{ cursor: 'pointer', borderInlineStart: '4px solid var(--danger)' }}
            onClick={() => onNavigate('alerts')}
          >
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div className="row" style={{ gap: 10 }}>
                <div className="stat-icon" style={{ background: 'var(--danger)', width: 42, height: 42 }}>
                  <Icon name="alert" size={20} />
                </div>
                <div>
                  <div className="muted" style={{ fontSize: 12.5 }}>متأخرة أكثر من 90 يوم</div>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>{stats.overdue90Count}</div>
                </div>
              </div>
              <Icon name="chevron" size={18} className="muted" />
            </div>
            <div className="muted money" style={{ marginTop: 8 }}>
              بإجمالي {formatMoney(stats.overdue90Amount)}
            </div>
          </div>

          <div
            className="card card-pad"
            style={{ cursor: 'pointer', borderInlineStart: '4px solid var(--warning)' }}
            onClick={() => onNavigate('alerts')}
          >
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div className="row" style={{ gap: 10 }}>
                <div className="stat-icon" style={{ background: 'var(--warning)', width: 42, height: 42 }}>
                  <Icon name="bell" size={20} />
                </div>
                <div>
                  <div className="muted" style={{ fontSize: 12.5 }}>مستحقة هذا الشهر</div>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>{stats.dueThisMonthCount}</div>
                </div>
              </div>
              <Icon name="chevron" size={18} className="muted" />
            </div>
            <div className="muted" style={{ marginTop: 8 }}>
              مستحقة اليوم: {stats.dueTodayCount}
            </div>
          </div>

          <button className="btn btn-primary" style={{ justifyContent: 'center', padding: 14 }} onClick={() => onNavigate('sales')}>
            <Icon name="plus" size={18} /> تسجيل عملية بيع جديدة
          </button>
        </div>
      </div>

      {(alerts.overdue90.length > 0 || alerts.due.length > 0) && (
        <div style={{ marginTop: 20 }}>
          <div className="section-title">
            <Icon name="bell" size={18} /> أحدث الأقساط المستحقة والمتأخرة
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>العميل</th>
                  <th>المنتج</th>
                  <th>القسط</th>
                  <th>المتبقي</th>
                  <th>الاستحقاق</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {[...alerts.overdue90, ...alerts.due].slice(0, 6).map((a) => (
                  <tr key={a.installmentId}>
                    <td style={{ fontWeight: 600 }}>{a.customerName}</td>
                    <td>{a.productName}</td>
                    <td>القسط {a.installmentNumber}</td>
                    <td className="num money">{formatMoney(a.remaining)}</td>
                    <td className="muted">{a.dueDate}</td>
                    <td>
                      <span className={`badge-status ${a.status === 'overdue' ? 'badge-overdue' : 'badge-due'}`}>
                        {a.status === 'overdue' ? `متأخر ${a.daysLate} يوم` : 'مستحق'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
