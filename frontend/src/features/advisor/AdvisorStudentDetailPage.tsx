import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  fetchStudentDetail,
  fetchAllCourses,
  enrollStudentCourse,
  updateStudentCourseStatus,
  clearSelectedStudent,
  clearActionStatus,
} from './advisorSlice';
import { addToast } from '../ui/uiSlice';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import PageShell from '../../components/common/PageShell';
import Progress from '../../components/ui/Progress';
import { ArrowLeft } from 'lucide-react';

const STATUS_OPTIONS = ['completed', 'in_progress', 'planned', 'failed'];

const AdvisorStudentDetailPage = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { selectedStudent, allCourses, detailStatus, actionStatus, error } = useAppSelector((s) => s.advisor);

  const [enrollCode, setEnrollCode] = useState('');
  const [enrollStatus, setEnrollStatus] = useState('planned');
  const [editingCourse, setEditingCourse] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    if (studentId) {
      dispatch(fetchStudentDetail(Number(studentId)));
      dispatch(fetchAllCourses());
    }
    return () => { dispatch(clearSelectedStudent()); };
  }, [dispatch, studentId]);

  // Refresh after successful action
  useEffect(() => {
    if (actionStatus === 'success' && studentId) {
      dispatch(addToast({ title: 'Success', description: 'Course updated successfully.', variant: 'success' }));
      dispatch(fetchStudentDetail(Number(studentId)));
      dispatch(clearActionStatus());
      setEditingCourse(null);
      setEnrollCode('');
    }
    if (actionStatus === 'error' && error) {
      dispatch(addToast({ title: 'Error', description: error, variant: 'danger' }));
      dispatch(clearActionStatus());
    }
  }, [actionStatus, error, studentId, dispatch]);

  const handleEnroll = () => {
    if (!enrollCode.trim() || !studentId) return;
    dispatch(enrollStudentCourse({ studentId: Number(studentId), courseCode: enrollCode.trim(), status: enrollStatus }));
  };

  const handleUpdateStatus = (courseCode: string) => {
    if (!studentId || !newStatus) return;
    dispatch(updateStudentCourseStatus({ studentId: Number(studentId), courseCode, status: newStatus }));
  };

  if (detailStatus === 'loading') {
    return (
      <PageShell title="Student Details" subtitle="Loading..." className="page-advisor-detail" contentClassName="max-w-[88rem]">
        <Card className="p-6"><p className="text-sm text-muted">Loading student details...</p></Card>
      </PageShell>
    );
  }

  if (!selectedStudent) {
    return (
      <PageShell title="Student Details" subtitle="" className="page-advisor-detail" contentClassName="max-w-[88rem]">
        <Card className="p-6"><p className="text-sm text-muted">Student not found or not assigned to you.</p></Card>
      </PageShell>
    );
  }

  const { student, courses } = selectedStudent;
  const allStudentCourses = [
    ...(courses.completed || []).map((c) => ({ ...c, statusLabel: 'Completed' })),
    ...(courses.in_progress || []).map((c) => ({ ...c, statusLabel: 'In Progress' })),
    ...(courses.planned || []).map((c) => ({ ...c, statusLabel: 'Planned' })),
    ...((courses as any).failed || []).map((c: any) => ({ ...c, statusLabel: 'Failed' })),
  ];

  const progressPercent = student.credits_needed
    ? Math.round((student.credits_earned / student.credits_needed) * 100)
    : Math.round((student.credits_earned / 140) * 100);

  const enrolledCodes = allStudentCourses.map((c) => c.code.toUpperCase());
  const availableCourses = allCourses.filter((c) => !enrolledCodes.includes(c.code.toUpperCase()));

  return (
    <PageShell
      title={`${student.first_name} ${student.last_name}`}
      subtitle={`${student.university_id} · ${student.email} · ${student.major || 'CS'} · GPA ${parseFloat(String(student.gpa)).toFixed(2)}`}
      className="page-advisor-detail"
      contentClassName="max-w-[88rem]"
      actions={
        <Button variant="secondary" onClick={() => navigate('/advisor/students')}>
          <ArrowLeft size={16} className="mr-1 inline" /> Back to Students
        </Button>
      }
    >
      {/* Summary Row */}
      <Card className="space-y-4 p-5 sm:p-8">
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <p className="text-xs text-muted">GPA</p>
            <p className="text-2xl font-bold">{parseFloat(String(student.gpa)).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Credits Earned</p>
            <p className="text-2xl font-bold">{student.credits_earned}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Credits Remaining</p>
            <p className="text-2xl font-bold">{student.credits_remaining}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Total Required</p>
            <p className="text-2xl font-bold">{student.credits_needed || 140}</p>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-sm text-muted">Overall progress</p>
          <Progress value={progressPercent} />
        </div>
      </Card>

      {/* Add Course Section */}
      <Card className="space-y-4 p-5 sm:p-8">
        <h2 className="text-lg font-semibold">Add Course to Student</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-xs text-muted">Course</label>
            <select
              value={enrollCode}
              onChange={(e) => setEnrollCode(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
            >
              <option value="">Select a course...</option>
              {availableCourses.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name} ({c.credits} CH)
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[140px]">
            <label className="mb-1 block text-xs text-muted">Status</label>
            <select
              value={enrollStatus}
              onChange={(e) => setEnrollStatus(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <Button onClick={handleEnroll} isLoading={actionStatus === 'loading'} className="whitespace-nowrap">
            Add Course
          </Button>
        </div>
      </Card>

      {/* Course Table */}
      <Card className="overflow-hidden p-0">
        <div className="border-b border-[var(--border)] px-6 py-4">
          <h2 className="text-lg font-semibold">Enrolled Courses ({allStudentCourses.length})</h2>
        </div>

        {/* Table Header */}
        <div className="hidden gap-4 border-b border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted md:grid md:grid-cols-12">
          <div className="col-span-2">Code</div>
          <div className="col-span-3">Name</div>
          <div className="col-span-1 text-center">Credits</div>
          <div className="col-span-2">Semester</div>
          <div className="col-span-2 text-center">Status</div>
          <div className="col-span-2 text-center">Actions</div>
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-[var(--border)]">
          {allStudentCourses.map((course) => {
            const isEditing = editingCourse === course.code;
            const badgeVariant: 'success' | 'warning' | 'danger' | 'pending' =
              course.status === 'completed' ? 'success'
                : course.status === 'in_progress' ? 'warning'
                  : course.status === 'failed' ? 'danger'
                    : 'pending';

            return (
              <div
                key={course.code}
                className="flex flex-wrap items-center gap-3 px-6 py-3 transition-colors hover:bg-[rgba(255,255,255,0.02)] md:grid md:grid-cols-12 md:gap-4"
              >
                <div className="col-span-2 font-mono text-sm font-semibold">{course.code}</div>
                <div className="col-span-3 text-sm">{course.name}</div>
                <div className="col-span-1 text-center text-sm">{course.credits}</div>
                <div className="col-span-2 text-sm text-muted">{course.semester || '—'}</div>
                <div className="col-span-2 text-center">
                  {isEditing ? (
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="rounded border border-[var(--border)] bg-[var(--panel)] px-2 py-1 text-xs text-[var(--text)] outline-none"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s.replace('_', ' ')}</option>
                      ))}
                    </select>
                  ) : (
                    <Badge label={course.statusLabel} variant={badgeVariant} />
                  )}
                </div>
                <div className="col-span-2 flex justify-center gap-2">
                  {isEditing ? (
                    <>
                      <Button
                        onClick={() => handleUpdateStatus(course.code)}
                        className="px-3 py-1 text-xs"
                        isLoading={actionStatus === 'loading'}
                      >
                        Save
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => setEditingCourse(null)}
                        className="px-3 py-1 text-xs"
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="secondary"
                      onClick={() => { setEditingCourse(course.code); setNewStatus(course.status); }}
                      className="px-3 py-1 text-xs"
                    >
                      Edit Status
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </PageShell>
  );
};

export default AdvisorStudentDetailPage;
