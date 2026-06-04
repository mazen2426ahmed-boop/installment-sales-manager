#!/usr/bin/env node
/*
 * أداة توليد مفاتيح الترخيص لبرنامج «إدارة البيع بالتقسيط».
 * يجب أن يطابق السرّ المستخدم هنا السرّ في src/main/license.ts
 *
 * أمثلة الاستخدام:
 *   node scripts/gen-license.cjs --days 365 --to "محل المهندس"
 *   node scripts/gen-license.cjs --exp 2027-01-01
 *   node scripts/gen-license.cjs --days 365 --mid ABCD-1234-EF56-7890
 *
 * ملاحظة: يمكن أيضاً توليد المفاتيح من داخل البرنامج نفسه (صفحة الترخيص ← أدوات المطوّر)
 * حيث يظهر معرّف الجهاز ويُربط المفتاح به مباشرة.
 */
const { createHmac } = require('crypto')

const LICENSE_SECRET = 'ISM-2026-9f3a7c1e5b8d40a2-installment-sales-manager'

function b64urlEncode(s) {
  return Buffer.from(s, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function sign(encoded) {
  return createHmac('sha256', LICENSE_SECRET).update(encoded).digest('hex').slice(0, 32)
}

function addDaysISO(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseArgs(argv) {
  const args = {}
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--days') args.days = Number(argv[++i])
    else if (a === '--exp') args.exp = argv[++i]
    else if (a === '--to') args.to = argv[++i]
    else if (a === '--mid') args.mid = argv[++i]
  }
  return args
}

function main() {
  const args = parseArgs(process.argv)
  let exp = args.exp
  if (!exp) {
    const days = Number.isFinite(args.days) ? args.days : 365
    exp = addDaysISO(days)
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(exp)) {
    console.error('تاريخ الانتهاء غير صحيح. استخدم الصيغة YYYY-MM-DD أو --days')
    process.exit(1)
  }
  const payload = { exp }
  if (args.to) payload.to = args.to
  if (args.mid) payload.mid = String(args.mid).trim().toUpperCase().replace(/\s+/g, '')
  const encoded = b64urlEncode(JSON.stringify(payload))
  const key = `${encoded}.${sign(encoded)}`
  console.log('\nمفتاح الترخيص:')
  console.log(key)
  console.log(`\nتاريخ الانتهاء: ${exp}`)
  if (args.to) console.log(`صادر إلى: ${args.to}`)
  if (payload.mid) console.log(`مربوط بالجهاز: ${payload.mid}`)
  console.log('')
}

main()
