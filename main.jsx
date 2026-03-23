import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import LoginScreen from './src/Login.jsx';
import { Auth } from './src/armazenamento.js';

function Root() {
  const [user, setUser] = useState(undefined); // undefined = carregando

  useEffect(() => {
    // Checa se já há sessão ativa
    Auth.getUser().then(u => setUser(u));
    // Escuta mudanças de auth
    const { data: { subscription } } = Auth.onAuthChange(u => setUser(u));
    return () => subscription.unsubscribe();
  }, []);

  if (user === undefined) {
    // Tela de carregamento inicial
    return (
      <div style={{ minHeight: "100dvh", background: "#0e0e12", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 36 }}>🏆</div>
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
