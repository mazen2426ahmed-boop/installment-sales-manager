import type {
  Customer,
  Supplier,
  Product,
  SaleWithDetails,
  NewSaleInput,
  DashboardStats,
  DueAlert,
  ReportSummary,
  ApiResult,
  User,
  NewUserInput,
  UserRole,
  SetupStatus,
  FirstRunSetupInput,
  LicenseStatus,
  LicenseGenInput,
  LicenseKeyResult,
  BackupSettings
} from './types'

// واجهة برمجية مكشوفة على window.api داخل واجهة المستخدم
export interface Api {
  // المصادقة والإعداد
  getSetupStatus(): Promise<ApiResult<SetupStatus>>
  runSetup(input: FirstRunSetupInput): Promise<ApiResult<User>>
  login(username: string, password: string): Promise<ApiResult<User>>
  logout(): Promise<ApiResult<void>>
  currentUser(): Promise<ApiResult<User | null>>

  // المستخدمون (للمالك)
  listUsers(): Promise<ApiResult<User[]>>
  createUser(input: NewUserInput): Promise<ApiResult<number>>
  updateUser(id: number, name: string, role: UserRole): Promise<ApiResult<void>>
  changePassword(id: number, newPassword: string): Promise<ApiResult<void>>
  deleteUser(id: number): Promise<ApiResult<void>>

  // الترخيص
  licenseStatus(): Promise<ApiResult<LicenseStatus>>
  activateLicense(key: string): Promise<ApiResult<LicenseStatus>>
  startTrial(days: number): Promise<ApiResult<LicenseStatus>>
  getMachineId(): Promise<ApiResult<string>>
  checkDevAccess(passcode: string): Promise<ApiResult<boolean>>
  generateLicense(input: LicenseGenInput): Promise<ApiResult<LicenseKeyResult>>

  // اختيار مجلد عام
  chooseDir(): Promise<ApiResult<string | null>>

  // النسخ الاحتياطي اليومي والموقع الثانوي
  backupSettings(): Promise<ApiResult<BackupSettings>>
  backupNow(): Promise<ApiResult<{ local: string; secondary: string | null }>>
  chooseBackupDir(): Promise<ApiResult<BackupSettings>>
  clearBackupDir(): Promise<ApiResult<BackupSettings>>

  // العملاء
  listCustomers(search?: string): Promise<ApiResult<Customer[]>>
  getCustomer(id: number): Promise<ApiResult<Customer | undefined>>
  createCustomer(c: Omit<Customer, 'id' | 'createdAt'>): Promise<ApiResult<number>>
  updateCustomer(c: Customer): Promise<ApiResult<void>>
  deleteCustomer(id: number): Promise<ApiResult<void>>

  // الموردون
  listSuppliers(): Promise<ApiResult<Supplier[]>>
  createSupplier(s: Omit<Supplier, 'id' | 'createdAt'>): Promise<ApiResult<number>>
  updateSupplier(s: Supplier): Promise<ApiResult<void>>
  deleteSupplier(id: number): Promise<ApiResult<void>>

  // المنتجات
  listProducts(search?: string): Promise<ApiResult<Product[]>>
  createProduct(p: Omit<Product, 'id' | 'createdAt'>): Promise<ApiResult<number>>
  updateProduct(p: Product): Promise<ApiResult<void>>
  deleteProduct(id: number): Promise<ApiResult<void>>

  // المبيعات
  createSale(input: NewSaleInput): Promise<ApiResult<number>>
  listSales(search?: string): Promise<ApiResult<SaleWithDetails[]>>
  getSaleDetails(id: number): Promise<ApiResult<SaleWithDetails | undefined>>
  deleteSale(id: number): Promise<ApiResult<void>>

  // الأقساط
  payInstallment(installmentId: number, amount: number, paidDate: string): Promise<ApiResult<void>>
  payInstallmentFull(installmentId: number, paidDate: string): Promise<ApiResult<void>>
  unpayInstallment(installmentId: number): Promise<ApiResult<void>>

  // التنبيهات ولوحة المعلومات
  getDueAlerts(): Promise<ApiResult<{ due: DueAlert[]; overdue90: DueAlert[] }>>
  getDashboardStats(): Promise<ApiResult<DashboardStats>>
  getMonthlyCollection(): Promise<ApiResult<{ month: string; collected: number }[]>>

  // التقارير
  getReport(from: string, to: string): Promise<ApiResult<ReportSummary>>
  printReport(from: string, to: string): Promise<ApiResult<void>>

  // إكسل
  exportExcel(kind: 'customers' | 'products' | 'sales'): Promise<ApiResult<string | null>>
  exportReportExcel(from: string, to: string): Promise<ApiResult<string | null>>
  importExcel(kind: 'customers' | 'products'): Promise<ApiResult<{ imported: number; skipped: number } | null>>
  exportTemplate(kind: 'customers' | 'products'): Promise<ApiResult<string | null>>

  // نسخ احتياطي
  backupDatabase(): Promise<ApiResult<string | null>>
  restoreDatabase(): Promise<ApiResult<boolean>>
}
