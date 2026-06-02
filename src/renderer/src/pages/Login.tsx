import React, { useState } from 'react'
import Icon from '../components/Icon'
import type { User } from '../../../shared/types'

export default function Login({ onLoggedIn }: { onLoggedIn: (u: User) => void }): React.JSX.Element {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError('')
    if (!username.trim() || !password) {
      setError('أدخل اسم المستخدم وكلمة المرور')
      return
    }
    setBusy(true)
    const res = await window.api.login(username.trim(), password)
    setBusy(false)
    if (res.ok && res.data) onLoggedIn(res.data)
    else setError(res.error || 'تعذّر تسجيل الدخول')
  }

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-logo">
          <Icon name="wallet" size={34} />
        </div>
        <h1>إدارة البيع بالتقسيط</h1>
        <p className="auth-sub">سجّل الدخول للمتابعة</p>

        <div className="field">
          <label>اسم المستخدم</label>
          <div className="input-icon">
            <Icon name="user" size={18} />
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus placeholder="اسم المستخدم" />
          </div>
        </div>
        <div className="field">
          <label>كلمة المرور</label>
          <div className="input-icon">
            <Icon name="lock" size={18} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <button className="btn btn-primary auth-submit" type="submit" disabled={busy}>
          <Icon name="lock" size={16} /> {busy ? 'جارٍ الدخول...' : 'تسجيل الدخول'}
        </button>
      </form>
      <div className="auth-foot">الإصدار 1.0.0 — يعمل بدون إنترنت</div>
    </div>
  )
}
