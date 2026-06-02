import * as XLSX from 'xlsx'
import {
  listCustomers,
  listProducts,
  listSales,
  createCustomer,
  createProduct,
  getReport
} from './services'

/* ============================ التصدير ============================ */

export function exportCustomers(filePath: string): number {
  const rows = listCustomers().map((c) => ({
    'الاسم': c.name,
    'الهاتف': c.phone,
    'الرقم القومي': c.nationalId,
    'العنوان': c.address,
    'ملاحظات': c.notes
  }))
  writeSheet(filePath, rows, 'العملاء')
  return rows.length
}

export function exportProducts(filePath: string): number {
  const rows = listProducts().map((p) => ({
    'اسم المنتج': p.name,
    'الفئة': p.category,
    'البراند': p.brand,
    'سعر الشراء': p.purchasePrice,
    'المخزون': p.stock,
    'ملاحظات': p.notes
  }))
  writeSheet(filePath, rows, 'المنتجات')
  return rows.length
}

export function exportSales(filePath: string): number {
  const sales = listSales()
  const salesRows = sales.map((s) => ({
    'رقم': s.id,
    'التاريخ': s.saleDate,
    'العميل': s.customerName,
    'الهاتف': s.customerPhone,
    'المنتج': s.productName,
    'البراند': s.brand,
    'الكمية': s.quantity,
    'سعر الشراء': s.purchasePrice,
    'هامش الربح %': s.profitMargin,
    'سعر البيع': s.salePrice,
    'المقدم': s.downPayment,
    'المبلغ الممول': s.financedAmount,
    'المحصّل': s.totalPaid,
    'المتبقي': s.totalRemaining,
    'عدد الأقساط': s.installmentsCount
  }))

  const instRows: Record<string, unknown>[] = []
  for (const s of sales) {
    for (const i of s.installments) {
      instRows.push({
        'رقم البيع': s.id,
        'العميل': s.customerName,
        'المنتج': s.productName,
        'رقم القسط': i.number,
        'قيمة القسط': i.amount,
        'تاريخ الاستحقاق': i.dueDate,
        'المدفوع': i.paidAmount,
        'تاريخ السداد': i.paidDate ?? '',
        'الحالة': statusLabel(i.status)
      })
    }
  }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(salesRows), 'المبيعات')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(instRows), 'الأقساط')
  XLSX.writeFile(wb, filePath)
  return salesRows.length
}

export function exportReport(filePath: string, from: string, to: string): number {
  const report = getReport(from, to)
  const rows = report.rows.map((r) => ({
    'رقم البيع': r.saleId,
    'التاريخ': r.saleDate,
    'العميل': r.customerName,
    'المنتج': r.productName,
    'البراند': r.brand,
    'سعر البيع': r.salePrice,
    'المقدم': r.downPayment,
    'المبلغ الممول': r.financedAmount,
    'المحصّل': r.collected,
    'المتبقي': r.outstanding,
    'الربح': r.profit
  }))
  rows.push({
    'رقم البيع': '' as never,
    'التاريخ': '' as never,
    'العميل': 'الإجمالي' as never,
    'المنتج': '' as never,
    'البراند': '' as never,
    'سعر البيع': report.totalSales,
    'المقدم': report.totalDownPayments,
    'المبلغ الممول': report.totalFinanced,
    'المحصّل': report.totalCollected,
    'المتبقي': report.totalOutstanding,
    'الربح': report.totalProfit
  })
  writeSheet(filePath, rows, 'تقرير')
  return report.rows.length
}

/* ============================ الاستيراد ============================ */

// قراءة أول ورقة وإرجاع الصفوف ككائنات
function readFirstSheet(filePath: string): Record<string, unknown>[] {
  const wb = XLSX.readFile(filePath)
  const sheetName = wb.SheetNames[0]
  const sheet = wb.Sheets[sheetName]
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
}

function pick(row: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = row[k]
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}

function pickNum(row: Record<string, unknown>, keys: string[]): number {
  const v = pick(row, keys)
  const n = parseFloat(v.replace(/,/g, ''))
  return isNaN(n) ? 0 : n
}

export function importCustomers(filePath: string): { imported: number; skipped: number } {
  const rows = readFirstSheet(filePath)
  let imported = 0
  let skipped = 0
  for (const row of rows) {
    const name = pick(row, ['الاسم', 'اسم العميل', 'name', 'Name', 'العميل'])
    if (!name) {
      skipped++
      continue
    }
    createCustomer({
      name,
      phone: pick(row, ['الهاتف', 'الموبايل', 'phone', 'Phone', 'الجوال']),
      nationalId: pick(row, ['الرقم القومي', 'الرقم القومى', 'nationalId', 'National ID']),
      address: pick(row, ['العنوان', 'address', 'Address']),
      notes: pick(row, ['ملاحظات', 'notes', 'Notes'])
    })
    imported++
  }
  return { imported, skipped }
}

export function importProducts(filePath: string): { imported: number; skipped: number } {
  const rows = readFirstSheet(filePath)
  let imported = 0
  let skipped = 0
  for (const row of rows) {
    const name = pick(row, ['اسم المنتج', 'المنتج', 'name', 'Name', 'الصنف'])
    if (!name) {
      skipped++
      continue
    }
    createProduct({
      name,
      category: pick(row, ['الفئة', 'النوع', 'category', 'Category']),
      brand: pick(row, ['البراند', 'الماركة', 'brand', 'Brand']),
      supplierId: null,
      purchasePrice: pickNum(row, ['سعر الشراء', 'السعر', 'purchasePrice', 'Price']),
      stock: pickNum(row, ['المخزون', 'الكمية', 'stock', 'Stock', 'Quantity']),
      notes: pick(row, ['ملاحظات', 'notes', 'Notes'])
    })
    imported++
  }
  return { imported, skipped }
}

/* ============================ القوالب ============================ */

export function exportCustomersTemplate(filePath: string): void {
  writeSheet(
    filePath,
    [{ 'الاسم': 'مثال: أحمد محمد', 'الهاتف': '01000000000', 'الرقم القومي': '', 'العنوان': '', 'ملاحظات': '' }],
    'قالب العملاء'
  )
}

export function exportProductsTemplate(filePath: string): void {
  writeSheet(
    filePath,
    [
      {
        'اسم المنتج': 'مثال: ثلاجة',
        'الفئة': 'أجهزة منزلية',
        'البراند': 'سامسونج',
        'سعر الشراء': 10000,
        'المخزون': 5,
        'ملاحظات': ''
      }
    ],
    'قالب المنتجات'
  )
}

/* ============================ أدوات مساعدة ============================ */

function writeSheet(filePath: string, rows: Record<string, unknown>[], sheetName: string): void {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}])
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, filePath)
}

function statusLabel(status?: string): string {
  switch (status) {
    case 'paid':
      return 'مدفوع'
    case 'due':
      return 'مستحق'
    case 'overdue':
      return 'متأخر +90'
    case 'upcoming':
      return 'قادم'
    default:
      return ''
  }
}
