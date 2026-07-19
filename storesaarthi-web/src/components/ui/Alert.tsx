import type { HTMLAttributes } from 'react'

type AlertVariant = 'success' | 'error' | 'warning' | 'info'

type AlertProps = HTMLAttributes<HTMLDivElement> & {
  variant?: AlertVariant
}

const styles: Record<AlertVariant, string> = {
  success: 'bg-success-bg text-success border border-success/20',
  error:   'bg-danger-bg text-danger border border-danger/20',
  warning: 'bg-warning-bg text-warning border border-warning/20',
  info:    'bg-primary-soft text-primary border border-primary/20',
}

export function Alert({ variant = 'info', children, className = '', ...props }: AlertProps) {
  return (
    <div
      role="alert"
      {...props}
      className={`flex items-center gap-2 rounded-xl px-4 py-3 font-body text-sm ${styles[variant]} ${className}`}
    >
      {children}
    </div>
  )
}
