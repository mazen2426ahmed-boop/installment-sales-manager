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
  receiptNo: string
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
  receiptNo?: string // يُترك فارغاً للتوليد التلقائي
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
  receiptNo: string
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

/* ============================ المستخدمون والصلاحيات ============================ */
export type UserRole = 'owner' | 'seller'

export interface User {
  id: number
  username: string
  name: string
  role: UserRole
  createdAt: string
}

export interface NewUserInput {
  username: string
  name: string
  role: UserRole
  password: string
}

/* ============================ الترخيص ============================ */
export type LicenseType = 'trial' | 'licensed'

export interface LicenseStatus {
  configured: boolean // هل تم تفعيل ترخيص/تجربة
  type: LicenseType | null
  activatedAt: string | null
  expiresAt: string | null // YYYY-MM-DD
  daysLeft: number
  expired: boolean
  readOnly: boolean // وضع العرض فقط (لا تُقبل إضافة بيانات)
  issuedTo: string | null
}

/* ============================ الإعداد وأول تشغيل ============================ */
export interface SetupStatus {
  needsSetup: boolean // لا يوجد مالك بعد
}

export interface FirstRunSetupInput {
  owner: { username: string; name: string; password: string }
  license: { mode: 'trial'; trialDays: number } | { mode: 'key'; key: string }
  backupDir: string | null
}

/* ============================ النسخ الاحتياطي ============================ */
export interface BackupFileInfo {
  name: string
  path: string
  size: number
  createdAt: string
}

export interface BackupSettings {
  backupDir: string | null
  lastDailyBackup: string | null // YYYY-MM-DD
  localBackups: BackupFileInfo[]
}
