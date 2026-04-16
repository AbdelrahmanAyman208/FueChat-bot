import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { addUserMessage, sendMessage } from './chatSlice';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { addToast } from '../ui/uiSlice';
import PageShell from '../../components/common/PageShell';

const ChatPage = () => {
  const dispatch = useAppDispatch();
  const { messages, isLoading, error } = useAppSelector((state) => state.chat);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const timeline = useMemo(
    () =>
      messages.map((message) => ({
        ...message,
        localTime: new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      })),
    [messages]
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!input.trim()) return;

    const newMessage = {
      id: `user-${Date.now()}`,
      role: 'user' as const,
      content: input,
      timestamp: new Date().toISOString(),
      status: 'complete' as const
    };

    dispatch(addUserMessage(newMessage));
    setInput('');

    const result = await dispatch(sendMessage(newMessage.content));
    if (sendMessage.rejected.match(result)) {
      dispatch(
        addToast({
          title: 'Chat request failed',
          description: 'FueBot could not process that message. Please try again.',
          variant: 'danger'
        })
      );
    }
  };

  return (
    <PageShell
      title="FueBot"
      subtitle="Ask anything about courses, graduation, or your study plan."
      className="page-chat"
      contentClassName="max-w-6xl"
    >
      <Card className="overflow-hidden p-0">
        <div className="flex min-h-[65vh] flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
            {timeline.map((message) => {
              const isUser = message.role === 'user';

              return (
                <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[88%] space-y-1 sm:max-w-[72%] ${isUser ? 'text-right' : ''}`}>
                    {!isUser && <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">FueBot</p>}
                    <div
                      className={`rounded-2xl border px-4 py-3 text-sm leading-relaxed transition ${
                        isUser ? 'border-[rgba(180,35,24,0.35)] bg-[rgba(180,35,24,0.16)]' : 'border-[var(--border)] bg-[var(--surface)]'
                      }`}
                    >
                      {message.content}
                    </div>
                    <div className="text-[11px] text-muted">{message.localTime}</div>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="max-w-[88%] space-y-1 sm:max-w-[72%]">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">FueBot</p>
                <div className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent)]" />
                  Thinking...
                </div>
              </div>
            )}

            {error && <div className="text-sm text-red-600">{error}</div>}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSubmit} className="border-t border-[var(--border)] bg-[var(--panel)] p-4">
            <div className="flex flex-col gap-3 md:flex-row">
              <input
                className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--muted)]"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Message FueBot..."
              />
              <Button type="submit" isLoading={isLoading} className="md:w-[180px]">
                Send
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </PageShell>
  );
};

export default ChatPage;
