import { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  isLoading?: boolean;
}

const Button = ({
  variant = 'primary',
  isLoading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) => {
  return (
    <button
      className={clsx(
        'rounded-xl px-4 py-3 text-sm font-semibold transition duration-200 btn-animate',
        variant === 'primary' &&
          'bg-[var(--accent)] text-white shadow-soft hover:opacity-90 disabled:opacity-70',
        variant === 'secondary' &&
          'border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--accent)]',
        variant === 'ghost' && 'text-[var(--accent)] hover:bg-[var(--panel-soft)]',
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? 'Loading...' : children}
    </button>
  );
};

export default Button;
