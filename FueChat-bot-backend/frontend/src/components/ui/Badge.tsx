import clsx from 'clsx';

interface BadgeProps {
  label: string;
  variant?: 'info' | 'success' | 'warning' | 'danger' | 'completed' | 'pending';
}

const variantStyles: Record<string, string> = {
  info: 'bg-[rgba(255,255,255,0.08)] text-[var(--text)] border-[rgba(255,255,255,0.2)]',
  success: 'bg-[rgba(34,197,94,0.14)] text-[var(--success)] border-[rgba(34,197,94,0.35)]',
  warning: 'bg-[rgba(245,158,11,0.16)] text-[var(--warning)] border-[rgba(245,158,11,0.35)]',
  danger: 'bg-[rgba(239,68,68,0.16)] text-[var(--danger)] border-[rgba(239,68,68,0.36)]',
  completed: 'bg-[rgba(34,197,94,0.14)] text-[var(--success)] border-[rgba(34,197,94,0.35)]',
  pending: 'bg-[rgba(245,158,11,0.16)] text-[var(--warning)] border-[rgba(245,158,11,0.35)]'
};

const Badge = ({ label, variant = 'info' }: BadgeProps) => {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider',
        variantStyles[variant]
      )}
    >
      {label}
    </span>
  );
};

export default Badge;
