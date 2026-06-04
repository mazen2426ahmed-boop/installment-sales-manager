import React from 'react'
import Icon, { IconName } from './Icon'
import { statusClass, statusLabel } from '../lib/format'
import type { InstallmentStatus } from '../../../shared/types'

export function StatusBadge({ status }: { status?: InstallmentStatus }): React.JSX.Element {
  return <span className={`badge-status ${statusClass(status)}`}>{statusLabel(status)}</span>
}

export function Spinner(): React.JSX.Element {
  return (
    <div className="center">
      <div className="spinner" />
    </div>
  )
}

export function EmptyState({
  icon = 'box',
  text
}: {
  icon?: IconName
  text: string
}): React.JSX.Element {
  return (
    <div className="empty">
      <Icon name={icon} size={48} />
      <p>{text}</p>
    </div>
  )
}

export function StatCard({
  icon,
  label,
  value,
  color,
  suffix
}: {
  icon: IconName
  label: string
  value: string
  color: string
  suffix?: string
}): React.JSX.Element {
  return (
    <div className="stat">
      <div className="stat-icon" style={{ background: color }}>
        <Icon name={icon} size={24} />
      </div>
      <div className="stat-info">
        <div className="label">{label}</div>
        <div className="value">
          {value}
          {suffix && <small> {suffix}</small>}
        </div>
      </div>
    </div>
  )
}
