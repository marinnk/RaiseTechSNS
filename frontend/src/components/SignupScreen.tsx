import { useState } from 'react';
import type { RegisterRequest } from '../types/auth';

interface SignupScreenProps {
  onSubmit: (payload: RegisterRequest) => Promise<boolean>;
  onSwitchToLogin: () => void;
  submitting: boolean;
  error: string | null;
}

export function SignupScreen({ onSubmit, onSwitchToLogin, submitting, error }: SignupScreenProps) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const canSubmit = username.trim().length > 0 && email.trim().length > 0 && password.length >= 8 && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    await onSubmit({ username: username.trim(), email: email.trim(), password });
  };

  return (
    <div className="centered-page">
      <h1 className="auth-title">新規登録</h1>
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="register-username">ユーザー名</label>
          <input
            id="register-username"
            type="text"
            autoComplete="username"
            required
            maxLength={50}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="form-field">
          <label htmlFor="register-email">メールアドレス</label>
          <input
            id="register-email"
            type="email"
            autoComplete="email"
            required
            maxLength={255}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="form-field">
          <label htmlFor="register-password">パスワード</label>
          <input
            id="register-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={100}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="field-hint">8文字以上100文字以内で入力してください</p>
        </div>
        <button type="submit" className="btn btn-block" disabled={!canSubmit}>
          登録する
        </button>
      </form>
      <p className="auth-switch">
        <button type="button" className="link-button" onClick={onSwitchToLogin}>
          ログイン画面に戻る
        </button>
      </p>
    </div>
  );
}
