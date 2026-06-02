import { contextBridge, ipcRenderer } from 'electron'
import type { Api } from '../shared/api'

const invoke = (channel: string, ...args: unknown[]): Promise<unknown> =>
  ipcRenderer.invoke(channel, ...args)

const api: Api = {
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
