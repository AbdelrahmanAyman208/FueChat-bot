import { useState, useRef, useEffect } from 'react';
import { Sparkles, ArrowRight, ArrowLeft, RotateCcw, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAppSelector } from '../../app/hooks';

/* ── Quiz Data ───────────────────────────────────────────── */

const QUESTIONS = [
  {
    question: 'What excites you most about technology?',
    icon: '🚀',
    options: [
      'Building apps and websites that people actually use',
      'Teaching machines to think and learn on their own',
      'Protecting systems from hackers and cyber threats',
      'Organizing data to help businesses make decisions',
      'Discovering hidden patterns and insights in data',
    ],
  },
  {
    question: 'Which school subject did you enjoy most?',
    icon: '📚',
    options: [
      'Computer Science / Programming',
      'Mathematics / Logic puzzles',
      'Physics / Engineering concepts',
      'Business / Economics',
      'Statistics / Data analysis',
    ],
  },
  {
    question: 'What kind of problems do you enjoy solving?',
    icon: '🧩',
    options: [
      'Debugging code and building complex systems',
      'Making predictions based on data patterns',
      'Finding vulnerabilities and security flaws',
      'Streamlining business processes and workflows',
      'Visualizing and interpreting large datasets',
    ],
  },
  {
    question: 'Where do you see yourself in 5 years?',
    icon: '🎯',
    options: [
      'Working as a software engineer at a tech company',
      'Researching AI/ML at a cutting-edge lab',
      'Leading a cybersecurity team protecting organizations',
      'Managing IT systems for a large corporation',
      'Working as a data scientist solving real-world problems',
    ],
  },
  {
    question: 'Which activity sounds most appealing?',
    icon: '⚡',
    options: [
      'Coding a full-stack web application from scratch',
      'Training a neural network to recognize images',
      'Performing penetration testing on a network',
      'Designing a database schema for an enterprise',
      'Creating dashboards to visualize business metrics',
    ],
  },
  {
    question: 'How do you feel about math and statistics?',
    icon: '📊',
    options: [
      'I like applied math — algorithms and data structures',
      'I love advanced math — linear algebra, calculus, optimization',
      'I prefer logical math — cryptography and number theory',
      'I like practical math — business analytics and modeling',
      'I enjoy statistical analysis and probability',
    ],
  },
  {
    question: 'What matters most to you in a career?',
    icon: '💎',
    options: [
      'Building products millions of people will use',
      'Pushing the boundaries of what technology can do',
      'Keeping the digital world safe and secure',
      'Bridging the gap between technology and business',
      'Turning raw data into actionable insights',
    ],
  },
];

/* ── Markdown Overrides (matching protoplasm chat) ───────── */

const markdownComponents = {
  p: ({ node, ...props }: any) => <p className="mb-3 last:mb-0 leading-relaxed" {...props} />,
  strong: ({ node, ...props }: any) => (
    <strong style={{ color: 'var(--proto-accent-1)', fontWeight: 600 }} {...props} />
  ),
  h1: ({ node, ...props }: any) => (
    <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--proto-accent-1)' }} {...props} />
  ),
  h2: ({ node, ...props }: any) => (
    <h2 className="text-xl font-semibold mt-6 mb-3" style={{ color: 'var(--proto-accent-2)' }} {...props} />
  ),
  h3: ({ node, ...props }: any) => (
    <h3 className="text-lg font-semibold mt-4 mb-2" style={{ color: 'var(--proto-accent-2)' }} {...props} />
  ),
  ul: ({ node, ...props }: any) => <ul className="list-disc list-inside mb-3 space-y-1.5" {...props} />,
  ol: ({ node, ...props }: any) => <ol className="list-decimal list-inside mb-3 space-y-1.5" {...props} />,
  li: ({ node, ...props }: any) => <li className="leading-relaxed" {...props} />,
  a: ({ node, ...props }: any) => (
    <a style={{ color: 'var(--proto-accent-2)' }} className="hover:underline" {...props} />
  ),
};

/* ── Component ───────────────────────────────────────────── */

