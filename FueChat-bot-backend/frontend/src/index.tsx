import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { store } from './app/store';
import { useAppDispatch, useAppSelector } from './app/hooks';
import { fetchCurrentUser } from './features/auth/authSlice';
import ToastContainer from './components/common/ToastContainer';
import ErrorBoundary from './components/common/ErrorBoundary';
import { registerApiStore } from './services/api';

const AppBootstrap = () => {
  const dispatch = useAppDispatch();
  const status = useAppSelector((state) => state.auth.status);

  useEffect(() => {
    // Always try to restore session on app load (cookie-based auth)
    if (status === 'idle') {
      dispatch(fetchCurrentUser());
    }
  }, [dispatch, status]);

  return (
    <ErrorBoundary>
      <App />
      <ToastContainer />
    </ErrorBoundary>
  );
};

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root container missing in index.html');
}

const root = createRoot(container);
registerApiStore(store);
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <AppBootstrap />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
