import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import LoginScreen from './src/Login.jsx';
import { Auth } from './src/armazenamento.js';

function LoadingMark() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l2.6 5.27L20.5 9l-4.25 4.14L17.3 19 12 16.2 6.7 19l1.05-5.86L3.5 9l5.9-.73L12 3z" />
    </svg>
  );
}

function Root() {
  const [user, setUser] = useState(undefined); // undefined = carregando

  useEffect(() => {
    // Checa se ja ha sessao ativa
    Auth.getUser().then(u => setUser(u));
    // Escuta mudancas de auth
    const { data: { subscription } } = Auth.onAuthChange(u => setUser(u));
    return () => subscription.unsubscribe();
  }, []);

  if (user === undefined) {
    return (
      <div style={{ minHeight: "100dvh", background: "#0e0e12", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <LoadingMark />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={() => Auth.getUser().then(setUser)} />;
  }

  return <App user={user} onSignOut={() => Auth.signOut()} />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
