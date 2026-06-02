// أنواع البيانات المشتركة بين العملية الرئيسية وواجهة المستخدم

export interface Customer {
  id: number
  name: string
  phone: string
  nationalId: string
  address: string
  notes: string
  createdAt: string
}

export interface Supplier {
  id: number
  name: string
  phone: string
  notes: string
  createdAt: string
}

export interface Product {
  id: number
  name: string
  category: string
  brand: string
  supplierId: number | null
  purchasePrice: number
  stock: number
  notes: string
  createdAt: string
}

export type InstallmentStatus = 'paid' | 'due' | 'upcoming' | 'overdue'

export interface Installment {
  id: number
  saleId: number
  number: number
  amount: number
  dueDate: string
  paidAmount: number
  paidDate: string | null
  // محسوبة وقت التشغيل
  status?: InstallmentStatus
  remaining?: number
  daysLate?: number
}

export interface Sale {
  id: number
  customerId: number
  productId: number | null
  productName: string
  brand: string
  quantity: number
  purchasePrice: number
  profitMargin: number // نسبة مئوية (مثال 35)
  salePrice: number // إجمالي سعر البيع بعد الربح
  downPayment: number // المقدم
  installmentsCount: number
  saleDate: string
  firstInstallmentDate: string
  notes: string
  createdAt: string
}

export interface SaleWithDetails extends Sale {
  customerName: string
  customerPhone: string
  installments: Installment[]
  totalPaid: number
  totalRemaining: number
  financedAmount: number
}

export interface NewSaleInput {
  customerId: number
  productId: number | null
  productName: string
  brand: string
  quantity: number
  purchasePrice: number
  profitMargin: number
  downPayment: number
  installmentsCount: number
  saleDate: string
  firstInstallmentDate: string
  notes: string
}

export interface DashboardStats {
  customersCount: number
  salesCount: number
  totalSales: number
  totalCollected: number
  totalOutstanding: number
  totalProfit: number
  dueTodayCount: number
  dueThisMonthCount: number
  overdue90Count: number
  overdue90Amount: number
}

export interface DueAlert {
  installmentId: number
  saleId: number
  customerName: string
  customerPhone: string
  productName: string
  installmentNumber: number
  amount: number
  remaining: number
  dueDate: string
  daysLate: number
  status: InstallmentStatus
}

export interface ReportRow {
  saleId: number
  saleDate: string
  customerName: string
  productName: string
  brand: string
  salePrice: number
  downPayment: number
  financedAmount: number
  collected: number
  outstanding: number
  profit: number
}

export interface ReportSummary {
  from: string
  to: string
  salesCount: number
  totalSales: number
  totalDownPayments: number
  totalFinanced: number
  totalCollected: number
  totalOutstanding: number
  totalProfit: number
  rows: ReportRow[]
}

export interface ApiResult<T> {
  ok: boolean
  data?: T
  error?: string
}
