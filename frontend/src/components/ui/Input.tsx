import { InputHTMLAttributes } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

const Input = ({ label, hint, className, ...props }: InputProps) => {
  return (
    <label className="flex flex-col gap-2 text-sm">
      {label && <span className="text-xs uppercase tracking-wider text-muted">{label}</span>}
      <input
        className={clsx(
          'rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30',
          props.readOnly && 'bg-[var(--panel-soft)] text-muted',
          className
        )}
        {...props}
      />
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
};

export default Input;
