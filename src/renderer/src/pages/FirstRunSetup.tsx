import React, { useState } from 'react'
import Icon from '../components/Icon'
import type { User, FirstRunSetupInput } from '../../../shared/types'

export default function FirstRunSetup({ onDone }: { onDone: (u: User) => void }): React.JSX.Element {
  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [licenseMode, setLicenseMode] = useState<'trial' | 'key'>('trial')
  const [trialDays, setTrialDays] = useState(30)
  const [licenseKey, setLicenseKey] = useState('')
  const [backupDir, setBackupDir] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const pickFolder = async (): Promise<void> => {
    const res = await window.api.chooseDir()
    if (res.ok && res.data) setBackupDir(res.data)
  }

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError('')
    if (!username.trim()) return setError('اسم المستخدم للمالك مطلوب')
    if (password.length < 4) return setError('كلمة المرور يجب ألا تقل عن 4 خانات')
    if (password !== confirm) return setError('كلمتا المرور غير متطابقتين')
    if (licenseMode === 'trial' && (!trialDays || trialDays < 1)) return setError('حدد عدد أيام التجربة')
    if (licenseMode === 'key' && !licenseKey.trim()) return setError('أدخل مفتاح الترخيص')

    const input: FirstRunSetupInput = {
      owner: { username: username.trim(), name: name.trim() || username.trim(), password },
      license:
        licenseMode === 'trial'
          ? { mode: 'trial', trialDays: Number(trialDays) }
          : { mode: 'key', key: licenseKey.trim() },
      backupDir
    }
    setBusy(true)
    const res = await window.api.runSetup(input)
    setBusy(false)
    if (res.ok && res.data) onDone(res.data)
    else setError(res.error || 'تعذّر إكمال الإعداد')
  }

  return (
    <div className="auth-screen">
      <form className="auth-card setup-card" onSubmit={submit}>
        <div className="auth-logo">
          <Icon name="shield" size={32} />
        </div>
        <h1>الإعداد الأول للبرنامج</h1>
        <p className="auth-sub">أنشئ حساب المالك وحدّد الترخيص ومجلد النسخ الاحتياطي</p>

        <div className="section-title">
          <Icon name="user" size={16} /> حساب المالك
        </div>
        <div className="form-grid">
          <div className="field">
            <label>اسم المستخدم *</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
          </div>
          <div className="field">
            <label>الاسم الكامل</label>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label>كلمة المرور *</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="field">
            <label>تأكيد كلمة المرور *</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
        </div>

        <div className="section-title" style={{ marginTop: 18 }}>
          <Icon name="key" size={16} /> الترخيص
        </div>
        <div className="seg">
          <button
            type="button"
            className={`seg-btn ${licenseMode === 'trial' ? 'active' : ''}`}
            onClick={() => setLicenseMode('trial')}
          >
            فترة تجربة
          </button>
          <button
            type="button"
            className={`seg-btn ${licenseMode === 'key' ? 'active' : ''}`}
            onClick={() => setLicenseMode('key')}
          >
            مفتاح ترخيص
          </button>
        </div>
        {licenseMode === 'trial' ? (
          <div className="field">
            <label>عدد أيام التجربة</label>
            <input
              type="number"
              min={1}
              value={trialDays}
              onChange={(e) => setTrialDays(Number(e.target.value))}
            />
          </div>
        ) : (
          <div className="field">
            <label>مفتاح الترخيص</label>
            <input value={licenseKey} onChange={(e) => setLicenseKey(e.target.value)} placeholder="ألصق المفتاح هنا" />
          </div>
        )}

        <div className="section-title" style={{ marginTop: 18 }}>
          <Icon name="folder" size={16} /> مجلد النسخ الاحتياطي الثانوي (اختياري)
        </div>
        <div className="row" style={{ alignItems: 'center' }}>
          <button type="button" className="btn btn-outline" onClick={pickFolder}>
            <Icon name="folder" size={16} /> اختيار مجلد
          </button>
          <span className="muted" style={{ wordBreak: 'break-all' }}>
            {backupDir || 'لم يتم التحديد — ستُحفظ النسخ محلياً فقط'}
          </span>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <button className="btn btn-primary auth-submit" type="submit" disabled={busy}>
          <Icon name="check" size={16} /> {busy ? 'جارٍ الإعداد...' : 'بدء استخدام البرنامج'}
        </button>
      </form>
    </div>
  )
}
