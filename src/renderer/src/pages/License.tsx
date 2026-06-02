import React, { useState } from 'react'
import Icon from '../components/Icon'
import { useToast } from '../components/Toast'
import { useApp } from '../context/AppContext'
import { formatDate } from '../lib/format'

export default function License(): React.JSX.Element {
  const { notify } = useToast()
  const { license, refreshLicense } = useApp()
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)

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

  const typeLabel = license.type === 'trial' ? 'فترة تجربة' : license.type === 'licensed' ? 'ترخيص كامل' : '—'
  const stateClass = license.expired ? 'badge-overdue' : license.daysLeft <= 7 ? 'badge-due' : 'badge-paid'
  const stateText = license.expired ? 'منتهٍ' : 'فعّال'

  return (
    <div style={{ maxWidth: 720 }}>
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

      <div className="card card-pad">
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
    </div>
  )
}
