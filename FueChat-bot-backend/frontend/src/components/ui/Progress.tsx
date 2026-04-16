interface ProgressProps {
  value: number;
}

const Progress = ({ value }: ProgressProps) => {
  const clamped = Math.min(100, Math.max(0, value));
  const barColor = clamped >= 90 ? 'var(--success)' : clamped >= 70 ? 'var(--warning)' : 'var(--danger)';

  return (
    <div className="h-3 w-full rounded-full bg-[var(--panel-soft)] border border-[var(--border)] overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${clamped}%`, background: barColor }}
      />
    </div>
  );
};

export default Progress;
