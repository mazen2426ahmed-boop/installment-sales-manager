import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { initDatabase, backupTo, restoreFrom, getDbFilePath } from './database'
import * as svc from './services'
import * as excel from './excel'
import { assertCanWrite } from './license'
import { ensureDailyBackup, backupNow, getBackupSettings, setBackupDir } from './backup'
import { buildReportHtml } from './report-html'
import type { ApiResult, NewUserInput, UserRole, FirstRunSetupInput } from '../shared/types'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    autoHideMenuBar: true,
    title: 'إدارة البيع بالتقسيط',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// غلاف موحد لمعالجة الأخطاء وإرجاع نتيجة منظمة
function handle<T>(channel: string, fn: (...args: never[]) => T | Promise<T>): void {
  ipcMain.handle(channel, async (_e, ...args): Promise<ApiResult<T>> => {
    try {
      const data = await fn(...(args as never[]))
      return { ok: true, data }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { ok: false, error: message }
    }
  })
}

function registerIpc(): void {
  // المصادقة والإعداد والمستخدمون
  handle('setup:status', () => svc.getSetupStatus())
  handle('setup:run', (input: FirstRunSetupInput) => svc.firstRunSetup(input))
  handle('auth:login', (username: string, password: string) => svc.login(username, password))
  handle('auth:logout', () => svc.logout())
  handle('auth:current', () => svc.getCurrentUser())
  handle('users:list', () => svc.listUsers())
  handle('users:create', (input: NewUserInput) => svc.createUser(input))
  handle('users:update', (id: number, name: string, role: UserRole) => svc.updateUser(id, name, role))
  handle('users:changePassword', (id: number, newPassword: string) => svc.changePassword(id, newPassword))
  handle('users:delete', (id: number) => svc.deleteUser(id))

  // الترخيص
  handle('license:status', () => svc.licenseStatus())
  handle('license:activate', (key: string) => svc.activateLicense(key))
  handle('license:startTrial', (days: number) => svc.startLicenseTrial(days))

  // العملاء
  handle('customers:list', (search?: string) => svc.listCustomers(search ?? ''))
  handle('customers:get', (id: number) => svc.getCustomer(id))
  handle('customers:create', (c: Parameters<typeof svc.createCustomer>[0]) => svc.createCustomer(c))
  handle('customers:update', (c: Parameters<typeof svc.updateCustomer>[0]) => svc.updateCustomer(c))
  handle('customers:delete', (id: number) => svc.deleteCustomer(id))

  // الموردون
  handle('suppliers:list', () => svc.listSuppliers())
  handle('suppliers:create', (s: Parameters<typeof svc.createSupplier>[0]) => svc.createSupplier(s))
  handle('suppliers:update', (s: Parameters<typeof svc.updateSupplier>[0]) => svc.updateSupplier(s))
  handle('suppliers:delete', (id: number) => svc.deleteSupplier(id))

  // المنتجات
  handle('products:list', (search?: string) => svc.listProducts(search ?? ''))
  handle('products:create', (p: Parameters<typeof svc.createProduct>[0]) => svc.createProduct(p))
  handle('products:update', (p: Parameters<typeof svc.updateProduct>[0]) => svc.updateProduct(p))
  handle('products:delete', (id: number) => svc.deleteProduct(id))

  // المبيعات
  handle('sales:create', (input: Parameters<typeof svc.createSale>[0]) => svc.createSale(input))
  handle('sales:list', (search?: string) => svc.listSales(search ?? ''))
  handle('sales:get', (id: number) => svc.getSaleDetails(id))
  handle('sales:delete', (id: number) => svc.deleteSale(id))

  // الأقساط
  handle('installments:pay', (id: number, amount: number, paidDate: string) =>
    svc.payInstallment(id, amount, paidDate)
  )
  handle('installments:payFull', (id: number, paidDate: string) => svc.payInstallmentFull(id, paidDate))
  handle('installments:unpay', (id: number) => svc.unpayInstallment(id))

  // التنبيهات ولوحة المعلومات
  handle('alerts:due', () => svc.getDueAlerts())
  handle('dashboard:stats', () => svc.getDashboardStats())
  handle('dashboard:monthly', () => svc.getMonthlyCollection())

  // التقارير
  handle('reports:get', (from: string, to: string) => svc.getReport(from, to))
  handle('reports:print', async (from: string, to: string) => {
    const report = svc.getReport(from, to)
    const html = buildReportHtml(report)
    await printHtml(html)
  })

  // إكسل
  handle('excel:export', async (kind: 'customers' | 'products' | 'sales') => {
    const names = { customers: 'العملاء', products: 'المنتجات', sales: 'المبيعات' }
    const path = await chooseSavePath(`${names[kind]}.xlsx`)
    if (!path) return null
    if (kind === 'customers') excel.exportCustomers(path)
    else if (kind === 'products') excel.exportProducts(path)
    else excel.exportSales(path)
    return path
  })

  handle('excel:exportReport', async (from: string, to: string) => {
    const path = await chooseSavePath(`تقرير_${from}_الى_${to}.xlsx`)
    if (!path) return null
    excel.exportReport(path, from, to)
    return path
  })

  handle('excel:import', async (kind: 'customers' | 'products') => {
    assertCanWrite()
    const path = await chooseOpenPath()
    if (!path) return null
    return kind === 'customers' ? excel.importCustomers(path) : excel.importProducts(path)
  })

  handle('excel:template', async (kind: 'customers' | 'products') => {
    const name = kind === 'customers' ? 'قالب_العملاء.xlsx' : 'قالب_المنتجات.xlsx'
    const path = await chooseSavePath(name)
    if (!path) return null
    if (kind === 'customers') excel.exportCustomersTemplate(path)
    else excel.exportProductsTemplate(path)
    return path
  })

  // نسخ احتياطي
  handle('db:backup', async () => {
    const path = await chooseSavePath(`backup_${new Date().toISOString().slice(0, 10)}.sqlite`)
    if (!path) return null
    backupTo(path)
    return path
  })

  handle('db:restore', async () => {
    const path = await chooseOpenPath([{ name: 'قاعدة بيانات', extensions: ['sqlite', 'db'] }])
    if (!path) return false
    await restoreFrom(path)
    return true
  })

  // اختيار مجلد عام (يُستخدم في شاشة الإعداد الأولى)
  handle('dialog:chooseDir', () => chooseDirectory())

  // إعدادات النسخ الاحتياطي اليومي والموقع الثانوي
  handle('backup:settings', () => getBackupSettings())
  handle('backup:now', () => backupNow())
  handle('backup:chooseDir', async () => {
    const dir = await chooseDirectory()
    if (dir) setBackupDir(dir)
    return getBackupSettings()
  })
  handle('backup:clearDir', () => {
    setBackupDir(null)
    return getBackupSettings()
  })
}

