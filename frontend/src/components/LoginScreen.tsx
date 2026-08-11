import { useState } from 'react';
import type { LoginRequest } from '../types/auth';

interface LoginScreenProps {
  onSubmit: (payload: LoginRequest) => Promise<boolean>;
  onSwitchToSignup: () => void;
  submitting: boolean;
  error: string | null;
}

export function LoginScreen({ onSubmit, onSwitchToSignup, submitting, error }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    await onSubmit({ email: email.trim(), password });
  };

  return (
    <div className="centered-page">
      <h1 className="auth-title">RaiseTechSNS</h1>
      {error && <div className="form-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="login-email">メールアドレス</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="form-field">
          <label htmlFor="login-password">パスワード</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-block" disabled={!canSubmit}>
          ログイン
        </button>
      </form>
      <p className="auth-switch">
        アカウントをお持ちでない方は{' '}
        <button type="button" className="link-button" onClick={onSwitchToSignup}>
          新規登録はこちら
        </button>
      </p>
    </div>
  );
}
