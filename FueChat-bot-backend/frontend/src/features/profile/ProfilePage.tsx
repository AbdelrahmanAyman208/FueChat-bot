import { useEffect, useState } from 'react';
import { BookOpen, GraduationCap, Mail, Sparkles, UserRound } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { fetchProfile, updateProfile } from './profileSlice';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { addToast } from '../ui/uiSlice';
import PageShell from '../../components/common/PageShell';

const ProfilePage = () => {
  const dispatch = useAppDispatch();
  const { data, status, error } = useAppSelector((state) => state.profile);
  const [formState, setFormState] = useState(data);

  useEffect(() => {
    if (!data) {
      dispatch(fetchProfile());
    } else {
      setFormState(data);
    }
  }, [data, dispatch]);

  const handleSave = async () => {
    if (!formState) return;
    const result = await dispatch(updateProfile(formState));
    if (updateProfile.fulfilled.match(result)) {
      dispatch(
        addToast({
          title: 'Profile updated',
          description: 'Your preferences and interests have been saved.',
          variant: 'success'
        })
      );
    }
  };

  return (
    <PageShell
      title="Student Profile"
      subtitle="Manage your academic identity and advising preferences."
      className="page-profile"
      contentClassName="max-w-[88rem]"
      actions={
        <>
          <Button variant="secondary">Download profile</Button>
          <Button variant="secondary">Email profile</Button>
        </>
      }
    >
      {!formState ? (
        <Card className="p-6">
          <p className="text-sm text-muted">Loading profile...</p>
        </Card>
      ) : (
        <Card className="space-y-6 p-4 sm:space-y-8 sm:p-8">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-muted">Profile snapshot</p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-5 xl:grid-cols-3 2xl:grid-cols-6">
              {[
                {
                  label: 'Student name',
                  value: formState.name,
                  icon: UserRound
                },
                {
                  label: 'University email',
                  value: formState.email,
                  icon: Mail
                },
                {
                  label: 'Major',
                  value: formState.major,
                  icon: GraduationCap
                },
                {
                  label: 'GPA',
                  value: formState.gpa.toFixed(2),
                  icon: Sparkles
                },
                {
                  label: 'Progress',
                  value: formState.academicProgress,
                  icon: BookOpen
                },
                {
                  label: 'Completed courses',
                  value: `${formState.completedCourses.length} courses`,
                  icon: BookOpen
                }
              ].map((item) => (
                <article
                  key={item.label}
                  className="soft-panel flex min-h-[128px] cursor-pointer flex-col items-center justify-center gap-2 px-3 py-4 text-center transition duration-200 hover:-translate-y-1 hover:border-[rgba(255,255,255,0.35)] hover:bg-[rgba(255,255,255,0.04)] hover:shadow-[0_14px_30px_rgba(0,0,0,0.35)] sm:min-h-[160px] sm:gap-3 sm:px-4 sm:py-5 lg:min-h-[210px] lg:px-6 lg:py-7"
                >
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-[rgba(180,35,24,0.18)] text-[var(--accent)]">
                    <item.icon size={20} />
                  </div>
                  <p className="w-full break-words text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                    {item.label}
                  </p>
                  <p className="w-full break-words text-sm font-semibold leading-snug text-[var(--text)]">
                    {item.value}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="soft-panel p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-muted">Completed courses list</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {formState.completedCourses.map((course) => (
                <span
                  key={course}
                  className="rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.07)] px-3 py-1 text-xs font-medium"
                >
                  {course}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Preferences"
              value={formState.preferences}
              onChange={(event) =>
                setFormState({
                  ...formState,
                  preferences: event.target.value
                })
              }
            />
            <Input
              label="Interests"
              value={formState.interests}
              onChange={(event) =>
                setFormState({
                  ...formState,
                  interests: event.target.value
                })
              }
            />
          </div>

          <Select
            label="Study load preference"
            value={formState.studyLoadPreference}
            onChange={(event) =>
              setFormState({
                ...formState,
                studyLoadPreference: event.target.value as typeof formState.studyLoadPreference
              })
            }
            options={[
              { value: 'light', label: 'Light (10-12 credits)' },
              { value: 'balanced', label: 'Balanced (13-15 credits)' },
              { value: 'intensive', label: 'Intensive (16+ credits)' }
            ]}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleSave} isLoading={status === 'saving'}>
              Save changes
            </Button>
          </div>
        </Card>
      )}
    </PageShell>
  );
};

export default ProfilePage;
