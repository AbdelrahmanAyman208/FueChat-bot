import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { removeToast } from '../../features/ui/uiSlice';
import Badge from '../ui/Badge';

const ToastContainer = () => {
  const dispatch = useAppDispatch();
  const toasts = useAppSelector((state) => state.ui.toasts);

  useEffect(() => {
    const timers = toasts.map((toast) =>
      setTimeout(() => dispatch(removeToast(toast.id)), 5000)
    );
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [dispatch, toasts]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-6 top-6 z-50 flex flex-col gap-3">
      {toasts.map((toast) => (
        <div key={toast.id} className="card-surface px-4 py-3 min-w-[240px]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{toast.title}</p>
              {toast.description && <p className="text-xs text-muted mt-1">{toast.description}</p>}
            </div>
            <Badge label={toast.variant ?? 'info'} variant={toast.variant ?? 'info'} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
