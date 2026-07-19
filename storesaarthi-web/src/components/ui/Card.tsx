import type { HTMLAttributes } from 'react'

type CardProps = HTMLAttributes<HTMLDivElement>

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div
      {...props}
      className={`bg-surface rounded-2xl border border-border shadow-card p-5 ${className}`}
    >
      {children}
    </div>
  )
}
