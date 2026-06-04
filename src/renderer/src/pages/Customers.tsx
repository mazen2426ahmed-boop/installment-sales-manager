import React, { useEffect, useState } from 'react'
import Icon from '../components/Icon'
import Modal from '../components/Modal'
import { EmptyState, Spinner } from '../components/ui'
import { useToast } from '../components/Toast'
import { useApp } from '../context/AppContext'
import { formatDate } from '../lib/format'
import type { Customer } from '../../../shared/types'

const empty: Omit<Customer, 'id' | 'createdAt'> = {
  name: '',
  phone: '',
  nationalId: '',
  address: '',
  notes: ''
}

export default function Customers(): React.JSX.Element {
  const { notify } = useToast()
  const { readOnly } = useApp()
  const [list, setList] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState(empty)
  const [showModal, setShowModal] = useState(false)

  const load = async (q = ''): Promise<void> => {
    setLoading(true)
    const res = await window.api.listCustomers(q)
    if (res.ok && res.data) setList(res.data)
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    const t = setTimeout(() => void load(search), 250)
    return () => clearTimeout(t)
  }, [search])

  const openNew = (): void => {
    setEditing(null)
    setForm(empty)
    setShowModal(true)
  }

  const openEdit = (c: Customer): void => {
    setEditing(c)
    setForm({ name: c.name, phone: c.phone, nationalId: c.nationalId, address: c.address, notes: c.notes })
    setShowModal(true)
  }

  const save = async (): Promise<void> => {
    if (!form.name.trim()) {
      notify('اسم العميل مطلوب', 'error')
      return
    }
    const res = editing
      ? await window.api.updateCustomer({ ...editing, ...form })
      : await window.api.createCustomer(form)
    if (res.ok) {
      notify(editing ? 'تم تحديث بيانات العميل' : 'تم إضافة العميل', 'success')
      setShowModal(false)
      void load(search)
    } else {
      notify(res.error || 'حدث خطأ', 'error')
    }
  }

  const remove = async (c: Customer): Promise<void> => {
    if (!confirm(`حذف العميل "${c.name}"؟ سيتم حذف مبيعاته وأقساطه المرتبطة.`)) return
    const res = await window.api.deleteCustomer(c.id)
    if (res.ok) {
      notify('تم حذف العميل', 'success')
      void load(search)
    } else notify(res.error || 'خطأ', 'error')
  }

  const importExcel = async (): Promise<void> => {
    const res = await window.api.importExcel('customers')
    if (res.ok && res.data) {
      notify(`تم استيراد ${res.data.imported} عميل (تم تجاهل ${res.data.skipped})`, 'success')
      void load()
    } else if (res.ok && res.data === null) {
      /* ألغى المستخدم */
    } else notify(res.error || 'فشل الاستيراد', 'error')
  }

  const exportExcel = async (): Promise<void> => {
    const res = await window.api.exportExcel('customers')
    if (res.ok && res.data) notify('تم تصدير العملاء بنجاح', 'success')
    else if (res.error) notify(res.error, 'error')
  }

  const template = async (): Promise<void> => {
    const res = await window.api.exportTemplate('customers')
    if (res.ok && res.data) notify('تم حفظ قالب الاستيراد', 'success')
  }

  return (
    <>
      <div className="page-header">
        <div className="search-box">
          <Icon name="search" size={18} />
          <input
            placeholder="بحث بالاسم أو الهاتف أو الرقم القومي..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="toolbar">
          <button className="btn btn-outline" onClick={template}>
            <Icon name="file" size={16} /> قالب
          </button>
          <button className="btn btn-outline" onClick={importExcel} disabled={readOnly}>
            <Icon name="upload" size={16} /> استيراد Excel
          </button>
          <button className="btn btn-outline" onClick={exportExcel}>
            <Icon name="download" size={16} /> تصدير Excel
          </button>
          <button className="btn btn-primary" onClick={openNew} disabled={readOnly}>
            <Icon name="plus" size={16} /> عميل جديد
          </button>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : list.length === 0 ? (
        <div className="table-wrap">
          <EmptyState icon="users" text="لا يوجد عملاء بعد. أضف أول عميل أو استورد من Excel." />
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>الاسم</th>
                <th>الهاتف</th>
                <th>الرقم القومي</th>
                <th>العنوان</th>
                <th>تاريخ الإضافة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((c, i) => (
                <tr key={c.id}>
                  <td className="muted">{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td className="num">{c.phone || '—'}</td>
                  <td className="num">{c.nationalId || '—'}</td>
                  <td className="muted">{c.address || '—'}</td>
                  <td className="muted">{formatDate(c.createdAt)}</td>
                  <td>
                    <div className="table-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)} disabled={readOnly}>
                        <Icon name="edit" size={16} />
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => remove(c)} disabled={readOnly}>
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal
          title={editing ? 'تعديل بيانات عميل' : 'إضافة عميل جديد'}
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-primary" onClick={save}>
                <Icon name="check" size={16} /> حفظ
              </button>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>
                إلغاء
              </button>
            </>
          }
        >
          <div className="form-grid">
            <div className="field">
              <label>الاسم *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
            </div>
            <div className="field">
              <label>رقم الهاتف</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="field">
              <label>الرقم القومي</label>
              <input value={form.nationalId} onChange={(e) => setForm({ ...form, nationalId: e.target.value })} />
            </div>
            <div className="field">
              <label>العنوان</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="field full">
              <label>ملاحظات</label>
              <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
