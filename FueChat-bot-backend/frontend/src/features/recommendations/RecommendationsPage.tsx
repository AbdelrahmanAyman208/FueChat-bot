import { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { fetchRecommendations } from './recommendationsSlice';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import PageShell from '../../components/common/PageShell';

const RecommendationsPage = () => {
  const dispatch = useAppDispatch();
  const { items, status, error } = useAppSelector((state) => state.recommendations);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('score');

  useEffect(() => {
    if (items.length === 0) {
      dispatch(fetchRecommendations());
    }
  }, [dispatch, items.length]);

  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    const results = items.filter((item) =>
      [item.code, item.name, item.description].some((value) => value.toLowerCase().includes(query))
    );
    return results.sort((a, b) => {
      if (sort === 'credits') return b.credits - a.credits;
      if (sort === 'semester') return a.semester.localeCompare(b.semester);
      return b.score - a.score;
    });
  }, [items, search, sort]);

  const getScoreVariant = (score: number): 'success' | 'warning' | 'danger' => {
    if (score >= 90) return 'success';
    if (score >= 70) return 'warning';
    return 'danger';
  };

  return (
    <PageShell
      title="Course Recommendations"
      subtitle="Ranked suggestions aligned with your profile and graduation goals."
      className="page-recommendations"
      contentClassName="max-w-[88rem]"
      actions={<Badge label={`${filtered.length} results`} variant="info" />}
    >
      <Card className="grid gap-4 p-4 sm:p-6 md:grid-cols-[1.5fr_1fr]">
        <Input
          label="Search"
          placeholder="Search by code, name, or description"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select
          label="Sort by"
          value={sort}
          onChange={(event) => setSort(event.target.value)}
          options={[
            { value: 'score', label: 'Ranking score' },
            { value: 'credits', label: 'Credits' },
            { value: 'semester', label: 'Semester' }
          ]}
        />
      </Card>

      {status === 'loading' && <p className="text-sm text-muted">Loading recommendations...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((item) => (
          <Card key={item.id} className="space-y-4 p-4 sm:p-6 lg:min-h-[390px] lg:p-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted">{item.code}</p>
                <h2 className="text-lg font-semibold">{item.name}</h2>
              </div>
              <Badge label={`${item.score} / 100`} variant={getScoreVariant(item.score)} />
            </div>
            <p className="text-sm text-muted">{item.description}</p>
            <div className="flex flex-wrap gap-3 text-xs text-muted">
              <span>Credits: {item.credits}</span>
              <span>Semester: {item.semester}</span>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted">Prerequisites</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {item.prerequisites.map((req) => (
                  <Badge key={req} label={req} variant="info" />
                ))}
              </div>
            </div>
            <div className="soft-panel p-3">
              <p className="text-xs uppercase tracking-wider text-muted">Why recommended</p>
              <p className="mt-2 text-sm">{item.reason}</p>
            </div>
          </Card>
        ))}
      </div>
    </PageShell>
  );
};

export default RecommendationsPage;
