import React from 'react'
import Icon from '../components/Icon'
import { useToast } from '../components/Toast'

export default function Settings(): React.JSX.Element {
  const { notify } = useToast()

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

  const exportAll = async (kind: 'customers' | 'products' | 'sales'): Promise<void> => {
    const res = await window.api.exportExcel(kind)
    if (res.ok && res.data) notify('تم التصدير', 'success')
    else if (res.error) notify(res.error, 'error')
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <div className="card card-pad" style={{ marginBottom: 18 }}>
        <div className="section-title">
          <Icon name="database" size={18} /> النسخ الاحتياطي والاسترجاع
        </div>
        <p className="muted" style={{ marginBottom: 16 }}>
          احتفظ بنسخة من قاعدة البيانات بشكل دوري لحماية بياناتك. يمكنك استرجاعها لاحقاً على نفس الجهاز أو جهاز آخر.
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

      <div className="card card-pad">
        <div className="section-title">
          <Icon name="settings" size={18} /> عن البرنامج
        </div>
        <p className="muted">
          برنامج إدارة البيع بالتقسيط للأجهزة الكهربائية والمنزلية — الإصدار 1.0.0
        </p>
        <p className="muted" style={{ marginTop: 6 }}>
          يعمل بالكامل بدون إنترنت، وتُحفظ جميع البيانات محلياً على جهازك.
        </p>
      </div>
    </div>
  )
}
