import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { setActiveUser, hydrateFromCloud, migrateLegacyIfNeeded } from "./storage";

const CURRENT_KEY = "parry.currentUserEmail";

function getAuthRedirectUrl() {
  if (typeof window === "undefined") return undefined;
  return window.location.origin;
}

export function rememberAuthedUser(email: string) {
  if (typeof window !== "undefined") localStorage.setItem(CURRENT_KEY, email);
  setActiveUser(email);
}

export function getCurrentUser(): string | null {
  if (typeof window === "undefined") return null;
  const email = localStorage.getItem(CURRENT_KEY);
  if (email) {
    setActiveUser(email);
    hydrateFromCloud(email).catch(() => {});
    return email;
  }
  return null;
}

export async function logout() {
  await supabase.auth.signOut();
  if (typeof window !== "undefined") localStorage.removeItem(CURRENT_KEY);
  setActiveUser(null);
}

export function AuthScreen({ onAuthed }: { onAuthed: (email: string) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const finishAuth = async (nextEmail: string) => {
    rememberAuthedUser(nextEmail);
    migrateLegacyIfNeeded(nextEmail);
    await hydrateFromCloud(nextEmail);
    onAuthed(nextEmail);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const nextEmail = email.trim();
    if (!nextEmail || !password) {
      setError("Email and password required");
      return;
    }
    setBusy(true);
    try {
      const result = mode === "register"
        ? await supabase.auth.signUp({ email: nextEmail, password })
        : await supabase.auth.signInWithPassword({ email: nextEmail, password });

      if (result.error) throw result.error;
      const authedEmail = result.data.user?.email ?? result.data.session?.user.email ?? nextEmail;
      await finishAuth(authedEmail);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg.replace(/^Error:\s*/, ""));
    } finally {
      setBusy(false);
    }
  };

  const loginWithGoogle = async () => {
    setError("");
    setBusy(true);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getAuthRedirectUrl(),
        },
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg.replace(/^Error:\s*/, ""));
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full w-full items-center justify-center bg-background p-6 font-pixel text-foreground">
      <form
        onSubmit={submit}
        className="flex w-full max-w-sm flex-col items-center gap-3 border-2 border-border bg-background p-6"
      >
        <div className="text-2xl tracking-[0.3em]">{mode === "login" ? "LOGIN" : "REGISTER"}</div>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="EMAIL"
          autoComplete="username"
          className="w-full border-2 border-border bg-background px-3 py-2 text-[11px] uppercase tracking-widest text-foreground outline-none focus:border-accent"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="PASSWORD"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          className="w-full border-2 border-border bg-background px-3 py-2 text-[11px] uppercase tracking-widest text-foreground outline-none focus:border-accent"
        />
        {error && <div className="text-[10px] uppercase tracking-widest text-destructive">{error}</div>}
        <button
          type="submit"
          disabled={busy}
          className="mt-1 w-full border-2 border-border bg-foreground px-5 py-2 text-[10px] uppercase tracking-[0.3em] text-background hover:bg-accent disabled:opacity-50"
        >
          {busy ? "..." : mode === "login" ? "> Login" : "> Register"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={loginWithGoogle}
          className="w-full border-2 border-border bg-background px-5 py-2 text-[10px] uppercase tracking-[0.3em] text-foreground hover:bg-foreground hover:text-background disabled:opacity-50"
        >
          Continue with Google
        </button>
        <button
          type="button"
          onClick={() => { setError(""); setMode(mode === "login" ? "register" : "login"); }}
          className="text-[9px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          {mode === "login" ? "Need an account? Register" : "Have an account? Login"}
        </button>
      </form>
    </div>
  );
}