const ProgramFinderPage = () => {
  const user = useAppSelector((state) => state.auth.user);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState('');
  const [phase, setPhase] = useState<'intro' | 'quiz' | 'loading' | 'result'>('intro');
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (resultRef.current) {
      resultRef.current.scrollTop = resultRef.current.scrollHeight;
    }
  }, [result]);

  const handleStart = () => {
    setPhase('quiz');
    setCurrentStep(0);
    setAnswers([]);
    setSelectedOption(null);
    setResult('');
  };

  const handleSelectOption = (optionIndex: number) => {
    setSelectedOption(optionIndex);
  };

  const handleNext = () => {
    if (selectedOption === null) return;

    const newAnswers = [...answers, QUESTIONS[currentStep].options[selectedOption]];
    setAnswers(newAnswers);
    setSelectedOption(null);

    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Submit to AI
      submitQuiz(newAnswers);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      const newAnswers = [...answers];
      const removedAnswer = newAnswers.pop();
      setAnswers(newAnswers);
      // Restore selection
      if (removedAnswer) {
        const prevQuestion = QUESTIONS[currentStep - 1];
        const idx = prevQuestion.options.indexOf(removedAnswer);
        setSelectedOption(idx >= 0 ? idx : null);
      }
    }
  };

  const handleRetake = () => {
    setPhase('intro');
    setCurrentStep(0);
    setAnswers([]);
    setSelectedOption(null);
    setResult('');
    setIsLoading(false);
  };

  const submitQuiz = async (finalAnswers: string[]) => {
    setPhase('loading');
    setIsLoading(true);
    setResult('');

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/chat/program-finder`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ answers: finalAnswers }),
        }
      );

      if (!response.ok) throw new Error('API Error');
      if (!response.body) throw new Error('No stream');

      setPhase('result');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let content = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const parts = chunk.split('\n\n');
          for (const part of parts) {
            if (part.startsWith('data: ')) {
              const dataStr = part.substring(6);
              if (dataStr.startsWith('[DONE]') || dataStr.startsWith('[ERROR]')) {
                continue;
              }
              content += dataStr;
              setResult(content);
            }
          }
        }
      }
    } catch (e: any) {
      setResult('❌ Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const progress = phase === 'quiz' ? ((currentStep + 1) / QUESTIONS.length) * 100 : phase === 'result' ? 100 : 0;

  return (
    <div className="relative min-h-[calc(100vh-80px)] overflow-hidden" style={{ background: 'var(--proto-bg, #050508)' }}>
      {/* ── Animated Background Blobs ── */}
      <div className="proto-blob proto-blob-1" />
      <div className="proto-blob proto-blob-2" />
      <div className="proto-blob proto-blob-3" />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">

        {/* ── Progress Bar ── */}
        {(phase === 'quiz' || phase === 'result') && (
          <div className="mb-8 proto-msg-enter">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium" style={{ color: 'var(--proto-text-muted)' }}>
                {phase === 'quiz' ? `Question ${currentStep + 1} of ${QUESTIONS.length}` : 'Complete!'}
              </span>
              <span className="text-xs font-bold" style={{ color: 'var(--proto-accent-2)' }}>
                {Math.round(progress)}%
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${progress}%`,
                  background: 'var(--proto-accent-gradient)',
                  boxShadow: '0 0 12px rgba(167,139,250,0.3)',
                }}
              />
            </div>
          </div>
        )}

        {/* ── Intro Phase ── */}
        {phase === 'intro' && (
          <div className="proto-msg-enter flex flex-col items-center text-center pt-8">
            <div className="proto-empty-icon mb-2">
              <Sparkles size={32} style={{ color: 'var(--proto-accent-2)' }} />
            </div>
            <h1 className="text-3xl font-bold mb-3" style={{ color: 'var(--proto-text)' }}>
              Program Finder
            </h1>
            <p className="text-base mb-2 max-w-md" style={{ color: 'var(--proto-text-muted)' }}>
              Not sure which program is right for you? Answer 7 quick questions and our AI advisor
              will recommend the perfect program based on your interests and strengths.
            </p>
            <p className="text-sm mb-8" style={{ color: 'var(--proto-accent-2)', opacity: 0.7 }}>
              Designed for Freshman & Sophomore students
            </p>

            {/* Program cards preview */}
            <div className="grid grid-cols-5 gap-2 mb-8 w-full max-w-lg">
              {[
                { name: 'CS', emoji: '💻', color: '#2dd4bf' },
                { name: 'AI', emoji: '🤖', color: '#a78bfa' },
                { name: 'CY', emoji: '🛡️', color: '#f472b6' },
                { name: 'IS', emoji: '📊', color: '#38bdf8' },
                { name: 'DS', emoji: '📈', color: '#fbbf24' },
              ].map((p) => (
                <div
                  key={p.name}
                  className="proto-glass rounded-xl py-3 px-2 flex flex-col items-center gap-1.5 transition-all hover:scale-105"
                  style={{ borderColor: `${p.color}22` }}
                >
                  <span className="text-xl">{p.emoji}</span>
                  <span className="text-xs font-bold" style={{ color: p.color }}>{p.name}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleStart}
              className="group flex items-center gap-2 px-8 py-3.5 rounded-2xl font-semibold text-sm transition-all duration-300"
              style={{
                background: 'var(--proto-accent-gradient)',
                color: '#0a0a12',
                boxShadow: '0 0 30px rgba(167,139,250,0.2)',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.boxShadow = '0 0 50px rgba(167,139,250,0.35)';
                (e.target as HTMLElement).style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.boxShadow = '0 0 30px rgba(167,139,250,0.2)';
                (e.target as HTMLElement).style.transform = 'translateY(0)';
              }}
            >
              Start Quiz <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}

        {/* ── Quiz Phase ── */}
        {phase === 'quiz' && (
          <div className="proto-msg-enter" key={currentStep}>
            <div className="proto-glass rounded-2xl p-6 sm:p-8" style={{ boxShadow: 'var(--proto-glow)' }}>
              {/* Question header */}
              <div className="flex items-start gap-4 mb-6">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{
                    background: 'rgba(167,139,250,0.1)',
                    border: '1px solid rgba(167,139,250,0.15)',
                  }}
                >
                  {QUESTIONS[currentStep].icon}
                </div>
                <h2 className="text-lg font-semibold pt-2" style={{ color: 'var(--proto-text)' }}>
                  {QUESTIONS[currentStep].question}
                </h2>
              </div>

              {/* Options */}
              <div className="space-y-2.5 mb-6">
                {QUESTIONS[currentStep].options.map((option, i) => {
                  const isSelected = selectedOption === i;
                  return (
                    <button
                      key={i}
                      onClick={() => handleSelectOption(i)}
                      className="w-full text-left px-4 py-3.5 rounded-xl text-sm transition-all duration-300 flex items-center gap-3"
                      style={{
                        background: isSelected
                          ? 'linear-gradient(135deg, rgba(45,212,191,0.15), rgba(167,139,250,0.18))'
                          : 'rgba(255,255,255,0.03)',
                        border: isSelected
                          ? '1px solid rgba(167,139,250,0.35)'
                          : '1px solid rgba(255,255,255,0.06)',
                        color: isSelected ? 'var(--proto-text)' : 'var(--proto-text-muted)',
                        boxShadow: isSelected ? '0 0 20px rgba(167,139,250,0.1)' : 'none',
                        transform: isSelected ? 'scale(1.01)' : 'scale(1)',
                      }}
                    >
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                        style={{
                          background: isSelected ? 'var(--proto-accent-gradient)' : 'rgba(255,255,255,0.06)',
                          color: isSelected ? '#0a0a12' : 'var(--proto-text-muted)',
                          border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        {String.fromCharCode(65 + i)}
                      </span>
                      {option}
                    </button>
                  );
                })}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={handleBack}
                  disabled={currentStep === 0}
                  className="proto-icon-btn flex items-center gap-1.5 px-4 w-auto text-sm"
                  style={{ opacity: currentStep === 0 ? 0.3 : 1 }}
                >
                  <ArrowLeft size={14} /> Back
                </button>
                <button
                  onClick={handleNext}
                  disabled={selectedOption === null}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300"
                  style={{
                    background: selectedOption !== null ? 'var(--proto-accent-gradient)' : 'rgba(255,255,255,0.06)',
                    color: selectedOption !== null ? '#0a0a12' : 'var(--proto-text-muted)',
                    opacity: selectedOption === null ? 0.5 : 1,
                    cursor: selectedOption === null ? 'default' : 'pointer',
                    boxShadow: selectedOption !== null ? '0 0 20px rgba(167,139,250,0.2)' : 'none',
                  }}
                >
                  {currentStep === QUESTIONS.length - 1 ? (
                    <>
                      Get Recommendation <Sparkles size={14} />
                    </>
                  ) : (
                    <>
                      Next <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Loading Phase ── */}
        {phase === 'loading' && (
          <div className="proto-msg-enter flex flex-col items-center text-center pt-16">
            <div className="proto-empty-icon mb-4">
              <Loader2 size={32} className="animate-spin" style={{ color: 'var(--proto-accent-2)' }} />
            </div>
            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--proto-text)' }}>
              Analyzing Your Answers...
            </h2>
            <p className="text-sm proto-shimmer">Our AI advisor is finding your perfect program match</p>
          </div>
        )}

        {/* ── Result Phase ── */}
        {phase === 'result' && (
          <div className="proto-msg-enter">
            <div
              className="proto-glass rounded-2xl p-6 sm:p-8"
              style={{ boxShadow: 'var(--proto-glow)' }}
            >
              {/* AI avatar header */}
              <div className="flex items-center gap-3 mb-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                  style={{
                    background: 'rgba(167,139,250,0.1)',
                    border: '1px solid rgba(167,139,250,0.15)',
                  }}
                >
                  🎓
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--proto-text)' }}>FueBot Program Advisor</p>
                  <p className="text-xs" style={{ color: 'var(--proto-text-muted)' }}>
                    Personalized recommendation for {user?.name || 'you'}
                  </p>
                </div>
                {isLoading && (
                  <Loader2 size={16} className="animate-spin ml-auto" style={{ color: 'var(--proto-accent-2)' }} />
                )}
              </div>

              {/* Streamed result */}
              <div
                ref={resultRef}
                className="proto-bot-panel proto-scrollbar max-h-[55vh] overflow-y-auto"
                style={{ color: 'var(--proto-text)', lineHeight: 1.75 }}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {result}
                </ReactMarkdown>
                {isLoading && (
                  <span className="inline-flex gap-1 mt-2">
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--proto-accent-2)', animationDelay: '-0.3s' }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--proto-accent-2)', animationDelay: '-0.15s' }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--proto-accent-2)' }} />
                  </span>
                )}
              </div>

              {/* Retake button */}
              {!isLoading && result && (
                <div className="mt-6 pt-4 flex justify-center" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <button
                    onClick={handleRetake}
                    className="proto-new-chat-btn w-auto px-6"
                  >
                    <RotateCcw size={14} /> Retake Quiz
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgramFinderPage;
