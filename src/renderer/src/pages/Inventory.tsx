import React, { useEffect, useState } from 'react'
import Icon from '../components/Icon'
import Modal from '../components/Modal'
import { EmptyState, Spinner } from '../components/ui'
import { useToast } from '../components/Toast'
import { useApp } from '../context/AppContext'
import { formatMoney } from '../lib/format'
import type { Product, Supplier } from '../../../shared/types'

const emptyProduct: Omit<Product, 'id' | 'createdAt'> = {
  name: '',
  category: '',
  brand: '',
  supplierId: null,
  purchasePrice: 0,
  stock: 0,
  notes: ''
}

const emptySupplier: Omit<Supplier, 'id' | 'createdAt'> = { name: '', phone: '', notes: '' }

export default function Inventory(): React.JSX.Element {
  const { notify } = useToast()
  const [tab, setTab] = useState<'products' | 'suppliers'>('products')

  return (
    <>
      <div className="tabs">
        <button className={`tab ${tab === 'products' ? 'active' : ''}`} onClick={() => setTab('products')}>
          المنتجات
        </button>
        <button className={`tab ${tab === 'suppliers' ? 'active' : ''}`} onClick={() => setTab('suppliers')}>
          الموردون
        </button>
      </div>
      {tab === 'products' ? <Products notify={notify} /> : <Suppliers notify={notify} />}
    </>
  )
}

type Notify = (m: string, k?: 'success' | 'error' | 'info') => void

