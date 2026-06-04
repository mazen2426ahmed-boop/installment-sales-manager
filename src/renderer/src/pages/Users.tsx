import React, { useEffect, useState } from 'react'
import Icon from '../components/Icon'
import Modal from '../components/Modal'
import { EmptyState, Spinner } from '../components/ui'
import { useToast } from '../components/Toast'
import { useApp } from '../context/AppContext'
import { formatDate } from '../lib/format'
import type { User, UserRole } from '../../../shared/types'

const roleLabel = (r: UserRole): string => (r === 'owner' ? 'مالك' : 'بائع')

export default function Users(): React.JSX.Element {
  const { notify } = useToast()
  const { user } = useApp()
  const [list, setList] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState({ username: '', name: '', role: 'seller' as UserRole, password: '' })
  const [pwModal, setPwModal] = useState<User | null>(null)
  const [newPw, setNewPw] = useState('')

  const load = async (): Promise<void> => {
    setLoading(true)
    const res = await window.api.listUsers()
    if (res.ok && res.data) setList(res.data)
    else if (res.error) notify(res.error, 'error')
    setLoading(false)
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openNew = (): void => {
    setEditing(null)
    setForm({ username: '', name: '', role: 'seller', password: '' })
    setShowModal(true)
  }

  const openEdit = (u: User): void => {
    setEditing(u)
    setForm({ username: u.username, name: u.name, role: u.role, password: '' })
    setShowModal(true)
  }

  const save = async (): Promise<void> => {
    if (editing) {
      const res = await window.api.updateUser(editing.id, form.name, form.role)
      if (res.ok) {
        notify('تم تحديث المستخدم', 'success')
        setShowModal(false)
        void load()
      } else notify(res.error || 'خطأ', 'error')
    } else {
      const res = await window.api.createUser({
        username: form.username,
        name: form.name,
        role: form.role,
        password: form.password
      })
      if (res.ok) {
        notify('تم إضافة المستخدم', 'success')
        setShowModal(false)
        void load()
      } else notify(res.error || 'خطأ', 'error')
    }
  }

  const changePw = async (): Promise<void> => {
    if (!pwModal) return
    const res = await window.api.changePassword(pwModal.id, newPw)
    if (res.ok) {
      notify('تم تغيير كلمة المرور', 'success')
      setPwModal(null)
      setNewPw('')
    } else notify(res.error || 'خطأ', 'error')
  }

  const remove = async (u: User): Promise<void> => {
    if (!confirm(`حذف المستخدم "${u.name}"؟`)) return
    const res = await window.api.deleteUser(u.id)
    if (res.ok) {
      notify('تم حذف المستخدم', 'success')
      void load()
    } else notify(res.error || 'خطأ', 'error')
  }

  return (
    <>
      <div className="page-header">
        <p className="muted" style={{ margin: 0 }}>
          أضف حسابات للبائعين وحدّد صلاحياتهم. المالك له صلاحية كاملة، والبائع للعمليات اليومية فقط.
        </p>
        <div className="toolbar">
          <button className="btn btn-primary" onClick={openNew}>
            <Icon name="plus" size={16} /> مستخدم جديد
          </button>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : list.length === 0 ? (
        <div className="table-wrap">
          <EmptyState icon="users" text="لا يوجد مستخدمون." />
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>الاسم</th>
                <th>اسم المستخدم</th>
                <th>الصلاحية</th>
                <th>تاريخ الإضافة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((u, i) => (
                <tr key={u.id}>
                  <td className="muted">{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>
                    {u.name} {u.id === user.id && <span className="chip">أنت</span>}
                  </td>
                  <td className="num">{u.username}</td>
                  <td>
                    <span className={`badge ${u.role === 'owner' ? 'badge-paid' : 'badge-upcoming'}`}>
                      {roleLabel(u.role)}
                    </span>
                  </td>
                  <td className="muted">{formatDate(u.createdAt)}</td>
                  <td>
                    <div className="table-actions">
                      <button className="btn btn-ghost btn-sm" title="تعديل" onClick={() => openEdit(u)}>
                        <Icon name="edit" size={16} />
                      </button>
                      <button className="btn btn-ghost btn-sm" title="كلمة المرور" onClick={() => setPwModal(u)}>
                        <Icon name="key" size={16} />
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        title="حذف"
                        disabled={u.id === user.id}
                        onClick={() => remove(u)}
                      >
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
          title={editing ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}
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
              <label>اسم المستخدم *</label>
              <input
                value={form.username}
                disabled={!!editing}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                autoFocus
              />
            </div>
            <div className="field">
              <label>الاسم الكامل</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field">
              <label>الصلاحية</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
                <option value="seller">بائع</option>
                <option value="owner">مالك</option>
              </select>
            </div>
            {!editing && (
              <div className="field">
                <label>كلمة المرور *</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
            )}
          </div>
        </Modal>
      )}

      {pwModal && (
        <Modal
          title={`تغيير كلمة مرور: ${pwModal.name}`}
          onClose={() => setPwModal(null)}
          footer={
            <>
              <button className="btn btn-primary" onClick={changePw}>
                <Icon name="check" size={16} /> حفظ
              </button>
              <button className="btn btn-outline" onClick={() => setPwModal(null)}>
                إلغاء
              </button>
            </>
          }
        >
          <div className="field">
            <label>كلمة المرور الجديدة</label>
            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} autoFocus />
          </div>
        </Modal>
      )}
    </>
  )
}
