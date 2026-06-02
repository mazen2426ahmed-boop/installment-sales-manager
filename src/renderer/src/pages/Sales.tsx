import React, { useEffect, useMemo, useState } from 'react'
import Icon from '../components/Icon'
import Modal from '../components/Modal'
import { EmptyState, Spinner, StatusBadge } from '../components/ui'
import { useToast } from '../components/Toast'
import { formatDate, formatMoney, todayInput } from '../lib/format'
import { addMonths, buildInstallmentSchedule, computeSalePrice, round2 } from '../../../shared/finance'
import type { Customer, NewSaleInput, Product, SaleWithDetails } from '../../../shared/types'

export default function Sales({ onChanged }: { onChanged: () => void }): React.JSX.Element {
  const { notify } = useToast()
  const [list, setList] = useState<SaleWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [detailsId, setDetailsId] = useState<number | null>(null)

  const load = async (q = ''): Promise<void> => {
    setLoading(true)
    const res = await window.api.listSales(q)
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

  const afterChange = (): void => {
    void load(search)
    onChanged()
  }

  const remove = async (s: SaleWithDetails): Promise<void> => {
    if (!confirm(`حذف عملية بيع "${s.productName}" للعميل ${s.customerName}؟`)) return
    const res = await window.api.deleteSale(s.id)
    if (res.ok) {
      notify('تم حذف عملية البيع', 'success')
      afterChange()
    } else notify(res.error || 'خطأ', 'error')
  }

  return (
    <>
      <div className="page-header">
        <div className="search-box">
          <Icon name="search" size={18} />
          <input placeholder="بحث باسم العميل أو المنتج..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
          <Icon name="plus" size={16} /> عملية بيع جديدة
        </button>
      </div>

      {loading ? (
        <Spinner />
      ) : list.length === 0 ? (
        <div className="table-wrap">
          <EmptyState icon="cart" text="لا توجد مبيعات بعد. سجّل أول عملية بيع بالتقسيط." />
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>العميل</th>
                <th>المنتج</th>
                <th>سعر البيع</th>
                <th>المقدم</th>
                <th>المتبقي</th>
                <th>التقدم</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => {
                const progress = s.financedAmount > 0 ? (s.totalPaid / s.financedAmount) * 100 : 100
                return (
                  <tr key={s.id}>
                    <td className="muted">{formatDate(s.saleDate)}</td>
                    <td style={{ fontWeight: 600 }}>{s.customerName}</td>
                    <td>
                      {s.productName} <span className="chip">{s.brand}</span>
                    </td>
                    <td className="num money">{formatMoney(s.salePrice)}</td>
                    <td className="num money">{formatMoney(s.downPayment)}</td>
                    <td className="num money" style={{ color: s.totalRemaining > 0 ? 'var(--danger)' : 'var(--success)' }}>
                      {formatMoney(s.totalRemaining)}
                    </td>
                    <td style={{ minWidth: 120 }}>
                      <div className="progress">
                        <span style={{ width: `${Math.min(100, progress)}%` }} />
                      </div>
                      <small className="muted">{Math.round(progress)}%</small>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => setDetailsId(s.id)} title="التفاصيل والأقساط">
                          <Icon name="eye" size={16} />
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => remove(s)}>
                          <Icon name="trash" size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showNew && (
        <NewSaleModal
          onClose={() => setShowNew(false)}
          onSaved={() => {
            setShowNew(false)
            afterChange()
            notify('تم تسجيل عملية البيع وتوليد الأقساط', 'success')
          }}
        />
      )}

      {detailsId !== null && (
        <SaleDetailsModal id={detailsId} onClose={() => setDetailsId(null)} onChanged={afterChange} />
      )}
    </>
  )
}

/* ============================ نافذة بيع جديد ============================ */
function NewSaleModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }): React.JSX.Element {
  const { notify } = useToast()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState<NewSaleInput>({
    customerId: 0,
    productId: null,
    productName: '',
    brand: '',
    quantity: 1,
    purchasePrice: 0,
    profitMargin: 35,
    downPayment: 0,
    installmentsCount: 12,
    saleDate: todayInput(),
    firstInstallmentDate: addMonths(todayInput(), 1),
    notes: ''
  })

  useEffect(() => {
    void (async () => {
      const [c, p] = await Promise.all([window.api.listCustomers(), window.api.listProducts()])
      if (c.ok && c.data) setCustomers(c.data)
      if (p.ok && p.data) setProducts(p.data)
    })()
  }, [])

  // عند تغيير تاريخ البيع، اضبط تاريخ أول قسط للشهر التالي تلقائياً
  useEffect(() => {
    setForm((f) => ({ ...f, firstInstallmentDate: addMonths(f.saleDate, 1) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.saleDate])

  const salePrice = useMemo(
    () => computeSalePrice(form.purchasePrice, form.quantity, form.profitMargin),
    [form.purchasePrice, form.quantity, form.profitMargin]
  )
  const financed = round2(salePrice - form.downPayment)
  const profit = round2(salePrice - form.purchasePrice * form.quantity)
  const schedule = useMemo(
    () => (financed >= 0 ? buildInstallmentSchedule(financed, form.installmentsCount, form.firstInstallmentDate) : []),
    [financed, form.installmentsCount, form.firstInstallmentDate]
  )

  const onPickProduct = (id: string): void => {
    const pid = id ? Number(id) : null
    const p = products.find((x) => x.id === pid)
    setForm((f) => ({
      ...f,
      productId: pid,
      productName: p ? p.name : f.productName,
      brand: p ? p.brand : f.brand,
      purchasePrice: p ? p.purchasePrice : f.purchasePrice
    }))
  }

  const submit = async (): Promise<void> => {
    if (!form.customerId) {
      notify('اختر العميل', 'error')
      return
    }
    if (!form.productName.trim()) {
      notify('اسم المنتج مطلوب', 'error')
      return
    }
    if (financed < 0) {
      notify('المقدم أكبر من سعر البيع', 'error')
      return
    }
    if (form.installmentsCount < 1) {
      notify('عدد الأقساط غير صحيح', 'error')
      return
    }
    setSaving(true)
    const res = await window.api.createSale(form)
    setSaving(false)
    if (res.ok) onSaved()
    else notify(res.error || 'خطأ في الحفظ', 'error')
  }

  return (
    <Modal
      title="تسجيل عملية بيع بالتقسيط"
      large
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            <Icon name="check" size={16} /> {saving ? 'جارٍ الحفظ...' : 'حفظ العملية'}
          </button>
          <button className="btn btn-outline" onClick={onClose}>
            إلغاء
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field">
          <label>العميل *</label>
          <select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: Number(e.target.value) })}>
            <option value={0}>— اختر العميل —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.phone ? `— ${c.phone}` : ''}
              </option>
            ))}
          </select>
          {customers.length === 0 && <span className="hint">أضف عملاء أولاً من صفحة العملاء</span>}
        </div>
        <div className="field">
          <label>اختيار من المخزون (اختياري)</label>
          <select value={form.productId ?? ''} onChange={(e) => onPickProduct(e.target.value)}>
            <option value="">— إدخال يدوي —</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.brand ? `(${p.brand})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>اسم المنتج *</label>
          <input value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} />
        </div>
        <div className="field">
          <label>البراند</label>
          <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
        </div>
        <div className="field">
          <label>الكمية</label>
          <input
            type="number"
            min={1}
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: Math.max(1, Number(e.target.value)) })}
          />
        </div>
        <div className="field">
          <label>سعر الشراء (للوحدة)</label>
          <input
            type="number"
            value={form.purchasePrice}
            onChange={(e) => setForm({ ...form, purchasePrice: Number(e.target.value) })}
          />
        </div>
        <div className="field">
          <label>هامش الربح %</label>
          <input
            type="number"
            value={form.profitMargin}
            onChange={(e) => setForm({ ...form, profitMargin: Number(e.target.value) })}
          />
          <span className="hint">المعتاد بين 30٪ و 40٪</span>
        </div>
        <div className="field">
          <label>المقدم</label>
          <input
            type="number"
            value={form.downPayment}
            onChange={(e) => setForm({ ...form, downPayment: Number(e.target.value) })}
          />
        </div>
        <div className="field">
          <label>عدد الأقساط</label>
          <input
            type="number"
            min={1}
            value={form.installmentsCount}
            onChange={(e) => setForm({ ...form, installmentsCount: Math.max(1, Number(e.target.value)) })}
          />
          <span className="hint">افتراضي 12 شهر</span>
        </div>
        <div className="field">
          <label>تاريخ البيع</label>
          <input type="date" value={form.saleDate} onChange={(e) => setForm({ ...form, saleDate: e.target.value })} />
        </div>
        <div className="field">
          <label>تاريخ أول قسط</label>
          <input
            type="date"
            value={form.firstInstallmentDate}
            onChange={(e) => setForm({ ...form, firstInstallmentDate: e.target.value })}
          />
        </div>
        <div className="field full">
          <label>ملاحظات</label>
          <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </div>

      <div className="summary-box" style={{ marginTop: 18 }}>
        <div className="item">
          <div className="k">سعر البيع الإجمالي</div>
          <div className="v money">{formatMoney(salePrice)}</div>
        </div>
        <div className="item">
          <div className="k">الربح المتوقع</div>
          <div className="v money">{formatMoney(profit)}</div>
        </div>
        <div className="item">
          <div className="k">المقدم</div>
          <div className="v money">{formatMoney(form.downPayment)}</div>
        </div>
        <div className="item">
          <div className="k">المبلغ الممول (الأقساط)</div>
          <div className="v money">{formatMoney(financed)}</div>
        </div>
        <div className="item">
          <div className="k">قيمة القسط</div>
          <div className="v money">{formatMoney(schedule[0]?.amount ?? 0)}</div>
        </div>
      </div>

      {schedule.length > 0 && (
        <div className="card" style={{ marginTop: 6 }}>
          <div className="card-pad" style={{ paddingBottom: 8 }}>
            <div className="section-title">
              <Icon name="calendar" size={18} /> معاينة جدول الأقساط ({schedule.length})
            </div>
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>القسط</th>
                  <th>القيمة</th>
                  <th>تاريخ الاستحقاق</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((s) => (
                  <tr key={s.number}>
                    <td>القسط {s.number}</td>
                    <td className="num money">{formatMoney(s.amount)}</td>
                    <td>{formatDate(s.dueDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  )
}

/* ============================ نافذة تفاصيل البيع ============================ */
function SaleDetailsModal({
  id,
  onClose,
  onChanged
}: {
  id: number
  onClose: () => void
  onChanged: () => void
}): React.JSX.Element {
  const { notify } = useToast()
  const [sale, setSale] = useState<SaleWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [payFor, setPayFor] = useState<{ instId: number; amount: number; max: number } | null>(null)
  const [payAmount, setPayAmount] = useState(0)
  const [payDate, setPayDate] = useState(todayInput())

  const load = async (): Promise<void> => {
    setLoading(true)
    const res = await window.api.getSaleDetails(id)
    if (res.ok && res.data) setSale(res.data)
    setLoading(false)
  }
  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const payFull = async (instId: number): Promise<void> => {
    const res = await window.api.payInstallmentFull(instId, todayInput())
    if (res.ok) {
      notify('تم سداد القسط بالكامل', 'success')
      await load()
      onChanged()
    } else notify(res.error || 'خطأ', 'error')
  }

  const unpay = async (instId: number): Promise<void> => {
    const res = await window.api.unpayInstallment(instId)
    if (res.ok) {
      notify('تم إلغاء السداد', 'success')
      await load()
      onChanged()
    } else notify(res.error || 'خطأ', 'error')
  }

  const submitPay = async (): Promise<void> => {
    if (!payFor) return
    if (payAmount <= 0) {
      notify('أدخل مبلغاً صحيحاً', 'error')
      return
    }
    const res = await window.api.payInstallment(payFor.instId, payAmount, payDate)
    if (res.ok) {
      notify('تم تسجيل الدفعة', 'success')
      setPayFor(null)
      await load()
      onChanged()
    } else notify(res.error || 'خطأ', 'error')
  }

  return (
    <Modal title="تفاصيل البيع والأقساط" large onClose={onClose}>
      {loading || !sale ? (
        <Spinner />
      ) : (
        <>
          <div className="form-grid" style={{ marginBottom: 12 }}>
            <div className="field">
              <label>العميل</label>
              <div className="row">
                <strong>{sale.customerName}</strong>
                {sale.customerPhone && (
                  <span className="muted row" style={{ gap: 4 }}>
                    <Icon name="phone" size={14} /> {sale.customerPhone}
                  </span>
                )}
              </div>
            </div>
            <div className="field">
              <label>المنتج</label>
              <div>
                {sale.productName} <span className="chip">{sale.brand}</span> × {sale.quantity}
              </div>
            </div>
          </div>

          <div className="summary-box">
            <div className="item">
              <div className="k">سعر البيع</div>
              <div className="v money">{formatMoney(sale.salePrice)}</div>
            </div>
            <div className="item">
              <div className="k">المقدم</div>
              <div className="v money">{formatMoney(sale.downPayment)}</div>
            </div>
            <div className="item">
              <div className="k">المحصّل من الأقساط</div>
              <div className="v money">{formatMoney(sale.totalPaid)}</div>
            </div>
            <div className="item">
              <div className="k">المتبقي</div>
              <div className="v money">{formatMoney(sale.totalRemaining)}</div>
            </div>
          </div>

          <div className="section-title">
            <Icon name="calendar" size={18} /> جدول الأقساط
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>القسط</th>
                  <th>القيمة</th>
                  <th>الاستحقاق</th>
                  <th>المدفوع</th>
                  <th>الحالة</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sale.installments.map((inst) => (
                  <tr key={inst.id}>
                    <td>القسط {inst.number}</td>
                    <td className="num money">{formatMoney(inst.amount)}</td>
                    <td>
                      {formatDate(inst.dueDate)}
                      {inst.status === 'overdue' && (
                        <div>
                          <small style={{ color: 'var(--danger)' }}>متأخر {inst.daysLate} يوم</small>
                        </div>
                      )}
                    </td>
                    <td className="num money">{formatMoney(inst.paidAmount)}</td>
                    <td>
                      <StatusBadge status={inst.status} />
                    </td>
                    <td>
                      <div className="table-actions">
                        {inst.status === 'paid' ? (
                          <button className="btn btn-ghost btn-sm" onClick={() => unpay(inst.id)}>
                            إلغاء السداد
                          </button>
                        ) : (
                          <>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => {
                                setPayFor({ instId: inst.id, amount: inst.amount, max: inst.remaining ?? inst.amount })
                                setPayAmount(round2((inst.remaining ?? inst.amount)))
                                setPayDate(todayInput())
                              }}
                            >
                              <Icon name="money" size={14} /> دفعة
                            </button>
                            <button className="btn btn-primary btn-sm" onClick={() => payFull(inst.id)}>
                              <Icon name="check" size={14} /> سداد
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {payFor && (
            <div className="card card-pad" style={{ marginTop: 14 }}>
              <div className="section-title">
                <Icon name="wallet" size={18} /> تسجيل دفعة جزئية
              </div>
              <div className="form-grid">
                <div className="field">
                  <label>المبلغ (المتبقي {formatMoney(payFor.max)})</label>
                  <input type="number" value={payAmount} onChange={(e) => setPayAmount(Number(e.target.value))} />
                </div>
                <div className="field">
                  <label>تاريخ الدفع</label>
                  <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                </div>
              </div>
              <div className="row" style={{ marginTop: 12 }}>
                <button className="btn btn-primary" onClick={submitPay}>
                  <Icon name="check" size={16} /> تأكيد الدفعة
                </button>
                <button className="btn btn-outline" onClick={() => setPayFor(null)}>
                  إلغاء
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  )
}
