import { useState } from 'react';
import './index.css';
import { isLoggedIn } from './utils/auth';
import { Splash }    from './screens/Splash';
import { Login }     from './screens/Login';
import { Signup }    from './screens/Signup';
import { Dashboard } from './screens/Dashboard';

type Screen = 'splash' | 'login' | 'signup' | 'app';

export default function App() {
  const [screen, setScreen] = useState<Screen>('splash');

  function handleSplashDone() {
    setScreen(isLoggedIn() ? 'app' : 'login');
  }

  return (
    <>
      {screen === 'splash' && <Splash onDone={handleSplashDone} />}
      {screen === 'login'  && <Login  onLogin={() => setScreen('app')} onSignup={() => setScreen('signup')} />}
      {screen === 'signup' && <Signup onLogin={() => setScreen('app')} onBack={() => setScreen('login')} />}

      {/*
        Dashboard is rendered once and NEVER unmounted after login.
        This is what keeps the camera and MediaPipe running continuously.
        We simply hide it (display:none) while auth screens are shown.
      */}
      <div style={{ display: screen === 'app' ? 'contents' : 'none' }}>
        <Dashboard onLogout={() => setScreen('login')} />
      </div>
    </>
  );
}
