import type { InstallmentStatus } from '../../../shared/types'

export function formatMoney(n: number): string {
  return new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 2 }).format(n ?? 0)
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso)
  if (isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }).format(d)
}

export function statusLabel(status?: InstallmentStatus): string {
  switch (status) {
    case 'paid':
      return 'مدفوع'
    case 'due':
      return 'مستحق'
    case 'overdue':
      return 'متأخر +90 يوم'
    case 'upcoming':
      return 'قادم'
    default:
      return '—'
  }
}

export function statusClass(status?: InstallmentStatus): string {
  switch (status) {
    case 'paid':
      return 'badge-paid'
    case 'due':
      return 'badge-due'
    case 'overdue':
      return 'badge-overdue'
    default:
      return 'badge-upcoming'
  }
}

export function todayInput(): string {
  return new Date().toISOString().slice(0, 10)
}
