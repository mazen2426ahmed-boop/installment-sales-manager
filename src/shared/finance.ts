// منطق الحسابات المالية وتوليد الأقساط
import type { Installment, InstallmentStatus } from './types'

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

// إجمالي سعر البيع = (سعر الشراء × الكمية) × (1 + نسبة الربح/100)
export function computeSalePrice(
  purchasePrice: number,
  quantity: number,
  profitMargin: number
): number {
  const cost = purchasePrice * quantity
  return round2(cost * (1 + profitMargin / 100))
}

export function computeProfit(
  purchasePrice: number,
  quantity: number,
  salePrice: number
): number {
  return round2(salePrice - purchasePrice * quantity)
}

// الربح المُحقَّق محاسبياً (أساس نقدي): يُعترف بالربح تناسبياً مع ما تم تحصيله فعلاً
// = (المبلغ المحصّل ÷ سعر البيع) × إجمالي ربح الصفقة
// المبلغ المحصّل = المقدم + مجموع الأقساط المسددة
export function computeRealizedProfit(
  purchasePrice: number,
  quantity: number,
  salePrice: number,
  collected: number
): number {
  if (salePrice <= 0) return 0
  const totalProfit = salePrice - purchasePrice * quantity
  const ratio = Math.max(0, Math.min(1, collected / salePrice))
  return round2(totalProfit * ratio)
}

// إضافة عدد من الأشهر لتاريخ مع الحفاظ على اليوم وتعديله لآخر يوم في الشهر عند الحاجة
export function addMonths(isoDate: string, months: number): string {
  const d = new Date(isoDate + 'T00:00:00')
  const day = d.getDate()
  const target = new Date(d.getFullYear(), d.getMonth() + months, 1)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(day, lastDay))
  return toISODate(target)
}

export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO(): string {
  return toISODate(new Date())
}

export function daysBetween(fromISO: string, toISODateStr: string): number {
  const a = new Date(fromISO + 'T00:00:00').getTime()
  const b = new Date(toISODateStr + 'T00:00:00').getTime()
  return Math.round((b - a) / (1000 * 60 * 60 * 24))
}

// توليد جدول الأقساط: المبلغ الممول موزّع بالتساوي مع وضع فرق التقريب في القسط الأخير
export function buildInstallmentSchedule(
  financedAmount: number,
  count: number,
  firstDueDate: string
): { number: number; amount: number; dueDate: string }[] {
  const result: { number: number; amount: number; dueDate: string }[] = []
  if (count <= 0) return result
  const base = round2(financedAmount / count)
  let allocated = 0
  for (let i = 0; i < count; i++) {
    const isLast = i === count - 1
    const amount = isLast ? round2(financedAmount - allocated) : base
    allocated = round2(allocated + amount)
    result.push({
      number: i + 1,
      amount,
      // القسط الأول في firstDueDate ثم نفس اليوم من كل شهر تالٍ
      dueDate: addMonths(firstDueDate, i)
    })
  }
  return result
}

export const OVERDUE_THRESHOLD_DAYS = 90

// حالة القسط بناءً على المدفوع وتاريخ الاستحقاق مقارنة باليوم
export function computeInstallmentStatus(
  inst: Pick<Installment, 'amount' | 'paidAmount' | 'dueDate'>,
  today: string = todayISO()
): { status: InstallmentStatus; remaining: number; daysLate: number } {
  const remaining = round2(inst.amount - inst.paidAmount)
  const daysLate = daysBetween(inst.dueDate, today)
  if (remaining <= 0) {
    return { status: 'paid', remaining: 0, daysLate: 0 }
  }
  if (daysLate < 0) {
    return { status: 'upcoming', remaining, daysLate: 0 }
  }
  if (daysLate > OVERDUE_THRESHOLD_DAYS) {
    return { status: 'overdue', remaining, daysLate }
  }
  return { status: 'due', remaining, daysLate }
}
