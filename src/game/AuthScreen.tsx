import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { setActiveUser, setSessionToken, getSessionToken, hydrateFromCloud, migrateLegacyIfNeeded } from "./storage";
import { registerAccount, loginAccount } from "@/lib/cloudSave.functions";

const CURRENT_KEY = "parry.currentUser";

export function getCurrentUser(): string | null {
  if (typeof window === "undefined") return null;
  const nick = localStorage.getItem(CURRENT_KEY);
  const token = getSessionToken();
  if (nick && token) {
    setActiveUser(nick);
    // Refresh cloud → local in the background on each session start.
    hydrateFromCloud(nick, token).catch(() => {});
    return nick;
  }
  return null;
}

export function logout() {
  if (typeof window !== "undefined") localStorage.removeItem(CURRENT_KEY);
  setActiveUser(null);
  setSessionToken(null);
}

export function AuthScreen({ onAuthed }: { onAuthed: (nickname: string) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const register = useServerFn(registerAccount);
  const login = useServerFn(loginAccount);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const nick = nickname.trim();
    if (!nick || !password) {
      setError("Nickname and password required");
      return;
    }
    setBusy(true);
    try {
      const fn = mode === "register" ? register : login;
      const res = await fn({ data: { nickname: nick, password } });
      localStorage.setItem(CURRENT_KEY, res.nickname);
      setActiveUser(res.nickname);
      setSessionToken(res.token);
      migrateLegacyIfNeeded(res.nickname);
      await hydrateFromCloud(res.nickname, res.token);
      onAuthed(res.nickname);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg.replace(/^Error:\s*/, ""));
    } finally {
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
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="NICKNAME"
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
          {busy ? "…" : mode === "login" ? "▶ Login" : "▶ Register"}
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
