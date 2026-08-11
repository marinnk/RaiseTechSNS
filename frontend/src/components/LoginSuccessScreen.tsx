import type { AuthUser } from '../types/auth';

interface LoginSuccessScreenProps {
  user: AuthUser;
  onLogout: () => void;
  submitting: boolean;
}

// ログイン後のメイン画面（S03 タイムライン画面）は未実装のため、
// 実際にログインできたことを確認するための簡易な画面として用意している
export function LoginSuccessScreen({ user, onLogout, submitting }: LoginSuccessScreenProps) {
  return (
    <div className="centered-page">
      <h1 className="auth-title">ログイン成功！</h1>
      <p>
        ようこそ、{user.displayName}（@{user.username}）さん
      </p>
      <p className="text-sub">{user.email}</p>
      <button type="button" className="btn btn-block" disabled={submitting} onClick={onLogout}>
        ログアウト
      </button>
    </div>
  );
}
