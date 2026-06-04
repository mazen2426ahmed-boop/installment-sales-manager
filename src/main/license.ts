import { createHmac, createHash } from 'crypto'
import { networkInterfaces, hostname, platform, arch } from 'os'
import { getConfig, setConfig } from './database'
import { daysBetween, todayISO } from '../shared/finance'
import type { LicenseStatus, LicenseGenInput, LicenseKeyResult } from '../shared/types'

/**
 * سرّ التوقيع المضمَّن في التطبيق للتحقق من مفاتيح الترخيص دون اتصال بالإنترنت.
 * يجب أن يطابق السرّ المستخدم في سكربت توليد المفاتيح (scripts/gen-license.cjs).
 */
const LICENSE_SECRET = 'ISM-2026-9f3a7c1e5b8d40a2-installment-sales-manager'
const CONFIG_KEY = 'license'

/**
 * رمز المطوّر اللازم لفتح أداة توليد مفاتيح الترخيص داخل البرنامج.
 * غيّره هنا قبل توزيع البرنامج لمنع صاحب المحل من توليد مفاتيح بنفسه.
 */
const DEV_PASSCODE = 'Fouly#2026'

interface LicensePayload {
  exp: string // تاريخ الانتهاء YYYY-MM-DD
  to?: string // جهة الإصدار (اختياري)
  mid?: string // معرّف الجهاز المربوط (اختياري)
}

interface StoredLicense {
  type: 'trial' | 'licensed'
  activatedAt: string
  expiresAt: string
  issuedTo: string | null
  key: string | null
  machineId?: string | null // الجهاز المربوط به المفتاح
}

function b64urlDecode(s: string): string {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
}