async function chooseDirectory(): Promise<string | null> {
  if (!mainWindow) return null
  const res = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory', 'createDirectory'] })
  return res.canceled || res.filePaths.length === 0 ? null : res.filePaths[0]
}

async function chooseSavePath(defaultName: string): Promise<string | null> {
  if (!mainWindow) return null
  const res = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: defaultName.endsWith('.sqlite')
      ? [{ name: 'قاعدة بيانات', extensions: ['sqlite'] }]
      : [{ name: 'Excel', extensions: ['xlsx'] }]
  })
  return res.canceled || !res.filePath ? null : res.filePath
}

async function chooseOpenPath(
  filters: Electron.FileFilter[] = [{ name: 'Excel', extensions: ['xlsx', 'xls'] }]
): Promise<string | null> {
  if (!mainWindow) return null
  const res = await dialog.showOpenDialog(mainWindow, { properties: ['openFile'], filters })
  return res.canceled || res.filePaths.length === 0 ? null : res.filePaths[0]
}

// طباعة محتوى HTML عبر نافذة مخفية
async function printHtml(html: string): Promise<void> {
  const printWin = new BrowserWindow({ show: false, webPreferences: { sandbox: false } })
  await printWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
  await new Promise<void>((resolve) => {
    printWin.webContents.print({ silent: false, printBackground: true }, () => resolve())
  })
  printWin.close()
}

app.whenReady().then(async () => {
  await initDatabase()
  ensureDailyBackup()
  registerIpc()
  createWindow()
  console.log('قاعدة البيانات:', getDbFilePath())

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
