import { useState } from "react";
import { Auth } from "./armazenamento.js";

const C_LOGIN = {
  bg: "#0e0e12",
  card: "#16161c",
  brd: "#2a2a35",
  gold: "#D4AF37",
  tx: "#f0ede8",
  tx2: "#b8b4ae",
  tx3: "#6b6760",
  err: "#ef4444",
};

export default function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!email || !password) { setError("Preencha e-mail e senha."); return; }
    if (password.length < 6) { setError("Senha deve ter pelo menos 6 caracteres."); return; }
    setLoading(true);
    try {
      if (mode === "signup") {
        await Auth.signUp(email, password);
        setSuccess("Conta criada! Verifique seu e-mail para confirmar, depois faça login.");
        setMode("login");
      } else {
        await Auth.signIn(email, password);
        onLogin();
      }
    } catch (err) {
      const msg = err.message || "";
      if (msg.includes("Invalid login")) setError("E-mail ou senha incorretos.");
      else if (msg.includes("already registered")) setError("E-mail já cadastrado. Faça login.");
      else if (msg.includes("Email not confirmed")) setError("Confirme seu e-mail antes de entrar.");
      else setError(msg || "Erro ao entrar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100dvh", background: C_LOGIN.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🏆</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C_LOGIN.tx, letterSpacing: 0.5 }}>Atividades</div>
          <div style={{ fontSize: 13, color: C_LOGIN.tx3, marginTop: 4 }}>Gamifique seus objetivos</div>
        </div>

        {/* Card */}
        <div style={{ background: C_LOGIN.card, border: "0.5px solid " + C_LOGIN.brd, borderRadius: 16, padding: 28 }}>
          {/* Tabs */}
          <div style={{ display: "flex", marginBottom: 24, background: C_LOGIN.bg, borderRadius: 10, padding: 3 }}>
            {["login", "signup"].map((m) => (
              <button key={m} onClick={() => { setMode(m); setError(""); setSuccess(""); }}
                style={{ flex: 1, padding: "8px 0", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600,
                  background: mode === m ? C_LOGIN.gold : "transparent",
                  color: mode === m ? "#0e0e12" : C_LOGIN.tx3,
                  transition: "all .15s" }}>
                {m === "login" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, color: C_LOGIN.tx3, marginBottom: 6, letterSpacing: 0.5 }}>E-MAIL</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com" autoComplete="email"
                style={{ width: "100%", padding: "11px 14px", background: C_LOGIN.bg, border: "0.5px solid " + C_LOGIN.brd,
                  borderRadius: 10, color: C_LOGIN.tx, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, color: C_LOGIN.tx3, marginBottom: 6, letterSpacing: 0.5 }}>SENHA</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "Mínimo 6 caracteres" : "••••••••"} autoComplete={mode === "signup" ? "new-password" : "current-password"}
                style={{ width: "100%", padding: "11px 14px", background: C_LOGIN.bg, border: "0.5px solid " + C_LOGIN.brd,
                  borderRadius: 10, color: C_LOGIN.tx, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>

            {error && <div style={{ background: "#ef444420", border: "0.5px solid #ef4444", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: C_LOGIN.err, marginBottom: 16 }}>{error}</div>}
            {success && <div style={{ background: "#22c55e20", border: "0.5px solid #22c55e", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#22c55e", marginBottom: 16 }}>{success}</div>}

            <button type="submit" disabled={loading}
              style={{ width: "100%", padding: "12px 0", background: loading ? C_LOGIN.brd : C_LOGIN.gold,
                color: loading ? C_LOGIN.tx3 : "#0e0e12", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer", transition: "all .15s", letterSpacing: 0.3 }}>
              {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
            </button>
          </form>
        </div>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: C_LOGIN.tx3 }}>
          Seus dados ficam salvos na nuvem e nunca somem.
        </div>
      </div>
    </div>
  );
}
