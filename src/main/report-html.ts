import type { ReportSummary } from '../shared/types'

const fmt = (n: number): string =>
  new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 2 }).format(n)

export function buildReportHtml(report: ReportSummary): string {
  const rows = report.rows
    .map(
      (r, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${r.saleDate}</td>
        <td>${escapeHtml(r.customerName)}</td>
        <td>${escapeHtml(r.productName)} ${escapeHtml(r.brand)}</td>
        <td>${fmt(r.salePrice)}</td>
        <td>${fmt(r.downPayment)}</td>
        <td>${fmt(r.financedAmount)}</td>
        <td>${fmt(r.collected)}</td>
        <td>${fmt(r.outstanding)}</td>
        <td>${fmt(r.profit)}</td>
      </tr>`
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>تقرير الحركة المالية</title>
<style>
  * { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; }
  body { margin: 24px; color: #1e293b; }
  h1 { text-align: center; margin: 0 0 4px; font-size: 22px; }
  .period { text-align: center; color: #64748b; margin-bottom: 18px; font-size: 14px; }
  .summary { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 18px; justify-content: center; }
  .card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 16px; min-width: 150px; text-align: center; }
  .card .label { color: #64748b; font-size: 12px; }
  .card .value { font-size: 18px; font-weight: 700; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { border: 1px solid #cbd5e1; padding: 7px 8px; text-align: center; }
  thead th { background: #0f766e; color: #fff; }
  tfoot td { font-weight: 700; background: #f1f5f9; }
  tbody tr:nth-child(even) { background: #f8fafc; }
  .footer { margin-top: 16px; text-align: center; color: #94a3b8; font-size: 11px; }
</style>
</head>
<body>
  <h1>تقرير الحركة المالية</h1>
  <div class="period">من ${report.from} إلى ${report.to} — عدد العمليات: ${report.salesCount}</div>
  <div class="summary">
    <div class="card"><div class="label">إجمالي المبيعات</div><div class="value">${fmt(report.totalSales)}</div></div>
    <div class="card"><div class="label">إجمالي المقدمات</div><div class="value">${fmt(report.totalDownPayments)}</div></div>
    <div class="card"><div class="label">المحصّل</div><div class="value">${fmt(report.totalCollected)}</div></div>
    <div class="card"><div class="label">المتبقي</div><div class="value">${fmt(report.totalOutstanding)}</div></div>
    <div class="card"><div class="label">إجمالي الأرباح</div><div class="value">${fmt(report.totalProfit)}</div></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th><th>التاريخ</th><th>العميل</th><th>المنتج</th>
        <th>سعر البيع</th><th>المقدم</th><th>الممول</th><th>المحصّل</th><th>المتبقي</th><th>الربح</th>
      </tr>
    </thead>
    <tbody>${rows || '<tr><td colspan="10">لا توجد بيانات في هذه الفترة</td></tr>'}</tbody>
    <tfoot>
      <tr>
        <td colspan="4">الإجمالي</td>
        <td>${fmt(report.totalSales)}</td>
        <td>${fmt(report.totalDownPayments)}</td>
        <td>${fmt(report.totalFinanced)}</td>
        <td>${fmt(report.totalCollected)}</td>
        <td>${fmt(report.totalOutstanding)}</td>
        <td>${fmt(report.totalProfit)}</td>
      </tr>
    </tfoot>
  </table>
  <div class="footer">تم إنشاء التقرير بواسطة برنامج إدارة البيع بالتقسيط — ${new Date().toLocaleString('ar-EG')}</div>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
