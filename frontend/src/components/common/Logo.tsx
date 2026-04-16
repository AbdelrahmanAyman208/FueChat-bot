const Logo = ({ className = '' }: { className?: string }) => (
  <div className={`flex items-center gap-3 ${className}`}>
    <div className="grid h-9 w-9 place-items-center rounded-2xl border border-[var(--border)] bg-white shadow-soft sm:h-10 sm:w-10">
      <img src="/logo.svg" alt="FueBot" className="h-6 w-6" />
    </div>
    <div>
      <p className="hidden text-xs uppercase tracking-[0.26em] text-muted sm:block">FueBot</p>
      <p className="text-sm font-semibold text-[var(--accent)] sm:text-base">Academic Advising</p>
    </div>
  </div>
);

export default Logo;
