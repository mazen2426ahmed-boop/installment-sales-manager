import { all, get, run, transaction, runNoPersist, persist } from './database'
import { hashPassword, verifyPassword } from './auth'
import { assertCanWrite, startTrial, activateKey, getLicenseStatus } from './license'
import { setBackupDir } from './backup'
import {
  computeSalePrice,
  computeProfit,
  buildInstallmentSchedule,
  computeInstallmentStatus,
  round2,
  todayISO,
  toISODate,
  OVERDUE_THRESHOLD_DAYS
} from '../shared/finance'
import type {
  Customer,
  Supplier,
  Product,
  Sale,
  SaleWithDetails,
  Installment,
  NewSaleInput,
  DashboardStats,
  DueAlert,
  ReportSummary,
  ReportRow,
  User,
  NewUserInput,
  UserRole,
  SetupStatus,
  FirstRunSetupInput,
  LicenseStatus
} from '../shared/types'

const now = (): string => new Date().toISOString()

/* ============================ العملاء ============================ */
export function listCustomers(search = ''): Customer[] {
  if (search.trim()) {
    const q = `%${search.trim()}%`
    return all<Customer>(
      `SELECT * FROM customers WHERE name LIKE ? OR phone LIKE ? OR nationalId LIKE ? ORDER BY name`,
      [q, q, q]
    )
  }
  return all<Customer>(`SELECT * FROM customers ORDER BY name`)
}

export function getCustomer(id: number): Customer | undefined {
  return get<Customer>(`SELECT * FROM customers WHERE id = ?`, [id])
}

export function createCustomer(c: Omit<Customer, 'id' | 'createdAt'>): number {
  assertCanWrite()
  const res = run(
    `INSERT INTO customers (name, phone, nationalId, address, notes, createdAt) VALUES (?,?,?,?,?,?)`,
    [c.name, c.phone || '', c.nationalId || '', c.address || '', c.notes || '', now()]
  )
  return res.lastInsertRowid
}

export function updateCustomer(c: Customer): void {
  assertCanWrite()
  run(
    `UPDATE customers SET name=?, phone=?, nationalId=?, address=?, notes=? WHERE id=?`,
    [c.name, c.phone || '', c.nationalId || '', c.address || '', c.notes || '', c.id]
  )
}

export function deleteCustomer(id: number): void {
  assertCanWrite()
  run(`DELETE FROM customers WHERE id=?`, [id])
}

/* ============================ الموردون ============================ */
export function listSuppliers(): Supplier[] {
  return all<Supplier>(`SELECT * FROM suppliers ORDER BY name`)
}

export function createSupplier(s: Omit<Supplier, 'id' | 'createdAt'>): number {
  assertCanWrite()
  const res = run(`INSERT INTO suppliers (name, phone, notes, createdAt) VALUES (?,?,?,?)`, [
    s.name,
    s.phone || '',
    s.notes || '',
    now()
  ])
  return res.lastInsertRowid
}

export function updateSupplier(s: Supplier): void {
  assertCanWrite()
  run(`UPDATE suppliers SET name=?, phone=?, notes=? WHERE id=?`, [s.name, s.phone || '', s.notes || '', s.id])
}

export function deleteSupplier(id: number): void {
  assertCanWrite()
  run(`DELETE FROM suppliers WHERE id=?`, [id])
}

/* ============================ المنتجات ============================ */
export function listProducts(search = ''): Product[] {
  if (search.trim()) {
    const q = `%${search.trim()}%`
    return all<Product>(
      `SELECT * FROM products WHERE name LIKE ? OR brand LIKE ? OR category LIKE ? ORDER BY name`,
      [q, q, q]
    )
  }
  return all<Product>(`SELECT * FROM products ORDER BY name`)
}

export function createProduct(p: Omit<Product, 'id' | 'createdAt'>): number {
  assertCanWrite()
  const res = run(
    `INSERT INTO products (name, category, brand, supplierId, purchasePrice, stock, notes, createdAt) VALUES (?,?,?,?,?,?,?,?)`,
    [p.name, p.category || '', p.brand || '', p.supplierId ?? null, p.purchasePrice || 0, p.stock || 0, p.notes || '', now()]
  )
  return res.lastInsertRowid
}