function b64urlEncode(s: string): string {
  return Buffer.from(s, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function sign(encoded: string): string {
  return createHmac('sha256', LICENSE_SECRET).update(encoded).digest('hex').slice(0, 32)
}

// بصمة الجهاز: مشتقة من عناوين MAC غير الداخلية واسم الجهاز والنظام
// تُعرض بصيغة XXXX-XXXX-XXXX-XXXX لتسهيل نقلها
export function getMachineId(): string {
  const ifaces = networkInterfaces()
  const macs: string[] = []
  for (const name of Object.keys(ifaces)) {
    for (const ni of ifaces[name] ?? []) {
      if (!ni.internal && ni.mac && ni.mac !== '00:00:00:00:00:00') macs.push(ni.mac.toLowerCase())
    }
  }
  macs.sort()
  const raw = `${macs.join(',')}|${hostname()}|${platform()}|${arch()}`
  const hash = createHash('sha256').update(raw).digest('hex').toUpperCase()
  const short = hash.slice(0, 16)
  return short.replace(/(.{4})(.{4})(.{4})(.{4})/, '$1-$2-$3-$4')
}

function normalizeMid(mid: string): string {
  return mid.trim().toUpperCase().replace(/\s+/g, '')
}

// التحقق من رمز المطوّر اللازم لأداة توليد المفاتيح
export function verifyDevPasscode(code: string): boolean {
  return (code ?? '').trim() === DEV_PASSCODE
}

// توليد مفتاح ترخيص (أداة المطوّر) — يُمكن ربطه بمعرّف جهاز محدد
export function generateKey(input: LicenseGenInput): LicenseKeyResult {
  if (!verifyDevPasscode(input.passcode)) throw new Error('رمز المطوّر غير صحيح')
  let exp = (input.exp ?? '').trim()
  if (!exp) {
    const days = Number.isFinite(input.days) ? Number(input.days) : 365
    exp = addDaysISO(todayISO(), Math.max(1, Math.floor(days)))
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(exp)) throw new Error('تاريخ الانتهاء غير صحيح (YYYY-MM-DD)')
  const payload: LicensePayload = { exp }
  const mid = normalizeMid(input.machineId ?? '')
  if (mid) payload.mid = mid
  const to = (input.to ?? '').trim()
  if (to) payload.to = to
  const encoded = b64urlEncode(JSON.stringify(payload))
  const key = `${encoded}.${sign(encoded)}`
  return { key, exp, machineId: payload.mid ?? null, to: payload.to ?? null }
}

// التحقق من مفتاح الترخيص وإرجاع حمولته إن كان صحيحاً
export function verifyKey(key: string): LicensePayload {
  const trimmed = key.trim()
  const dot = trimmed.lastIndexOf('.')
  if (dot <= 0) throw new Error('صيغة مفتاح الترخيص غير صحيحة')
  const encoded = trimmed.slice(0, dot)
  const sig = trimmed.slice(dot + 1)
  if (sign(encoded) !== sig) throw new Error('مفتاح الترخيص غير صالح')
  let payload: LicensePayload
  try {
    payload = JSON.parse(b64urlDecode(encoded))
  } catch {
    throw new Error('تعذّرت قراءة مفتاح الترخيص')
  }
  if (!payload.exp || !/^\d{4}-\d{2}-\d{2}$/.test(payload.exp)) {
    throw new Error('مفتاح الترخيص لا يحتوي تاريخ انتهاء صحيح')
  }
  return payload
}

function readStored(): StoredLicense | null {
  const raw = getConfig(CONFIG_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredLicense
  } catch {
    return null
  }
}

export function getLicenseStatus(): LicenseStatus {
  const machineId = getMachineId()
  const lic = readStored()
  if (!lic) {
    return {
      configured: false,
      type: null,
      activatedAt: null,
      expiresAt: null,
      daysLeft: 0,
      expired: true,
      readOnly: true,
      issuedTo: null,
      machineId,
      boundMachineId: null
    }
  }
  const today = todayISO()
  // أيام متبقية: موجبة قبل الانتهاء، صفر أو أقل بعده
  const daysLeft = daysBetween(today, lic.expiresAt)
  const expired = daysLeft < 0
  return {
    configured: true,
    type: lic.type,
    activatedAt: lic.activatedAt,
    expiresAt: lic.expiresAt,
    daysLeft: Math.max(0, daysLeft),
    expired,
    readOnly: expired,
    issuedTo: lic.issuedTo,
    machineId,
    boundMachineId: lic.machineId ?? null
  }
}

export function startTrial(days: number): LicenseStatus {
  const existing = readStored()
  if (existing && existing.type === 'trial') {
    throw new Error('فترة التجربة مُفعّلة بالفعل')
  }
  const d = Math.max(1, Math.floor(days))
  const expiresAt = addDaysISO(todayISO(), d)
  const stored: StoredLicense = {
    type: 'trial',
    activatedAt: todayISO(),
    expiresAt,
    issuedTo: null,
    key: null
  }
  setConfig(CONFIG_KEY, JSON.stringify(stored))
  return getLicenseStatus()
}

export function activateKey(key: string): LicenseStatus {
  const payload = verifyKey(key)
  // مفتاح مربوط بجهاز: يُرفض إن كان على جهاز مختلف
  if (payload.mid && payload.mid !== normalizeMid(getMachineId())) {
    throw new Error('مفتاح الترخيص غير مخصّص لهذا الجهاز')
  }
  const stored: StoredLicense = {
    type: 'licensed',
    activatedAt: todayISO(),
    expiresAt: payload.exp,
    issuedTo: payload.to ?? null,
    key: key.trim(),
    machineId: payload.mid ?? null
  }
  setConfig(CONFIG_KEY, JSON.stringify(stored))
  return getLicenseStatus()
}

export function isReadOnly(): boolean {
  return getLicenseStatus().readOnly
}

// حارس يمنع الكتابة عند انتهاء الترخيص (وضع العرض فقط)
export function assertCanWrite(): void {
  if (isReadOnly()) {
    throw new Error('انتهت صلاحية الترخيص — البرنامج في وضع العرض فقط. جدّد الترخيص لإضافة أو تعديل البيانات.')
  }
}

function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
