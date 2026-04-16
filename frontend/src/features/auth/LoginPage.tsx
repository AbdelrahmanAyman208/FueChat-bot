import { FormEvent, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { login } from './authSlice';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const LoginPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { status, error } = useAppSelector((state) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const from = (location.state as { from?: string } | null)?.from ?? '/chat';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = await dispatch(login({ email, password }));
    if (login.fulfilled.match(result)) {
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="auth2-shell">
      <div className="auth2-card">
        <section className="auth2-illustration">
          <div className="auth2-orb orb-1" />
          <div className="auth2-orb orb-2" />
          <div className="auth2-orb orb-3" />
          <div className="auth2-logo">
            <img src="/logo.svg" alt="FueBot" />
          </div>
          <div className="auth2-live">
            <p className="auth2-live-label">Live campus update</p>
            <div className="auth2-live-text">
              <span>Welcome to your academic assistant.</span>
              <span>Campus opens in 18 days — plan your schedule now.</span>
              <span>New advising slots are available this week.</span>
            </div>
          </div>
          <div className="auth2-illustration-copy">
            <h1>Turn your academic plans into reality.</h1>
            <p>FueBot keeps your degree path clear, personalized, and always on track.</p>
          </div>
        </section>
        <section className="auth2-form">
          <div className="auth2-icon">✦</div>
          <h2>Login to your account</h2>
          <p className="auth2-subtitle">Use your university credentials to continue.</p>
          <form className="auth2-fields" onSubmit={handleSubmit}>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@fue.edu.eg"
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              required
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" isLoading={status === 'loading'}>
              {status === 'loading' ? 'Signing in...' : 'Login'}
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default LoginPage;
