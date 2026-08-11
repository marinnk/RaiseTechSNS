import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { LoginScreen } from './components/LoginScreen';
import { SignupScreen } from './components/SignupScreen';
import { LoginSuccessScreen } from './components/LoginSuccessScreen';

type Screen = 'login' | 'signup';

function App() {
  const { user, sessionStatus, submitting, error, login, register, logout } = useAuth();
  const [screen, setScreen] = useState<Screen>('login');

  if (sessionStatus === 'checking') {
    return (
      <div className="centered-page">
        <p>読み込み中...</p>
      </div>
    );
  }

  if (user) {
    return <LoginSuccessScreen user={user} onLogout={logout} submitting={submitting} />;
  }

  if (screen === 'signup') {
    return (
      <SignupScreen
        onSubmit={register}
        onSwitchToLogin={() => setScreen('login')}
        submitting={submitting}
        error={error}
      />
    );
  }

  return (
    <LoginScreen
      onSubmit={login}
      onSwitchToSignup={() => setScreen('signup')}
      submitting={submitting}
      error={error}
    />
  );
}

export default App;
