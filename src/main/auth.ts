import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'

// تجزئة كلمة المرور باستخدام scrypt مع ملح عشوائي: التنسيق "salt:hash"
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const hashBuf = Buffer.from(hash, 'hex')
  const test = scryptSync(password, salt, 64)
  return hashBuf.length === test.length && timingSafeEqual(hashBuf, test)
}
