import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs'
import { backupTo, getConfig, setConfig } from './database'
import { todayISO } from '../shared/finance'
import type { BackupFileInfo, BackupSettings } from '../shared/types'

const DIR_KEY = 'backupDir'
const LAST_DAILY_KEY = 'lastDailyBackup'
const LOCAL_RETENTION = 14 // الاحتفاظ بآخر 14 نسخة يومية محلياً

function localBackupDir(): string {
  const dir = join(app.getPath('userData'), 'backups')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

export function getBackupDir(): string | null {
  return getConfig(DIR_KEY)
}

export function setBackupDir(dir: string | null): void {
  setConfig(DIR_KEY, dir && dir.trim() ? dir.trim() : null)
}

function writeBackupTo(dir: string, fileName: string): string {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const target = join(dir, fileName)
  backupTo(target)
  return target
}

function pruneLocal(): void {
  try {
    const dir = localBackupDir()
    const files = readdirSync(dir)
      .filter((f) => f.startsWith('data-') && f.endsWith('.sqlite'))
      .map((f) => ({ f, t: statSync(join(dir, f)).mtimeMs }))
      .sort((a, b) => b.t - a.t)
    for (const item of files.slice(LOCAL_RETENTION)) {
      unlinkSync(join(dir, item.f))
    }
  } catch {
    // تجاهل أخطاء التنظيف
  }
}

// نسخة احتياطية يومية تلقائية عند بدء التشغيل (مرة واحدة في اليوم)
export function ensureDailyBackup(): void {
  const today = todayISO()
  if (getConfig(LAST_DAILY_KEY) === today) return
  const fileName = `data-${today}.sqlite`
  try {
    writeBackupTo(localBackupDir(), fileName)
    const secondary = getBackupDir()
    if (secondary) {
      try {
        writeBackupTo(secondary, fileName)
      } catch {
        // قد يكون القرص الخارجي غير متصل؛ نتابع دون توقف
      }
    }
    setConfig(LAST_DAILY_KEY, today)
    pruneLocal()
  } catch {
    // عدم منع تشغيل التطبيق إذا فشلت النسخة
  }
}

// نسخة احتياطية فورية إلى المجلدين (المحلي + الثانوي إن وُجد)
export function backupNow(): { local: string; secondary: string | null } {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const fileName = `data-${stamp}.sqlite`
  const local = writeBackupTo(localBackupDir(), fileName)
  let secondary: string | null = null
  const dir = getBackupDir()
  if (dir) secondary = writeBackupTo(dir, fileName)
  pruneLocal()
  return { local, secondary }
}

export function listLocalBackups(): BackupFileInfo[] {
  const dir = localBackupDir()
  return readdirSync(dir)
    .filter((f) => f.endsWith('.sqlite'))
    .map((f) => {
      const full = join(dir, f)
      const st = statSync(full)
      return { name: f, path: full, size: st.size, createdAt: new Date(st.mtimeMs).toISOString() }
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export function getBackupSettings(): BackupSettings {
  return {
    backupDir: getBackupDir(),
    lastDailyBackup: getConfig(LAST_DAILY_KEY),
    localBackups: listLocalBackups()
  }
}
