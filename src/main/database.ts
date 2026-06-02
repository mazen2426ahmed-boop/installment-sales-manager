import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'fs'
import initSqlJs, { Database as SqlJsDatabase, SqlValue } from 'sql.js'

type Params = Record<string, SqlValue> | SqlValue[]

let db: SqlJsDatabase | null = null
let dbFilePath = ''

function resolveWasmPath(): string {
  // مسار ملف الـ WASM الخاص بـ sql.js (يعمل في التطوير وداخل الحزمة)
  return require.resolve('sql.js/dist/sql-wasm.wasm')
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  nationalId TEXT DEFAULT '',
  address TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT DEFAULT '',
  brand TEXT DEFAULT '',
  supplierId INTEGER,
  purchasePrice REAL DEFAULT 0,
  stock INTEGER DEFAULT 0,
  notes TEXT DEFAULT '',
  createdAt TEXT NOT NULL,
  FOREIGN KEY (supplierId) REFERENCES suppliers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customerId INTEGER NOT NULL,
  productId INTEGER,
  productName TEXT NOT NULL,
  brand TEXT DEFAULT '',
  quantity INTEGER DEFAULT 1,
  purchasePrice REAL DEFAULT 0,
  profitMargin REAL DEFAULT 0,
  salePrice REAL DEFAULT 0,
  downPayment REAL DEFAULT 0,
  installmentsCount INTEGER DEFAULT 12,
  saleDate TEXT NOT NULL,
  firstInstallmentDate TEXT NOT NULL,
  notes TEXT DEFAULT '',
  createdAt TEXT NOT NULL,
  FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (productId) REFERENCES products(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS installments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  saleId INTEGER NOT NULL,
  number INTEGER NOT NULL,
  amount REAL NOT NULL,
  dueDate TEXT NOT NULL,
  paidAmount REAL DEFAULT 0,
  paidDate TEXT,
  FOREIGN KEY (saleId) REFERENCES sales(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  name TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'seller',
  passwordHash TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE INDEX IF NOT EXISTS idx_inst_sale ON installments(saleId);
CREATE INDEX IF NOT EXISTS idx_inst_due ON installments(dueDate);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customerId);
`

export async function initDatabase(): Promise<void> {
  const SQL = await initSqlJs({ locateFile: () => resolveWasmPath() })
  const userDir = app.getPath('userData')
  if (!existsSync(userDir)) mkdirSync(userDir, { recursive: true })
  dbFilePath = join(userDir, 'data.sqlite')

  if (existsSync(dbFilePath)) {
    const fileBuffer = readFileSync(dbFilePath)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }
  db.run(SCHEMA)
  persist()
}

export function persist(): void {
  if (!db || !dbFilePath) return
  const data = db.export()
  writeFileSync(dbFilePath, Buffer.from(data))
}

export function getDbFilePath(): string {
  return dbFilePath
}

// قراءة/كتابة قيم الإعداد العامة (الترخيص، مجلد النسخ الاحتياطي، ...)
export function getConfig(key: string): string | null {
  const row = get<{ value: string | null }>(`SELECT value FROM app_config WHERE key = ?`, [key])
  return row ? row.value : null
}

export function setConfig(key: string, value: string | null): void {
  run(
    `INSERT INTO app_config (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  )
}

// نسخة احتياطية إلى مسار محدد
export function backupTo(targetPath: string): void {
  persist()
  copyFileSync(dbFilePath, targetPath)
}

// استرجاع من نسخة احتياطية
export async function restoreFrom(sourcePath: string): Promise<void> {
  const SQL = await initSqlJs({ locateFile: () => resolveWasmPath() })
  const buf = readFileSync(sourcePath)
  // التحقق من صحة الملف بفتحه
  const test = new SQL.Database(buf)
  test.close()
  writeFileSync(dbFilePath, buf)
  db = new SQL.Database(buf)
  db.run(SCHEMA)
  persist()
}

function ensureDb(): SqlJsDatabase {
  if (!db) throw new Error('Database not initialized')
  return db
}

export function all<T = Record<string, unknown>>(sql: string, params: Params = []): T[] {
  const d = ensureDb()
  const stmt = d.prepare(sql)
  try {
    stmt.bind(params as never)
    const rows: T[] = []
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as unknown as T)
    }
    return rows
  } finally {
    stmt.free()
  }
}

export function get<T = Record<string, unknown>>(sql: string, params: Params = []): T | undefined {
  const rows = all<T>(sql, params)
  return rows[0]
}

export function run(sql: string, params: Params = []): { lastInsertRowid: number; changes: number } {
  const d = ensureDb()
  const stmt = d.prepare(sql)
  try {
    stmt.bind(params as never)
    stmt.step()
  } finally {
    stmt.free()
  }
  const idRow = d.exec('SELECT last_insert_rowid() AS id, changes() AS c')
  const values = idRow[0]?.values?.[0]
  const lastInsertRowid = values ? Number(values[0]) : 0
  const changes = values ? Number(values[1]) : 0
  persist()
  return { lastInsertRowid, changes }
}

// تنفيذ مجموعة عمليات ضمن معاملة واحدة ثم الحفظ مرة واحدة
export function transaction<T>(fn: () => T): T {
  const d = ensureDb()
  d.run('BEGIN TRANSACTION')
  try {
    const result = fn()
    d.run('COMMIT')
    persist()
    return result
  } catch (err) {
    d.run('ROLLBACK')
    throw err
  }
}

// إصدار run بدون حفظ (للاستخدام داخل transaction)
export function runNoPersist(sql: string, params: Params = []): number {
  const d = ensureDb()
  const stmt = d.prepare(sql)
  try {
    stmt.bind(params as never)
    stmt.step()
  } finally {
    stmt.free()
  }
  const idRow = d.exec('SELECT last_insert_rowid() AS id')
  const values = idRow[0]?.values?.[0]
  return values ? Number(values[0]) : 0
}
