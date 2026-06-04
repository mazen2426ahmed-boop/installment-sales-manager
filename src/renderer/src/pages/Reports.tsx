import React, { useState } from 'react'
import Icon from '../components/Icon'
import { Spinner } from '../components/ui'
import { useToast } from '../components/Toast'
import { formatDate, formatMoney } from '../lib/format'
import type { ReportSummary } from '../../../shared/types'

function firstOfYear(): string {
  return `${new Date().getFullYear()}-01-01`
}
function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function Reports(): React.JSX.Element {
  const { notify } = useToast()
  const [from, setFrom] = useState(firstOfYear())
  const [to, setTo] = useState(today())
  const [report, setReport] = useState<ReportSummary | null>(null)
  const [loading, setLoading] = useState(false)

  const generate = async (): Promise<void> => {
    setLoading(true)
    const res = await window.api.getReport(from, to)
    setLoading(false)
    if (res.ok && res.data) setReport(res.data)
    else notify(res.error || 'خطأ', 'error')
  }

  const print = async (): Promise<void> => {
    const res = await window.api.printReport(from, to)
    if (!res.ok) notify(res.error || 'تعذرت الطباعة', 'error')
  }

  const exportExcel = async (): Promise<void> => {
    const res = await window.api.exportReportExcel(from, to)
    if (res.ok && res.data) notify('تم تصدير التقرير', 'success')
    else if (res.error) notify(res.error, 'error')
  }

  return (
    <>
      <div className="card card-pad" style={{ marginBottom: 18 }}>
        <div className="row" style={{ flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
          <div className="field" style={{ flex: '0 0 180px' }}>
            <label>من تاريخ</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="field" style={{ flex: '0 0 180px' }}>
            <label>إلى تاريخ</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={generate}>
            <Icon name="report" size={16} /> عرض التقرير
          </button>
          {report && (
            <>
              <button className="btn btn-outline" onClick={print}>
                <Icon name="print" size={16} /> طباعة
              </button>
              <button className="btn btn-outline" onClick={exportExcel}>
                <Icon name="download" size={16} /> تصدير Excel
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : report ? (
        <>
          <div className="summary-box">
            <div className="item">
              <div className="k">عدد العمليات</div>
              <div className="v">{report.salesCount}</div>
            </div>
            <div className="item">
              <div className="k">إجمالي المبيعات</div>
              <div className="v money">{formatMoney(report.totalSales)}</div>
            </div>
            <div className="item">
              <div className="k">إجمالي المقدمات</div>
              <div className="v money">{formatMoney(report.totalDownPayments)}</div>
            </div>
            <div className="item">
              <div className="k">إجمالي المحصّل</div>
              <div className="v money">{formatMoney(report.totalCollected)}</div>
            </div>
            <div className="item">
              <div className="k">إجمالي المتبقي</div>
              <div className="v money">{formatMoney(report.totalOutstanding)}</div>
            </div>
            <div className="item">
              <div className="k">الأرباح المُحقَّقة (على المحصّل)</div>
              <div className="v money">{formatMoney(report.totalProfit)}</div>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>التاريخ</th>
                  <th>العميل</th>
                  <th>المنتج</th>
                  <th>سعر البيع</th>
                  <th>المقدم</th>
                  <th>المحصّل</th>
                  <th>المتبقي</th>
                  <th>الربح المُحقَّق</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="empty">
                      لا توجد عمليات بيع في هذه الفترة
                    </td>
                  </tr>
                ) : (
                  report.rows.map((r, i) => (
                    <tr key={r.saleId}>
                      <td className="muted">{i + 1}</td>
                      <td className="muted">{formatDate(r.saleDate)}</td>
                      <td style={{ fontWeight: 600 }}>{r.customerName}</td>
                      <td>
                        {r.productName} <span className="chip">{r.brand}</span>
                      </td>
                      <td className="num money">{formatMoney(r.salePrice)}</td>
                      <td className="num money">{formatMoney(r.downPayment)}</td>
                      <td className="num money">{formatMoney(r.collected)}</td>
                      <td className="num money">{formatMoney(r.outstanding)}</td>
                      <td className="num money" style={{ color: 'var(--success)' }}>
                        {formatMoney(r.profit)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="card">
          <div className="empty">
            <Icon name="report" size={48} />
            <p>اختر الفترة ثم اضغط «عرض التقرير» لاستعراض الحركة المالية</p>
          </div>
        </div>
      )}
    </>
  )
}
