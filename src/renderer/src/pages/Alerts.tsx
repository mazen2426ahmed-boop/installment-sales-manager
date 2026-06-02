import React, { useEffect, useState } from 'react'
import Icon from '../components/Icon'
import { EmptyState, Spinner } from '../components/ui'
import { useToast } from '../components/Toast'
import { formatDate, formatMoney, todayInput } from '../lib/format'
import type { DueAlert } from '../../../shared/types'

export default function Alerts({ onChanged }: { onChanged: () => void }): React.JSX.Element {
  const { notify } = useToast()
  const [due, setDue] = useState<DueAlert[]>([])
  const [overdue90, setOverdue90] = useState<DueAlert[]>([])
  const [loading, setLoading] = useState(true)

  const load = async (): Promise<void> => {
    setLoading(true)
    const res = await window.api.getDueAlerts()
    if (res.ok && res.data) {
      setDue(res.data.due)
      setOverdue90(res.data.overdue90)
    }
    setLoading(false)
  }
  useEffect(() => {
    void load()
  }, [])

  const pay = async (a: DueAlert): Promise<void> => {
    const res = await window.api.payInstallmentFull(a.installmentId, todayInput())
    if (res.ok) {
      notify('تم سداد القسط', 'success')
      await load()
      onChanged()
    } else notify(res.error || 'خطأ', 'error')
  }

  if (loading) return <Spinner />

  const totalDue = due.reduce((a, x) => a + x.remaining, 0)
  const totalOverdue = overdue90.reduce((a, x) => a + x.remaining, 0)

  const renderTable = (rows: DueAlert[], overdue: boolean): React.JSX.Element =>
    rows.length === 0 ? (
      <div className="table-wrap">
        <EmptyState icon="check" text={overdue ? 'لا توجد أقساط متأخرة أكثر من 90 يوماً' : 'لا توجد أقساط مستحقة حالياً'} />
      </div>
    ) : (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>العميل</th>
              <th>الهاتف</th>
              <th>المنتج</th>
              <th>القسط</th>
              <th>المتبقي</th>
              <th>الاستحقاق</th>
              <th>التأخير</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.installmentId}>
                <td style={{ fontWeight: 600 }}>{a.customerName}</td>
                <td className="num">{a.customerPhone || '—'}</td>
                <td>{a.productName}</td>
                <td>القسط {a.installmentNumber}</td>
                <td className="num money">{formatMoney(a.remaining)}</td>
                <td>{formatDate(a.dueDate)}</td>
                <td>
                  {a.daysLate > 0 ? (
                    <span style={{ color: overdue ? 'var(--danger)' : 'var(--warning)', fontWeight: 600 }}>
                      {a.daysLate} يوم
                    </span>
                  ) : (
                    <span className="muted">اليوم</span>
                  )}
                </td>
                <td>
                  <button className="btn btn-primary btn-sm" onClick={() => pay(a)}>
                    <Icon name="check" size={14} /> سداد
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )

  return (
    <>
      {overdue90.length > 0 && (
        <div className="alert-banner danger">
          <Icon name="alert" size={20} />
          يوجد {overdue90.length} قسط متأخر أكثر من 90 يوماً بإجمالي {formatMoney(totalOverdue)} ج.م — يتطلب متابعة عاجلة
        </div>
      )}

      <div className="section-title">
        <Icon name="alert" size={18} /> أقساط متأخرة أكثر من 90 يوماً ({overdue90.length})
      </div>
      {renderTable(overdue90, true)}

      <div className="section-title" style={{ marginTop: 24 }}>
        <Icon name="bell" size={18} /> أقساط مستحقة ({due.length}) — إجمالي {formatMoney(totalDue)} ج.م
      </div>
      {renderTable(due, false)}
    </>
  )
}
