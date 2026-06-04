import React, { useEffect, useState } from 'react'
import Icon from '../components/Icon'
import { useToast } from '../components/Toast'
import { formatDate } from '../lib/format'
import type { BackupSettings } from '../../../shared/types'

export default function Settings(): React.JSX.Element {
  const { notify } = useToast()
  const [settings, setSettings] = useState<BackupSettings | null>(null)

  const loadSettings = async (): Promise<void> => {
    const res = await window.api.backupSettings()
    if (res.ok && res.data) setSettings(res.data)
  }

  useEffect(() => {
    void loadSettings()
  }, [])

  const backup = async (): Promise<void> => {
    const res = await window.api.backupDatabase()
    if (res.ok && res.data) notify('تم إنشاء نسخة احتياطية بنجاح', 'success')
    else if (res.error) notify(res.error, 'error')
  }

  const restore = async (): Promise<void> => {
    if (!confirm('سيتم استبدال جميع البيانات الحالية بالنسخة الاحتياطية. هل أنت متأكد؟')) return
    const res = await window.api.restoreDatabase()
    if (res.ok && res.data) {
      notify('تم استرجاع البيانات. أعد فتح الصفحات لرؤية التحديث.', 'success')
    } else if (res.error) notify(res.error, 'error')
  }

  const backupNow = async (): Promise<void> => {
    const res = await window.api.backupNow()
    if (res.ok && res.data) {
      notify(res.data.secondary ? 'تم النسخ محلياً وإلى المجلد الثانوي' : 'تم النسخ الاحتياطي محلياً', 'success')
      void loadSettings()
    } else if (res.error) notify(res.error, 'error')
  }

  const chooseDir = async (): Promise<void> => {
    const res = await window.api.chooseBackupDir()
    if (res.ok && res.data) {
      setSettings(res.data)
      if (res.data.backupDir) notify('تم تحديد مجلد النسخ الاحتياطي', 'success')
    } else if (res.error) notify(res.error, 'error')
  }

  const clearDir = async (): Promise<void> => {
    const res = await window.api.clearBackupDir()
    if (res.ok && res.data) {
      setSettings(res.data)
      notify('تم إلغاء المجلد الثانوي', 'info')
    }
  }

  const exportAll = async (kind: 'customers' | 'products' | 'sales'): Promise<void> => {
    const res = await window.api.exportExcel(kind)
    if (res.ok && res.data) notify('تم التصدير', 'success')
    else if (res.error) notify(res.error, 'error')
  }

  return (
    <div style={{ maxWidth: 820 }}>
      <div className="card card-pad" style={{ marginBottom: 18 }}>
        <div className="section-title">
          <Icon name="database" size={18} /> النسخ الاحتياطي اليومي التلقائي
        </div>
        <p className="muted" style={{ marginBottom: 14 }}>
          يقوم البرنامج تلقائياً بإنشاء نسخة من قاعدة البيانات مرة كل يوم عند التشغيل، ويحتفظ بآخر 14 نسخة محلياً.
          يمكنك أيضاً تحديد مجلد ثانٍ على الهارد (أو قرص خارجي) لحفظ نسخة إضافية تلقائياً.
        </p>
        <div className="lic-row">
          <span className="muted">آخر نسخة يومية</span>
          <strong>{settings?.lastDailyBackup ? formatDate(settings.lastDailyBackup) : 'لم تُنشأ بعد'}</strong>
        </div>
        <div className="lic-row" style={{ alignItems: 'flex-start' }}>
          <span className="muted">المجلد الثانوي</span>
          <strong style={{ wordBreak: 'break-all', textAlign: 'left' }}>
            {settings?.backupDir || 'غير محدد — النسخ محلياً فقط'}
          </strong>
        </div>
        <div className="row" style={{ flexWrap: 'wrap', marginTop: 14 }}>
          <button className="btn btn-primary" onClick={backupNow}>
            <Icon name="download" size={16} /> نسخ احتياطي الآن
          </button>
          <button className="btn btn-outline" onClick={chooseDir}>
            <Icon name="folder" size={16} /> تحديد المجلد الثانوي
          </button>
          {settings?.backupDir && (
            <button className="btn btn-ghost" onClick={clearDir}>
              <Icon name="close" size={16} /> إلغاء المجلد
            </button>
          )}
        </div>

        {settings && settings.localBackups.length > 0 && (
          <div className="table-wrap" style={{ marginTop: 16 }}>
            <table>
              <thead>
                <tr>
                  <th>النسخة</th>
                  <th>الحجم</th>
                  <th>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {settings.localBackups.slice(0, 8).map((b) => (
                  <tr key={b.path}>
                    <td className="num">{b.name}</td>
                    <td className="num">{(b.size / 1024).toFixed(0)} كيلوبايت</td>
                    <td className="muted">{new Date(b.createdAt).toLocaleString('ar-EG')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card card-pad" style={{ marginBottom: 18 }}>
        <div className="section-title">
          <Icon name="database" size={18} /> نسخة احتياطية يدوية واسترجاع
        </div>
        <p className="muted" style={{ marginBottom: 16 }}>
          أنشئ نسخة في موقع تختاره، أو استرجع البيانات من نسخة سابقة على نفس الجهاز أو جهاز آخر.
        </p>
        <div className="row">
          <button className="btn btn-primary" onClick={backup}>
            <Icon name="download" size={16} /> إنشاء نسخة احتياطية
          </button>
          <button className="btn btn-outline" onClick={restore}>
            <Icon name="upload" size={16} /> استرجاع من نسخة
          </button>
        </div>
      </div>

      <div className="card card-pad" style={{ marginBottom: 18 }}>
        <div className="section-title">
          <Icon name="download" size={18} /> تصدير البيانات إلى Excel
        </div>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={() => exportAll('customers')}>
            <Icon name="users" size={16} /> تصدير العملاء
          </button>
          <button className="btn btn-outline" onClick={() => exportAll('products')}>
            <Icon name="box" size={16} /> تصدير المنتجات
          </button>
          <button className="btn btn-outline" onClick={() => exportAll('sales')}>
            <Icon name="cart" size={16} /> تصدير المبيعات والأقساط
          </button>
        </div>
      </div>

      <div className="card card-pad" style={{ marginBottom: 18 }}>
        <div className="section-title">
          <Icon name="settings" size={18} /> عن البرنامج
        </div>
        <p className="muted">
          «اقساط» — تطبيق إدارة البيع بالتقسيط للأجهزة الكهربائية والمنزلية — الإصدار 1.0.0
        </p>
        <p className="muted" style={{ marginTop: 6 }}>
          يعمل بالكامل بدون إنترنت، وتُحفظ جميع البيانات محلياً على جهازك.
        </p>
      </div>

      <div className="card card-pad">
        <div className="section-title">
          <Icon name="user" size={18} /> المبرمج والتواصل
        </div>
        <div className="dev-info">
          <div className="dev-line dev-name">
            <Icon name="user" size={16} /> م. أحمد الفولي
          </div>
          <a href="tel:01070276039">
            <Icon name="phone" size={16} /> موبايل: 01070276039
          </a>
          <a href="https://wa.me/201284537045" target="_blank" rel="noreferrer">
            <Icon name="chat" size={16} /> واتساب: 01284537045
          </a>
          <a href="mailto:ahmedfouly08@gmail.com">
            <Icon name="mail" size={16} /> البريد: ahmedfouly08@gmail.com
          </a>
        </div>
      </div>
    </div>
  )
}
