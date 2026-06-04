import { contextBridge, ipcRenderer } from 'electron'
import type { Api } from '../shared/api'

const invoke = (channel: string, ...args: unknown[]): Promise<unknown> =>
  ipcRenderer.invoke(channel, ...args)

const api: Api = {
  getSetupStatus: () => invoke('setup:status') as never,
  runSetup: (input) => invoke('setup:run', input) as never,
  login: (username, password) => invoke('auth:login', username, password) as never,
  logout: () => invoke('auth:logout') as never,
  currentUser: () => invoke('auth:current') as never,

  listUsers: () => invoke('users:list') as never,
  createUser: (input) => invoke('users:create', input) as never,
  updateUser: (id, name, role) => invoke('users:update', id, name, role) as never,
  changePassword: (id, newPassword) => invoke('users:changePassword', id, newPassword) as never,
  deleteUser: (id) => invoke('users:delete', id) as never,

  licenseStatus: () => invoke('license:status') as never,
  activateLicense: (key) => invoke('license:activate', key) as never,
  startTrial: (days) => invoke('license:startTrial', days) as never,
  getMachineId: () => invoke('license:machineId') as never,
  checkDevAccess: (passcode) => invoke('license:devAccess', passcode) as never,
  generateLicense: (input) => invoke('license:generate', input) as never,

  chooseDir: () => invoke('dialog:chooseDir') as never,

  backupSettings: () => invoke('backup:settings') as never,
  backupNow: () => invoke('backup:now') as never,
  chooseBackupDir: () => invoke('backup:chooseDir') as never,
  clearBackupDir: () => invoke('backup:clearDir') as never,

  listCustomers: (search) => invoke('customers:list', search) as never,
  getCustomer: (id) => invoke('customers:get', id) as never,
  createCustomer: (c) => invoke('customers:create', c) as never,
  updateCustomer: (c) => invoke('customers:update', c) as never,
  deleteCustomer: (id) => invoke('customers:delete', id) as never,

  listSuppliers: () => invoke('suppliers:list') as never,
  createSupplier: (s) => invoke('suppliers:create', s) as never,
  updateSupplier: (s) => invoke('suppliers:update', s) as never,
  deleteSupplier: (id) => invoke('suppliers:delete', id) as never,

  listProducts: (search) => invoke('products:list', search) as never,
  createProduct: (p) => invoke('products:create', p) as never,
  updateProduct: (p) => invoke('products:update', p) as never,
  deleteProduct: (id) => invoke('products:delete', id) as never,

  createSale: (input) => invoke('sales:create', input) as never,
  listSales: (search) => invoke('sales:list', search) as never,
  getSaleDetails: (id) => invoke('sales:get', id) as never,
  deleteSale: (id) => invoke('sales:delete', id) as never,

  payInstallment: (id, amount, paidDate) => invoke('installments:pay', id, amount, paidDate) as never,
  payInstallmentFull: (id, paidDate) => invoke('installments:payFull', id, paidDate) as never,
  unpayInstallment: (id) => invoke('installments:unpay', id) as never,

  getDueAlerts: () => invoke('alerts:due') as never,
  getDashboardStats: () => invoke('dashboard:stats') as never,
  getMonthlyCollection: () => invoke('dashboard:monthly') as never,

  getReport: (from, to) => invoke('reports:get', from, to) as never,
  printReport: (from, to) => invoke('reports:print', from, to) as never,

  exportExcel: (kind) => invoke('excel:export', kind) as never,
  exportReportExcel: (from, to) => invoke('excel:exportReport', from, to) as never,
  importExcel: (kind) => invoke('excel:import', kind) as never,
  exportTemplate: (kind) => invoke('excel:template', kind) as never,

  backupDatabase: () => invoke('db:backup') as never,
  restoreDatabase: () => invoke('db:restore') as never
}

contextBridge.exposeInMainWorld('api', api)