function Products({ notify }: { notify: Notify }): React.JSX.Element {
  const { readOnly } = useApp()
  const [list, setList] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState(emptyProduct)
  const [show, setShow] = useState(false)

  const load = async (q = ''): Promise<void> => {
    setLoading(true)
    const [p, s] = await Promise.all([window.api.listProducts(q), window.api.listSuppliers()])
    if (p.ok && p.data) setList(p.data)
    if (s.ok && s.data) setSuppliers(s.data)
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
    setForm(emptyProduct)
    setShow(true)
  }
  const openEdit = (p: Product): void => {
    setEditing(p)
    setForm({
      name: p.name,
      category: p.category,
      brand: p.brand,
      supplierId: p.supplierId,
      purchasePrice: p.purchasePrice,
      stock: p.stock,
      notes: p.notes
    })
    setShow(true)
  }

  const save = async (): Promise<void> => {
    if (!form.name.trim()) {
      notify('اسم المنتج مطلوب', 'error')
      return
    }
    const res = editing
      ? await window.api.updateProduct({ ...editing, ...form })
      : await window.api.createProduct(form)
    if (res.ok) {
      notify(editing ? 'تم تحديث المنتج' : 'تم إضافة المنتج', 'success')
      setShow(false)
      void load(search)
    } else notify(res.error || 'خطأ', 'error')
  }

  const remove = async (p: Product): Promise<void> => {
    if (!confirm(`حذف المنتج "${p.name}"؟`)) return
    const res = await window.api.deleteProduct(p.id)
    if (res.ok) {
      notify('تم الحذف', 'success')
      void load(search)
    } else notify(res.error || 'خطأ', 'error')
  }

  const importExcel = async (): Promise<void> => {
    const res = await window.api.importExcel('products')
    if (res.ok && res.data) {
      notify(`تم استيراد ${res.data.imported} منتج`, 'success')
      void load()
    } else if (res.error) notify(res.error, 'error')
  }
  const exportExcel = async (): Promise<void> => {
    const res = await window.api.exportExcel('products')
    if (res.ok && res.data) notify('تم التصدير', 'success')
    else if (res.error) notify(res.error, 'error')
  }
  const template = async (): Promise<void> => {
    const res = await window.api.exportTemplate('products')
    if (res.ok && res.data) notify('تم حفظ القالب', 'success')
  }

  return (
    <>
      <div className="page-header">
        <div className="search-box">
          <Icon name="search" size={18} />
          <input placeholder="بحث بالاسم أو البراند أو الفئة..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="toolbar">
          <button className="btn btn-outline" onClick={template}>
            <Icon name="file" size={16} /> قالب
          </button>
          <button className="btn btn-outline" onClick={importExcel} disabled={readOnly}>
            <Icon name="upload" size={16} /> استيراد
          </button>
          <button className="btn btn-outline" onClick={exportExcel}>
            <Icon name="download" size={16} /> تصدير
          </button>
          <button className="btn btn-primary" onClick={openNew} disabled={readOnly}>
            <Icon name="plus" size={16} /> منتج جديد
          </button>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : list.length === 0 ? (
        <div className="table-wrap">
          <EmptyState icon="box" text="لا توجد منتجات. أضف منتجاً أو استورد من Excel." />
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>المنتج</th>
                <th>الفئة</th>
                <th>البراند</th>
                <th>سعر الشراء</th>
                <th>المخزون</th>
                <th>المورد</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td>{p.category || '—'}</td>
                  <td>
                    <span className="chip">{p.brand || '—'}</span>
                  </td>
                  <td className="num money">{formatMoney(p.purchasePrice)}</td>
                  <td className="num">{p.stock}</td>
                  <td className="muted">{suppliers.find((s) => s.id === p.supplierId)?.name || '—'}</td>
                  <td>
                    <div className="table-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)} disabled={readOnly}>
                        <Icon name="edit" size={16} />
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => remove(p)} disabled={readOnly}>
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

      {show && (
        <Modal
          title={editing ? 'تعديل منتج' : 'إضافة منتج'}
          onClose={() => setShow(false)}
          footer={
            <>
              <button className="btn btn-primary" onClick={save}>
                <Icon name="check" size={16} /> حفظ
              </button>
              <button className="btn btn-outline" onClick={() => setShow(false)}>
                إلغاء
              </button>
            </>
          }
        >
          <div className="form-grid">
            <div className="field">
              <label>اسم المنتج *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
            </div>
            <div className="field">
              <label>الفئة</label>
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="موبايلات، غسالات، ثلاجات..."
              />
            </div>
            <div className="field">
              <label>البراند</label>
              <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
            </div>
            <div className="field">
              <label>المورد</label>
              <select
                value={form.supplierId ?? ''}
                onChange={(e) => setForm({ ...form, supplierId: e.target.value ? Number(e.target.value) : null })}
              >
                <option value="">— بدون —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>سعر الشراء</label>
              <input
                type="number"
                value={form.purchasePrice}
                onChange={(e) => setForm({ ...form, purchasePrice: Number(e.target.value) })}
              />
            </div>
            <div className="field">
              <label>المخزون</label>
              <input
                type="number"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
              />
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

function Suppliers({ notify }: { notify: Notify }): React.JSX.Element {
  const { readOnly } = useApp()
  const [list, setList] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [form, setForm] = useState(emptySupplier)
  const [show, setShow] = useState(false)

  const load = async (): Promise<void> => {
    setLoading(true)
    const res = await window.api.listSuppliers()
    if (res.ok && res.data) setList(res.data)
    setLoading(false)
  }
  useEffect(() => {
    void load()
  }, [])

  const openNew = (): void => {
    setEditing(null)
    setForm(emptySupplier)
    setShow(true)
  }
  const openEdit = (s: Supplier): void => {
    setEditing(s)
    setForm({ name: s.name, phone: s.phone, notes: s.notes })
    setShow(true)
  }
  const save = async (): Promise<void> => {
    if (!form.name.trim()) {
      notify('اسم المورد مطلوب', 'error')
      return
    }
    const res = editing
      ? await window.api.updateSupplier({ ...editing, ...form })
      : await window.api.createSupplier(form)
    if (res.ok) {
      notify('تم الحفظ', 'success')
      setShow(false)
      void load()
    } else notify(res.error || 'خطأ', 'error')
  }
  const remove = async (s: Supplier): Promise<void> => {
    if (!confirm(`حذف المورد "${s.name}"؟`)) return
    const res = await window.api.deleteSupplier(s.id)
    if (res.ok) {
      notify('تم الحذف', 'success')
      void load()
    } else notify(res.error || 'خطأ', 'error')
  }

  return (
    <>
      <div className="page-header">
        <div />
        <button className="btn btn-primary" onClick={openNew} disabled={readOnly}>
          <Icon name="plus" size={16} /> مورد جديد
        </button>
      </div>
      {loading ? (
        <Spinner />
      ) : list.length === 0 ? (
        <div className="table-wrap">
          <EmptyState icon="truck" text="لا يوجد موردون بعد." />
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>اسم المورد</th>
                <th>الهاتف</th>
                <th>ملاحظات</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td className="num">{s.phone || '—'}</td>
                  <td className="muted">{s.notes || '—'}</td>
                  <td>
                    <div className="table-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)} disabled={readOnly}>
                        <Icon name="edit" size={16} />
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => remove(s)} disabled={readOnly}>
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
      {show && (
        <Modal
          title={editing ? 'تعديل مورد' : 'إضافة مورد'}
          onClose={() => setShow(false)}
          footer={
            <>
              <button className="btn btn-primary" onClick={save}>
                <Icon name="check" size={16} /> حفظ
              </button>
              <button className="btn btn-outline" onClick={() => setShow(false)}>
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
              <label>الهاتف</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
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
