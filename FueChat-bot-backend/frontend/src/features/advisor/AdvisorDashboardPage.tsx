import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { fetchAssignedStudents, searchGlobalStudents, clearSearchResults } from './advisorSlice';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import PageShell from '../../components/common/PageShell';
import { Users, BookOpen, TrendingUp, GraduationCap, Search, X } from 'lucide-react';

const AdvisorDashboardPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { students, searchResults, status } = useAppSelector((state) => state.advisor);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    dispatch(fetchAssignedStudents());
  }, [dispatch]);

  useEffect(() => {
    if (searchQuery.trim().length >= 3) {
      const timer = setTimeout(() => {
        setIsSearching(true);
        dispatch(searchGlobalStudents(searchQuery)).finally(() => setIsSearching(false));
      }, 500);
      return () => clearTimeout(timer);
    } else if (searchQuery.trim().length === 0) {
      dispatch(clearSearchResults());
    }
  }, [searchQuery, dispatch]);

  const getGpaVariant = (gpa: number): 'success' | 'warning' | 'danger' => {
    if (gpa >= 3.0) return 'success';
    if (gpa >= 2.0) return 'warning';
    return 'danger';
  };

  const getProgressPercent = (credits: number) => Math.min(100, Math.round((credits / 140) * 100));

  const displayStudents = searchQuery.trim().length >= 3 ? searchResults : students;

  return (
    <PageShell
      title="Advisor Dashboard"
      subtitle="View and manage your assigned students' academic progress."
      className="page-advisor"
      contentClassName="max-w-[88rem]"
      actions={
        <Badge label={`${students.length} students`} variant="pending" />
      }
    >
      {status === 'loading' && (
        <Card className="p-6">
          <p className="text-sm text-muted">Loading students...</p>
        </Card>
      )}

      {status === 'idle' && students.length === 0 && (
        <Card className="p-6">
          <p className="text-sm text-muted">No students assigned to you yet.</p>
        </Card>
      )}

      {students.length > 0 && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="flex items-center gap-4 p-5">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-[rgba(180,35,24,0.18)] text-[var(--accent)]">
                <Users size={22} />
              </div>
              <div>
                <p className="text-xs text-muted">Total Students</p>
                <p className="text-2xl font-bold">{students.length}</p>
              </div>
            </Card>
            <Card className="flex items-center gap-4 p-5">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-[rgba(34,197,94,0.15)] text-green-400">
                <GraduationCap size={22} />
              </div>
              <div>
                <p className="text-xs text-muted">Avg GPA</p>
                <p className="text-2xl font-bold">
                  {(students.reduce((s, st) => s + parseFloat(String(st.gpa)), 0) / students.length).toFixed(2)}
                </p>
              </div>
            </Card>
            <Card className="flex items-center gap-4 p-5">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-[rgba(59,130,246,0.15)] text-blue-400">
                <BookOpen size={22} />
              </div>
              <div>
                <p className="text-xs text-muted">Avg Completed</p>
                <p className="text-2xl font-bold">
                  {Math.round(students.reduce((s, st) => s + Number(st.completed_courses || 0), 0) / students.length)} courses
                </p>
              </div>
            </Card>
            <Card className="flex items-center gap-4 p-5">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-[rgba(234,179,8,0.15)] text-yellow-400">
                <TrendingUp size={22} />
              </div>
              <div>
                <p className="text-xs text-muted">In Progress</p>
                <p className="text-2xl font-bold">
                  {students.reduce((s, st) => s + Number(st.in_progress_courses || 0), 0)} courses
                </p>
              </div>
            </Card>
          </div>

        {/* Search Bar */}
        <Card className="p-4 sm:p-6 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <input
              type="text"
              placeholder="Search all students by name, email, or FUE ID (e.g., FUE-CS-001)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel)] py-3 pl-10 pr-10 text-sm outline-none transition-colors focus:border-[var(--accent)]"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-[var(--text)]">
                <X size={18} />
              </button>
            )}
          </div>
          {isSearching && <p className="mt-2 text-xs text-muted">Searching...</p>}
        </Card>

        {/* Student List */}
        <Card className="overflow-hidden p-0">
          <div className="border-b border-[var(--border)] px-6 py-4">
            <h2 className="text-lg font-semibold">
              {searchQuery.trim().length >= 3 ? `Search Results (${searchResults.length})` : `Assigned Students (${students.length})`}
            </h2>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {displayStudents.map((student) => (
              <div
                key={student.student_id}
                onClick={() => navigate(`/advisor/students/${student.student_id}`)}
                className="flex cursor-pointer flex-wrap items-center gap-4 px-6 py-4 transition-colors hover:bg-[rgba(255,255,255,0.03)]"
              >
                <div className="grid h-10 w-10 place-items-center rounded-full bg-[rgba(180,35,24,0.2)] text-sm font-bold text-[var(--accent)]">
                  {student.first_name?.[0]}{student.last_name?.[0]}
                </div>
                <div className="flex-1 min-w-[180px]">
                  <p className="font-semibold">{student.first_name} {student.last_name}</p>
                  <p className="text-xs text-muted">{student.email}</p>
                </div>
                <div className="text-center min-w-[100px]">
                  <p className="text-xs text-muted">University ID</p>
                  <p className="text-sm font-mono text-[var(--accent)]">{student.university_id}</p>
                </div>
                <div className="text-center min-w-[80px]">
                  <p className="text-xs text-muted">Major</p>
                  <p className="text-sm font-semibold">{student.major || 'CS'}</p>
                </div>
                <div className="text-center min-w-[60px]">
                  <Badge label={`GPA ${parseFloat(String(student.gpa)).toFixed(2)}`} variant={getGpaVariant(parseFloat(String(student.gpa)))} />
                </div>
                <div className="text-center min-w-[100px]">
                  <p className="text-xs text-muted">Credits</p>
                  <p className="text-sm font-semibold">{student.credits_earned} / 140</p>
                </div>
                <div className="text-center min-w-[80px]">
                  <div className="h-2 w-20 rounded-full bg-[rgba(255,255,255,0.1)]">
                    <div
                      className="h-2 rounded-full bg-[var(--accent)]"
                      style={{ width: `${getProgressPercent(Number(student.credits_earned))}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted">{getProgressPercent(Number(student.credits_earned))}%</p>
                </div>
                <div className="text-right min-w-[24px]">
                  <span className="text-muted">→</span>
                </div>
              </div>
            ))}
            {displayStudents.length === 0 && (
              <div className="p-6 text-center text-sm text-muted">
                No students found.
              </div>
            )}
          </div>
        </Card>
        </>
      )}
    </PageShell>
  );
};

export default AdvisorDashboardPage;
