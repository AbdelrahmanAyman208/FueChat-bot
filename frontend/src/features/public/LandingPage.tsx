import { NavLink } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { useEffect } from 'react';
import heroVideo from '../../video.mp4';
import mobileHeroVideo from '../../Mobile Video.mp4';

const LandingPage = () => {
  useEffect(() => {
    const targets = document.querySelectorAll<HTMLElement>('[data-reveal]');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: '0px 0px -10% 0px' }
    );
    targets.forEach((el, index) => {
      const delay = Math.min(index * 70, 420);
      el.style.setProperty('--reveal-delay', `${delay}ms`);
      observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <main>
      <section className="hero-section">
        <div className="hero-bg" />
        <div className="hero-grid" />
        <div className="mx-auto max-w-6xl px-6 pt-10" data-reveal>
          <div className="hero-video-stage">
            <video
              src={heroVideo}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              className="hero-video-display hidden md:block"
              aria-hidden="true"
              tabIndex={-1}
            />
            <video
              src={mobileHeroVideo}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              className="hero-video-display md:hidden"
              aria-hidden="true"
              tabIndex={-1}
            />
          </div>
        </div>
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 pb-20 pt-10 lg:flex-row lg:items-end">
          <div className="relative z-10 space-y-6" data-reveal>
            <Badge label="AI Academic Advising" variant="info" />
            <h1 className="font-display text-4xl leading-tight text-[var(--accent)] md:text-5xl">
              FueBot is your university-grade AI advisor for smarter academic decisions.
            </h1>
            <p className="text-base text-muted md:text-lg">
              FueBot turns transcripts, degree requirements, and student goals into clear, actionable guidance.
              Secure, compliant, and built for modern universities.
            </p>
            <div className="flex flex-wrap gap-4">
              <NavLink to="/login">
                <Button>Sign in</Button>
              </NavLink>
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-muted">
              <div>
                <p className="text-lg font-semibold text-[var(--accent)]">98%</p>
                <p>Advisor satisfaction</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-[var(--accent)]">24/7</p>
                <p>Student support</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-[var(--accent)]">SOC2-ready</p>
                <p>Security & compliance</p>
              </div>
            </div>
          </div>
          <div className="relative z-10 w-full max-w-lg space-y-6" data-reveal>
            <Card className="p-6 space-y-4 shadow-soft">
              <p className="text-xs uppercase tracking-[0.32em] text-muted">What FueBot does</p>
              <h2 className="text-2xl font-semibold">Academic decisions, clarified</h2>
              <div className="space-y-3 text-sm text-muted">
                <p>• Personalized degree plans aligned with prerequisites and graduation rules.</p>
                <p>• Advising notes, progress tracking, and automated requirement audits.</p>
                <p>• Secure student records with role-based access for advisors and admins.</p>
              </div>
            </Card>
            <Card className="p-6 space-y-3">
              <p className="text-xs uppercase tracking-[0.32em] text-muted">Deployment</p>
              <p className="text-sm text-muted">
                Integrates with SIS, LMS, and secure transcript data sources. Designed for enterprise-scale advising.
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-8 md:grid-cols-3">
          {[
            {
              title: 'Precision recommendations',
              body: 'Ranked course plans grounded in prerequisites, GPA, and degree audit rules.'
            },
            {
              title: 'Advisor-ready reporting',
              body: 'Exportable student summaries for academic committees and graduation checks.'
            },
            {
              title: 'Human-centered design',
              body: 'Warm, accessible interfaces built for students, counselors, and faculty.'
            }
          ].map((card) => (
            <Card key={card.title} className="p-6 space-y-3 reveal" data-reveal>
              <h3 className="text-lg font-semibold">{card.title}</h3>
              <p className="text-sm text-muted">{card.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="feature-band">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16 lg:flex-row lg:items-center">
          <div className="space-y-4" data-reveal>
            <p className="text-xs uppercase tracking-[0.32em] text-muted">Why FueBot</p>
            <h2 className="text-3xl font-semibold text-[var(--accent)]">Built for universities, loved by students.</h2>
            <p className="text-sm text-muted">
              Designed for real academic workflows: advising notes, multi-term planning, and graduation compliance.
            </p>
            <div className="flex flex-wrap gap-3">
              <Badge label="FERPA aligned" variant="success" />
              <Badge label="Role-based access" variant="info" />
              <Badge label="Analytics ready" variant="warning" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2" data-reveal>
            {[
              'Transcript-aware recommendations',
              'Automated graduation tracking',
              'Policy and curriculum governance',
              'Secure API integrations'
            ].map((item) => (
              <div key={item} className="soft-panel p-4 text-sm">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="p-6 space-y-6 reveal" data-reveal>
            <h2 className="text-2xl font-semibold">Implementation roadmap</h2>
            <div className="space-y-4">
              {[
                { step: 'Connect SIS + LMS data', detail: 'Securely ingest transcripts and degree audits.' },
                { step: 'Configure advising rules', detail: 'Apply department-specific policies and constraints.' },
                { step: 'Launch student portal', detail: 'Deliver personalized guidance at scale.' }
              ].map((item, index) => (
                <div key={item.step} className="flex gap-4">
                  <div className="h-10 w-10 rounded-full bg-[rgba(180,35,24,0.1)] text-[var(--accent)] grid place-items-center">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold">{item.step}</p>
                    <p className="text-sm text-muted">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-6 space-y-4 reveal" data-reveal>
            <p className="text-xs uppercase tracking-[0.32em] text-muted">Launch readiness</p>
            <h3 className="text-xl font-semibold">Ready to deploy with your institution</h3>
            <p className="text-sm text-muted">
              FueBot is engineered for enterprise-scale advising. Start with a cohort pilot and expand campus-wide.
            </p>
            <NavLink to="/login">
              <Button className="w-full">Sign in to get started</Button>
            </NavLink>
          </Card>
        </div>
      </section>
    </main>
  );
};

export default LandingPage;