export function updateProduct(p: Product): void {
  assertCanWrite()
  run(
    `UPDATE products SET name=?, category=?, brand=?, supplierId=?, purchasePrice=?, stock=?, notes=? WHERE id=?`,
    [p.name, p.category || '', p.brand || '', p.supplierId ?? null, p.purchasePrice || 0, p.stock || 0, p.notes || '', p.id]
  )
}

export function deleteProduct(id: number): void {
  assertCanWrite()
  run(`DELETE FROM products WHERE id=?`, [id])
}

/* ============================ المبيعات ============================ */
function nextReceiptNo(): string {
  const row = get<{ m: number }>(
    `SELECT COALESCE(MAX(CAST(receiptNo AS INTEGER)), 0) AS m FROM sales WHERE receiptNo GLOB '[0-9]*'`
  )
  const next = (row ? Number(row.m) : 0) + 1
  return String(next).padStart(5, '0')
}

export function createSale(input: NewSaleInput): number {
  assertCanWrite()
  const salePrice = computeSalePrice(input.purchasePrice, input.quantity, input.profitMargin)
  const financed = round2(salePrice - input.downPayment)
  if (financed < 0) throw new Error('المقدم أكبر من سعر البيع')
  const schedule = buildInstallmentSchedule(financed, input.installmentsCount, input.firstInstallmentDate)

  const receiptNo = (input.receiptNo ?? '').trim() || nextReceiptNo()
  if (get<{ id: number }>(`SELECT id FROM sales WHERE receiptNo = ?`, [receiptNo])) {
    throw new Error('رقم الإيصال مستخدم من قبل، اختر رقماً آخر')
  }

  return transaction(() => {
    const saleId = runNoPersist(
      `INSERT INTO sales (receiptNo, customerId, productId, productName, brand, quantity, purchasePrice, profitMargin, salePrice, downPayment, installmentsCount, saleDate, firstInstallmentDate, notes, createdAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        receiptNo,
        input.customerId,
        input.productId ?? null,
        input.productName,
        input.brand || '',
        input.quantity || 1,
        input.purchasePrice || 0,
        input.profitMargin || 0,
        salePrice,
        input.downPayment || 0,
        input.installmentsCount,
        input.saleDate,
        input.firstInstallmentDate,
        input.notes || '',
        now()
      ]
    )
    for (const s of schedule) {
      runNoPersist(
        `INSERT INTO installments (saleId, number, amount, dueDate, paidAmount, paidDate) VALUES (?,?,?,?,0,NULL)`,
        [saleId, s.number, s.amount, s.dueDate]
      )
    }
    // خصم من المخزون إن كان مرتبطاً بمنتج
    if (input.productId) {
      runNoPersist(`UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?`, [input.quantity || 1, input.productId])
    }
    return saleId
  })
}

export function listSales(search = ''): SaleWithDetails[] {
  let rows: Sale[]
  if (search.trim()) {
    const q = `%${search.trim()}%`
    rows = all<Sale>(
      `SELECT s.* FROM sales s JOIN customers c ON c.id = s.customerId
       WHERE s.receiptNo LIKE ? OR c.name LIKE ? OR s.productName LIKE ? OR s.brand LIKE ? ORDER BY s.saleDate DESC`,
      [q, q, q, q]
    )
  } else {
    rows = all<Sale>(`SELECT * FROM sales ORDER BY saleDate DESC`)
  }
  return rows.map((r) => enrichSale(r))
}

export function getSaleDetails(id: number): SaleWithDetails | undefined {
  const sale = get<Sale>(`SELECT * FROM sales WHERE id=?`, [id])
  if (!sale) return undefined
  return enrichSale(sale)
}

function enrichSale(sale: Sale): SaleWithDetails {
  const customer = getCustomer(sale.customerId)
  const rawInstallments = all<Installment>(
    `SELECT * FROM installments WHERE saleId=? ORDER BY number`,
    [sale.id]
  )
  const today = todayISO()
  const installments: Installment[] = rawInstallments.map((i) => {
    const s = computeInstallmentStatus(i, today)
    return { ...i, status: s.status, remaining: s.remaining, daysLate: s.daysLate }
  })
  const totalPaid = round2(installments.reduce((acc, i) => acc + i.paidAmount, 0))
  const financedAmount = round2(sale.salePrice - sale.downPayment)
  const totalRemaining = round2(financedAmount - totalPaid)
  return {
    ...sale,
    customerName: customer?.name ?? '—',
    customerPhone: customer?.phone ?? '',
    installments,
    totalPaid,
    totalRemaining,
    financedAmount
  }
}

export function deleteSale(id: number): void {
  assertCanWrite()
  run(`DELETE FROM sales WHERE id=?`, [id])
}

/* ============================ الأقساط ============================ */
// تسجيل دفعة على قسط؛ المبلغ المدفوع يضاف للقيمة الحالية
export function payInstallment(installmentId: number, amount: number, paidDate: string): void {
  assertCanWrite()
  const inst = get<Installment>(`SELECT * FROM installments WHERE id=?`, [installmentId])
  if (!inst) throw new Error('القسط غير موجود')
  const newPaid = round2(inst.paidAmount + amount)
  const fullyPaid = newPaid >= inst.amount
  run(`UPDATE installments SET paidAmount=?, paidDate=? WHERE id=?`, [
    newPaid,
    fullyPaid ? paidDate : inst.paidDate ?? null,
    installmentId
  ])
}

// إلغاء سداد قسط (تصفير المدفوع)
export function unpayInstallment(installmentId: number): void {
  assertCanWrite()
  run(`UPDATE installments SET paidAmount=0, paidDate=NULL WHERE id=?`, [installmentId])
}

// سداد القسط بالكامل
export function payInstallmentFull(installmentId: number, paidDate: string): void {
  assertCanWrite()
  const inst = get<Installment>(`SELECT * FROM installments WHERE id=?`, [installmentId])
  if (!inst) throw new Error('القسط غير موجود')
  run(`UPDATE installments SET paidAmount=?, paidDate=? WHERE id=?`, [inst.amount, paidDate, installmentId])
}

/* ============================ التنبيهات ============================ */
interface AlertRow extends Installment {
  customerName: string
  customerPhone: string
  productName: string
}

export function getDueAlerts(): { due: DueAlert[]; overdue90: DueAlert[] } {
  const today = todayISO()
  const rows = all<AlertRow>(
    `SELECT i.*, c.name AS customerName, c.phone AS customerPhone, s.productName AS productName
     FROM installments i
     JOIN sales s ON s.id = i.saleId
     JOIN customers c ON c.id = s.customerId
     ORDER BY i.dueDate ASC`
  )
  const due: DueAlert[] = []
  const overdue90: DueAlert[] = []
  for (const r of rows) {
    const st = computeInstallmentStatus(r, today)
    if (st.status === 'paid' || st.status === 'upcoming') continue
    const alert: DueAlert = {
      installmentId: r.id,
      saleId: r.saleId,
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      productName: r.productName,
      installmentNumber: r.number,
      amount: r.amount,
      remaining: st.remaining,
      dueDate: r.dueDate,
      daysLate: st.daysLate,
      status: st.status
    }
    if (st.status === 'overdue') overdue90.push(alert)
    else due.push(alert)
  }
  return { due, overdue90 }
}

/* ============================ لوحة المعلومات ============================ */
export function getDashboardStats(): DashboardStats {
  const today = todayISO()
  const customersCount = Number(get<{ c: number }>(`SELECT COUNT(*) AS c FROM customers`)?.c ?? 0)
  const salesCount = Number(get<{ c: number }>(`SELECT COUNT(*) AS c FROM sales`)?.c ?? 0)
  const totalSales = round2(Number(get<{ s: number }>(`SELECT COALESCE(SUM(salePrice),0) AS s FROM sales`)?.s ?? 0))
  const totalProfit = round2(
    Number(
      get<{ p: number }>(`SELECT COALESCE(SUM(salePrice - purchasePrice*quantity),0) AS p FROM sales`)?.p ?? 0
    )
  )
  const totalDown = round2(Number(get<{ d: number }>(`SELECT COALESCE(SUM(downPayment),0) AS d FROM sales`)?.d ?? 0))
  const collectedInst = round2(
    Number(get<{ p: number }>(`SELECT COALESCE(SUM(paidAmount),0) AS p FROM installments`)?.p ?? 0)
  )
  const totalCollected = round2(totalDown + collectedInst)
  const totalInstAmount = round2(
    Number(get<{ a: number }>(`SELECT COALESCE(SUM(amount),0) AS a FROM installments`)?.a ?? 0)
  )
  const totalOutstanding = round2(totalInstAmount - collectedInst)

  // الأقساط المستحقة (غير مدفوعة وتاريخها اليوم أو ماضٍ)
  const unpaid = all<Installment>(
    `SELECT * FROM installments WHERE paidAmount < amount`
  )
  const monthPrefix = today.slice(0, 7)
  let dueTodayCount = 0
  let dueThisMonthCount = 0
  let overdue90Count = 0
  let overdue90Amount = 0
  for (const i of unpaid) {
    const st = computeInstallmentStatus(i, today)
    if (st.status === 'overdue') {
      overdue90Count++
      overdue90Amount = round2(overdue90Amount + st.remaining)
    }
    if (i.dueDate === today) dueTodayCount++
    if (i.dueDate.slice(0, 7) === monthPrefix && (st.status === 'due' || st.status === 'overdue')) {
      dueThisMonthCount++
    }
  }

  return {
    customersCount,
    salesCount,
    totalSales,
    totalCollected,
    totalOutstanding,
    totalProfit,
    dueTodayCount,
    dueThisMonthCount,
    overdue90Count,
    overdue90Amount
  }
}

// بيانات رسم بياني: التحصيل الشهري لآخر 12 شهراً
export function getMonthlyCollection(): { month: string; collected: number }[] {
  const rows = all<{ month: string; collected: number }>(
    `SELECT substr(paidDate,1,7) AS month, COALESCE(SUM(paidAmount),0) AS collected
     FROM installments WHERE paidDate IS NOT NULL GROUP BY month ORDER BY month DESC LIMIT 12`
  )
  return rows.reverse().map((r) => ({ month: r.month, collected: round2(Number(r.collected)) }))
}

/* ============================ التقارير ============================ */
export function getReport(from: string, to: string): ReportSummary {
  const sales = all<Sale>(
    `SELECT * FROM sales WHERE saleDate >= ? AND saleDate <= ? ORDER BY saleDate`,
    [from, to]
  )
  const rows: ReportRow[] = []
  let totalSales = 0
  let totalDown = 0
  let totalFinanced = 0
  let totalCollected = 0
  let totalOutstanding = 0
  let totalProfit = 0

  for (const s of sales) {
    const det = enrichSale(s)
    const profit = computeProfit(s.purchasePrice, s.quantity, s.salePrice)
    const collected = round2(s.downPayment + det.totalPaid)
    rows.push({
      saleId: s.id,
      receiptNo: s.receiptNo,
      saleDate: s.saleDate,
      customerName: det.customerName,
      productName: s.productName,
      brand: s.brand,
      salePrice: s.salePrice,
      downPayment: s.downPayment,
      financedAmount: det.financedAmount,
      collected,
      outstanding: det.totalRemaining,
      profit
    })
    totalSales = round2(totalSales + s.salePrice)
    totalDown = round2(totalDown + s.downPayment)
    totalFinanced = round2(totalFinanced + det.financedAmount)
    totalCollected = round2(totalCollected + collected)
    totalOutstanding = round2(totalOutstanding + det.totalRemaining)
    totalProfit = round2(totalProfit + profit)
  }

  return {
    from,
    to,
    salesCount: sales.length,
    totalSales,
    totalDownPayments: totalDown,
    totalFinanced,
    totalCollected,
    totalOutstanding,
    totalProfit,
    rows
  }
}

/* ============================ المستخدمون والجلسة ============================ */
interface UserRow extends User {
  passwordHash: string
}

let currentUser: User | null = null

function rowToUser(r: UserRow): User {
  return { id: r.id, username: r.username, name: r.name, role: r.role, createdAt: r.createdAt }
}

export function countUsers(): number {
  const row = get<{ c: number }>(`SELECT COUNT(*) AS c FROM users`)
  return row ? Number(row.c) : 0
}

function countOwners(): number {
  const row = get<{ c: number }>(`SELECT COUNT(*) AS c FROM users WHERE role='owner'`)
  return row ? Number(row.c) : 0
}

export function getSetupStatus(): SetupStatus {
  return { needsSetup: countOwners() === 0 }
}

export function getCurrentUser(): User | null {
  return currentUser
}

function requireOwner(): void {
  if (!currentUser || currentUser.role !== 'owner') {
    throw new Error('هذه العملية متاحة للمالك فقط')
  }
}

export function login(username: string, password: string): User {
  const row = get<UserRow>(`SELECT * FROM users WHERE username = ?`, [username.trim()])
  if (!row || !verifyPassword(password, row.passwordHash)) {
    throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة')
  }
  currentUser = rowToUser(row)
  return currentUser
}

export function logout(): void {
  currentUser = null
}

export function listUsers(): User[] {
  requireOwner()
  return all<UserRow>(`SELECT * FROM users ORDER BY role DESC, name`).map(rowToUser)
}

function insertUser(input: NewUserInput): number {
  if (!input.username.trim()) throw new Error('اسم المستخدم مطلوب')
  if (!input.password || input.password.length < 4) throw new Error('كلمة المرور يجب ألا تقل عن 4 خانات')
  const exists = get<{ id: number }>(`SELECT id FROM users WHERE username = ?`, [input.username.trim()])
  if (exists) throw new Error('اسم المستخدم مستخدم بالفعل')
  const res = run(
    `INSERT INTO users (username, name, role, passwordHash, createdAt) VALUES (?,?,?,?,?)`,
    [input.username.trim(), input.name || input.username.trim(), input.role, hashPassword(input.password), now()]
  )
  return res.lastInsertRowid
}

export function createUser(input: NewUserInput): number {
  requireOwner()
  return insertUser(input)
}

export function updateUser(id: number, name: string, role: UserRole): void {
  requireOwner()
  const target = get<UserRow>(`SELECT * FROM users WHERE id=?`, [id])
  if (!target) throw new Error('المستخدم غير موجود')
  // منع إزالة آخر مالك
  if (target.role === 'owner' && role !== 'owner' && countOwners() <= 1) {
    throw new Error('لا يمكن تغيير دور المالك الوحيد')
  }
  run(`UPDATE users SET name=?, role=? WHERE id=?`, [name || target.name, role, id])
  if (currentUser && currentUser.id === id) currentUser = { ...currentUser, name: name || target.name, role }
}

export function changePassword(id: number, newPassword: string): void {
  // المالك يغيّر لأي مستخدم؛ وأي مستخدم يغيّر كلمته
  if (!currentUser || (currentUser.role !== 'owner' && currentUser.id !== id)) {
    throw new Error('غير مصرح بتغيير كلمة المرور')
  }
  if (!newPassword || newPassword.length < 4) throw new Error('كلمة المرور يجب ألا تقل عن 4 خانات')
  run(`UPDATE users SET passwordHash=? WHERE id=?`, [hashPassword(newPassword), id])
}

export function deleteUser(id: number): void {
  requireOwner()
  if (currentUser && currentUser.id === id) throw new Error('لا يمكن حذف حسابك الحالي')
  const target = get<UserRow>(`SELECT * FROM users WHERE id=?`, [id])
  if (!target) return
  if (target.role === 'owner' && countOwners() <= 1) throw new Error('لا يمكن حذف المالك الوحيد')
  run(`DELETE FROM users WHERE id=?`, [id])
}

/* ============================ الإعداد وأول تشغيل ============================ */
export function firstRunSetup(input: FirstRunSetupInput): User {
  if (countOwners() > 0) throw new Error('تم إعداد البرنامج بالفعل')
  const ownerId = insertUser({
    username: input.owner.username,
    name: input.owner.name,
    role: 'owner',
    password: input.owner.password
  })
  // الترخيص
  if (input.license.mode === 'trial') startTrial(input.license.trialDays)
  else activateKey(input.license.key)
  // مجلد النسخ الاحتياطي
  setBackupDir(input.backupDir)
  const owner = get<UserRow>(`SELECT * FROM users WHERE id=?`, [ownerId])
  currentUser = rowToUser(owner as UserRow)
  return currentUser
}

/* ============================ الترخيص (غلاف بصلاحية المالك) ============================ */
export function licenseStatus(): LicenseStatus {
  return getLicenseStatus()
}

export function activateLicense(key: string): LicenseStatus {
  requireOwner()
  return activateKey(key)
}

export function startLicenseTrial(days: number): LicenseStatus {
  requireOwner()
  return startTrial(days)
}

export { OVERDUE_THRESHOLD_DAYS, toISODate, persist }
