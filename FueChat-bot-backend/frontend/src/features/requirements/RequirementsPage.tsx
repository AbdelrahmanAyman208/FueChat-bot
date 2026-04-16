import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { fetchRequirements } from './requirementsSlice';
import Card from '../../components/ui/Card';
import Progress from '../../components/ui/Progress';
import Badge from '../../components/ui/Badge';
import PageShell from '../../components/common/PageShell';

const RequirementsPage = () => {
  const dispatch = useAppDispatch();
  const { data, status, error } = useAppSelector((state) => state.requirements);

  useEffect(() => {
    if (!data) {
      dispatch(fetchRequirements());
    }
  }, [dispatch, data]);

  const progress = data ? Math.round((data.completedCredits / data.totalCreditsRequired) * 100) : 0;
  const progressVariant: 'success' | 'warning' | 'danger' = progress >= 90 ? 'success' : progress >= 70 ? 'warning' : 'danger';

  return (
    <PageShell
      title="Graduation Requirements"
      subtitle="Track credit completion and requirement status."
      className="page-requirements"
      contentClassName="max-w-[88rem]"
      actions={<Badge label={`${progress}% complete`} variant={progressVariant} />}
    >
      {!data ? (
        <Card className="p-5 sm:p-8">
          <p className="text-sm text-muted">Loading requirements...</p>
        </Card>
      ) : (
        <>
          <Card className="space-y-6 p-5 sm:p-8">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-xs text-muted">Total required</p>
                <p className="text-2xl font-semibold">{data.totalCreditsRequired} credits</p>
              </div>
              <div>
                <p className="text-xs text-muted">Completed</p>
                <p className="text-2xl font-semibold">{data.completedCredits} credits</p>
              </div>
              <div>
                <p className="text-xs text-muted">Remaining</p>
                <p className="text-2xl font-semibold">{data.remainingCredits} credits</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted">Overall progress</p>
              <Progress value={progress} />
            </div>
          </Card>

          {status === 'loading' && <p className="text-sm text-muted">Loading requirement checklist...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            <Card className="space-y-4 p-4 sm:p-6 lg:min-h-[430px] lg:p-7">
              <h2 className="text-lg font-semibold">Core Requirements</h2>
              {data.coreRequirements.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-3 border-b border-[var(--border)] pb-3">
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-sm text-muted">{item.description}</p>
                  </div>
                  <Badge label={item.status === 'completed' ? 'Completed' : 'Pending'} variant={item.status} />
                </div>
              ))}
            </Card>
            <Card className="space-y-4 p-4 sm:p-6 lg:min-h-[430px] lg:p-7">
              <h2 className="text-lg font-semibold">Electives</h2>
              {data.electives.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-3 border-b border-[var(--border)] pb-3">
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-sm text-muted">{item.description}</p>
                  </div>
                  <Badge label={item.status === 'completed' ? 'Completed' : 'Pending'} variant={item.status} />
                </div>
              ))}
            </Card>
          </div>
        </>
      )}
    </PageShell>
  );
};

export default RequirementsPage;
