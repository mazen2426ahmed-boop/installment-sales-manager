import { createHmac } from 'crypto'
import { getConfig, setConfig } from './database'
import { daysBetween, todayISO } from '../shared/finance'
import type { LicenseStatus } from '../shared/types'

/**
 * سرّ التوقيع المضمَّن في التطبيق للتحقق من مفاتيح الترخيص دون اتصال بالإنترنت.
 * يجب أن يطابق السرّ المستخدم في سكربت توليد المفاتيح (scripts/gen-license.cjs).
 */
const LICENSE_SECRET = 'ISM-2026-9f3a7c1e5b8d40a2-installment-sales-manager'
const CONFIG_KEY = 'license'

interface LicensePayload {
  exp: string // تاريخ الانتهاء YYYY-MM-DD
  to?: string // جهة الإصدار (اختياري)
}

interface StoredLicense {
  type: 'trial' | 'licensed'
  activatedAt: string
  expiresAt: string
  issuedTo: string | null
  key: string | null
}

function b64urlDecode(s: string): string {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
}

function sign(encoded: string): string {
  return createHmac('sha256', LICENSE_SECRET).update(encoded).digest('hex').slice(0, 32)
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
      issuedTo: null
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
    issuedTo: lic.issuedTo
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
  const stored: StoredLicense = {
    type: 'licensed',
    activatedAt: todayISO(),
    expiresAt: payload.exp,
    issuedTo: payload.to ?? null,
    key: key.trim()
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
