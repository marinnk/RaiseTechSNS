import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { LoginScreen } from './components/LoginScreen';
import { SignupScreen } from './components/SignupScreen';
import { TimelineScreen } from './components/TimelineScreen';

type Screen = 'login' | 'signup';

function App() {
  const { user, sessionStatus, submitting, error, login, register, logout, clearError } = useAuth();
  const [screen, setScreen] = useState<Screen>('login');

  // ログイン⇔新規登録の切り替え時は、直前の画面で出ていたエラーを持ち越さない
  const switchToSignup = () => {
    clearError();
    setScreen('signup');
  };

  const switchToLogin = () => {
    clearError();
    setScreen('login');
  };

  if (sessionStatus === 'checking') {
    return (
      <div className="centered-page">
        <p>読み込み中...</p>
      </div>
    );
  }

  if (user) {
    return <TimelineScreen currentUser={user} onLogout={logout} logoutSubmitting={submitting} />;
  }

  if (screen === 'signup') {
    return (
      <SignupScreen
        onSubmit={register}
        onSwitchToLogin={switchToLogin}
        submitting={submitting}
        error={error}
      />
    );
  }

  return (
    <LoginScreen
      onSubmit={login}
      onSwitchToSignup={switchToSignup}
      submitting={submitting}
      error={error}
    />
  );
}

export default App;
