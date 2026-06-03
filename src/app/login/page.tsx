"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Swords } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr("");
    setBusy(true);
    try {
      if (mode === "register") {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setErr(d.error || "Registration failed.");
          setBusy(false);
          return;
        }
      }
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setErr("Invalid email or password.");
        setBusy(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setErr("Something went wrong.");
      setBusy(false);
    }
  };

  return (
    <div style={wrap}>
      <div className="panel" style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 6 }}>
          <Swords size={20} color="#4db5ff" />
          <span className="glow-text" style={brand}>THE&nbsp;SYSTEM</span>
        </div>
        <p style={{ textAlign: "center", color: "#6f8bb5", fontSize: 13, marginTop: 0, marginBottom: 22 }}>
          {mode === "signin" ? "Sign in, Hunter." : "Awaken your account."}
        </p>

        <input className="inp" style={input} placeholder="Email" type="email" value={email}
          onChange={(e) => setEmail(e.target.value)} />
        <input className="inp" style={input} placeholder="Password" type="password" value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()} />

        {err && <div style={{ color: "#ff8aa3", fontSize: 13, marginBottom: 10 }}>{err}</div>}

        <button className="primary-btn" style={btn} onClick={submit} disabled={busy}>
          {busy ? "…" : mode === "signin" ? "Enter the System →" : "Create Account →"}
        </button>

        <button
          onClick={() => { setMode(mode === "signin" ? "register" : "signin"); setErr(""); }}
          style={switchBtn}
        >
          {mode === "signin" ? "No account? Register" : "Have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}

const wrap: React.CSSProperties = {
  minHeight: "100vh", display: "grid", placeItems: "center", padding: 20,
  background: "radial-gradient(900px 500px at 50% -10%, #0e2042 0%, #070b16 55%, #05070d 100%)",
};
const card: React.CSSProperties = { width: "100%", maxWidth: 380, padding: 28 };
const brand: React.CSSProperties = { fontFamily: "Orbitron, sans-serif", fontWeight: 700, letterSpacing: 4, fontSize: 16, color: "#4db5ff" };
const input: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", padding: "11px 13px", borderRadius: 9,
  background: "rgba(6,14,28,0.9)", border: "1px solid #1c3358", color: "#dcecff",
  fontSize: 14, fontFamily: "'Chakra Petch',sans-serif", outline: "none", marginBottom: 12,
};
const btn: React.CSSProperties = {
  width: "100%", padding: "12px", borderRadius: 9, border: "1px solid #2a6fd0",
  background: "linear-gradient(135deg,#1e6fff,#2a9fff)", color: "#fff", fontSize: 14,
  fontWeight: 600, cursor: "pointer", fontFamily: "'Chakra Petch',sans-serif",
};
const switchBtn: React.CSSProperties = {
  width: "100%", marginTop: 14, background: "transparent", border: "none",
  color: "#6f8bb5", fontSize: 13, cursor: "pointer", fontFamily: "'Chakra Petch',sans-serif",
};
