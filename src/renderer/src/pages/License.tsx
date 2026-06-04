import React, { useEffect, useState } from 'react'
import Icon from '../components/Icon'
import { useToast } from '../components/Toast'
import { useApp } from '../context/AppContext'
import { formatDate } from '../lib/format'
import type { LicenseKeyResult } from '../../../shared/types'

export default function License(): React.JSX.Element {
  const { notify } = useToast()
  const { license, refreshLicense } = useApp()
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)

  // أداة المطوّر لتوليد المفاتيح
  const [devUnlocked, setDevUnlocked] = useState(false)
  const [passcode, setPasscode] = useState('')
  const [genMid, setGenMid] = useState('')
  const [genDays, setGenDays] = useState(365)
  const [genTo, setGenTo] = useState('')
  const [genResult, setGenResult] = useState<LicenseKeyResult | null>(null)
  const [genBusy, setGenBusy] = useState(false)

  useEffect(() => {
    setGenMid(license.machineId)
  }, [license.machineId])

  const activate = async (): Promise<void> => {
    if (!key.trim()) return
    setBusy(true)
    const res = await window.api.activateLicense(key.trim())
    setBusy(false)
    if (res.ok) {
      notify('تم تفعيل الترخيص بنجاح', 'success')
      setKey('')
      await refreshLicense()
    } else notify(res.error || 'مفتاح غير صالح', 'error')
  }

  const copyText = async (text: string, label: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text)
      notify(`تم نسخ ${label}`, 'success')
    } catch {
      notify('تعذّر النسخ', 'error')
    }
  }

  const unlockDev = async (): Promise<void> => {
    const res = await window.api.checkDevAccess(passcode.trim())
    if (res.ok && res.data) {
      setDevUnlocked(true)
      notify('تم فتح أدوات المطوّر', 'success')
    } else notify('رمز المطوّر غير صحيح', 'error')
  }

  const generate = async (): Promise<void> => {
    setGenBusy(true)
    const res = await window.api.generateLicense({
      passcode: passcode.trim(),
      machineId: genMid.trim(),
      days: Number(genDays),
      to: genTo.trim()
    })
    setGenBusy(false)
    if (res.ok && res.data) {
      setGenResult(res.data)
      notify('تم توليد المفتاح', 'success')
    } else notify(res.error || 'تعذّر توليد المفتاح', 'error')
  }

  const typeLabel = license.type === 'trial' ? 'فترة تجربة' : license.type === 'licensed' ? 'ترخيص كامل' : '—'
  const stateClass = license.expired ? 'badge-overdue' : license.daysLeft <= 7 ? 'badge-due' : 'badge-paid'
  const stateText = license.expired ? 'منتهٍ' : 'فعّال'

  return (
    <div style={{ maxWidth: 760 }}>
      <div className="card card-pad" style={{ marginBottom: 18 }}>
        <div className="section-title">
          <Icon name="shield" size={18} /> حالة الترخيص
        </div>
        <div className="stat-grid" style={{ marginTop: 8 }}>
          <div className="lic-row">
            <span className="muted">النوع</span>
            <strong>{typeLabel}</strong>
          </div>
          <div className="lic-row">
            <span className="muted">الحالة</span>
            <span className={`badge ${stateClass}`}>{stateText}</span>
          </div>
          <div className="lic-row">
            <span className="muted">تاريخ التفعيل</span>
            <strong>{license.activatedAt ? formatDate(license.activatedAt) : '—'}</strong>
          </div>
          <div className="lic-row">
            <span className="muted">تاريخ الانتهاء</span>
            <strong>{license.expiresAt ? formatDate(license.expiresAt) : '—'}</strong>
          </div>
          <div className="lic-row">
            <span className="muted">الأيام المتبقية</span>
            <strong>{license.expired ? 0 : license.daysLeft} يوم</strong>
          </div>
          {license.issuedTo && (
            <div className="lic-row">
              <span className="muted">صادر إلى</span>
              <strong>{license.issuedTo}</strong>
            </div>
          )}
        </div>

        {license.expired && (
          <div className="alert-banner" style={{ marginTop: 16 }}>
            <Icon name="alert" size={18} />
            انتهت صلاحية الترخيص — البرنامج في وضع العرض فقط. أدخل مفتاح ترخيص جديد لاستئناف إضافة وتعديل البيانات.
          </div>
        )}
        {!license.expired && license.daysLeft <= 7 && (
          <div className="alert-banner warning" style={{ marginTop: 16 }}>
            <Icon name="alert" size={18} />
            ينتهي الترخيص خلال {license.daysLeft} يوم. يُنصح بالتجديد قريباً.
          </div>
        )}
      </div>

      <div className="card card-pad" style={{ marginBottom: 18 }}>
        <div className="section-title">
          <Icon name="cpu" size={18} /> معرّف هذا الجهاز
        </div>
        <p className="muted" style={{ marginBottom: 12 }}>
          مفاتيح الترخيص تُربط بهذا المعرّف ولا تعمل إلا على هذا الجهاز. أرسله للمطوّر للحصول على مفتاح خاص بجهازك.
        </p>
        <div className="row" style={{ alignItems: 'center', gap: 10 }}>
          <code className="mid-box">{license.machineId}</code>
          <button className="btn btn-outline btn-sm" onClick={() => copyText(license.machineId, 'معرّف الجهاز')}>
            <Icon name="copy" size={16} /> نسخ
          </button>
        </div>
        {license.boundMachineId && (
          <p className="muted" style={{ marginTop: 10, fontSize: 12.5 }}>
            المفتاح الحالي مربوط بالجهاز: <strong>{license.boundMachineId}</strong>
          </p>
        )}
      </div>

      <div className="card card-pad" style={{ marginBottom: 18 }}>
        <div className="section-title">
          <Icon name="key" size={18} /> تفعيل / تجديد الترخيص
        </div>
        <p className="muted" style={{ marginBottom: 14 }}>
          أدخل مفتاح الترخيص الذي حصلت عليه لتفعيل البرنامج أو تمديد مدته.
        </p>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div className="field" style={{ flex: 1 }}>
            <label>مفتاح الترخيص</label>
            <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="ألصق المفتاح هنا" />
          </div>
          <button className="btn btn-primary" onClick={activate} disabled={busy || !key.trim()}>
            <Icon name="check" size={16} /> {busy ? 'جارٍ التفعيل...' : 'تفعيل'}
          </button>
        </div>
      </div>

      {/* أدوات المطوّر — توليد المفاتيح (محمية برمز المطوّر) */}
      <div className="card card-pad">
        <div className="section-title">
          <Icon name="lock" size={18} /> أدوات المطوّر — توليد مفتاح ترخيص
        </div>
        {!devUnlocked ? (
          <>
            <p className="muted" style={{ marginBottom: 14 }}>
              هذه الأداة مخصّصة للمطوّر فقط. أدخل رمز المطوّر للوصول إليها.
            </p>
            <div className="row" style={{ alignItems: 'flex-end' }}>
              <div className="field" style={{ flex: 1 }}>
                <label>رمز المطوّر</label>
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <button className="btn btn-outline" onClick={unlockDev} disabled={!passcode.trim()}>
                <Icon name="key" size={16} /> فتح
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="muted" style={{ marginBottom: 14 }}>
              ولّد مفتاحاً مربوطاً بمعرّف جهاز محدّد. اترك معرّف الجهاز فارغاً لإنشاء مفتاح يعمل على أي جهاز.
            </p>
            <div className="form-grid">
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>معرّف جهاز العميل</label>
                <input
                  value={genMid}
                  onChange={(e) => setGenMid(e.target.value)}
                  placeholder="XXXX-XXXX-XXXX-XXXX (فارغ = أي جهاز)"
                />
              </div>
              <div className="field">
                <label>مدة الصلاحية (يوم)</label>
                <input type="number" min={1} value={genDays} onChange={(e) => setGenDays(Number(e.target.value))} />
              </div>
              <div className="field">
                <label>صادر إلى (اختياري)</label>
                <input value={genTo} onChange={(e) => setGenTo(e.target.value)} placeholder="اسم المحل/العميل" />
              </div>
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn btn-primary" onClick={generate} disabled={genBusy}>
                <Icon name="key" size={16} /> {genBusy ? 'جارٍ التوليد...' : 'توليد المفتاح'}
              </button>
            </div>
            {genResult && (
              <div className="card card-pad" style={{ marginTop: 16, background: 'var(--surface-2, #f8fafc)' }}>
                <div className="lic-row">
                  <span className="muted">تاريخ الانتهاء</span>
                  <strong>{genResult.exp}</strong>
                </div>
                <div className="lic-row">
                  <span className="muted">مربوط بالجهاز</span>
                  <strong>{genResult.machineId || 'أي جهاز'}</strong>
                </div>
                <div className="field" style={{ marginTop: 10 }}>
                  <label>المفتاح المولَّد</label>
                  <textarea
                    readOnly
                    value={genResult.key}
                    rows={3}
                    style={{ width: '100%', wordBreak: 'break-all', fontFamily: 'monospace' }}
                  />
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => copyText(genResult.key, 'المفتاح')}>
                  <Icon name="copy" size={16} /> نسخ المفتاح
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
