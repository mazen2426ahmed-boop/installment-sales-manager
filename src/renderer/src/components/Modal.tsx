import React, { useEffect } from 'react'
import Icon from './Icon'

interface Props {
  title: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  large?: boolean
}

export default function Modal({ title, onClose, children, footer, large }: Props): React.JSX.Element {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        className={`modal ${large ? 'lg' : ''}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="btn-ghost btn" onClick={onClose} aria-label="إغلاق">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}
