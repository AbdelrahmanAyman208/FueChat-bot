import { ReactNode } from 'react';

interface PageShellProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
}

const PageShell = ({ title, subtitle, actions, className, contentClassName, children }: PageShellProps) => {
  return (
    <section className={`page-root page-accent-default ${className ?? ''}`.trim()}>
      <div className="page-bg" />
      <div className="page-bg page-bg-2" />
      <div className="page-grid" />
      <div className={`relative z-10 mx-auto w-full space-y-6 ${contentClassName ?? 'max-w-5xl'}`.trim()}>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{title}</h1>
            {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </header>
        {children}
      </div>
    </section>
  );
};

export default PageShell;
