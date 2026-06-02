import { useState } from "react";
import { setActiveUser, migrateLegacyIfNeeded } from "./storage";

type Account = { nickname: string; password: string };
const ACCOUNTS_KEY = "parry.accounts";
const CURRENT_KEY = "parry.currentUser";

function loadAccounts(): Account[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    return raw ? (JSON.parse(raw) as Account[]) : [];
  } catch {
    return [];
  }
}
function saveAccounts(a: Account[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(a));
}
export function getCurrentUser(): string | null {
  const nick = localStorage.getItem(CURRENT_KEY);
  if (nick) setActiveUser(nick);
  return nick;
}
export function logout() {
  localStorage.removeItem(CURRENT_KEY);
  setActiveUser(null);
}

export function AuthScreen({ onAuthed }: { onAuthed: (nickname: string) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const nick = nickname.trim();
    if (!nick || !password) {
      setError("Nickname and password required");
      return;
    }
    const accounts = loadAccounts();

    if (mode === "register") {
      if (accounts.some((a) => a.nickname.toLowerCase() === nick.toLowerCase())) {
        setError("Nickname already taken");
        return;
      }
      accounts.push({ nickname: nick, password });
      saveAccounts(accounts);
    } else {
      const found = accounts.find(
        (a) => a.nickname.toLowerCase() === nick.toLowerCase() && a.password === password,
      );
      if (!found) {
        setError("Invalid nickname or password");
        return;
      }
    }

    localStorage.setItem(CURRENT_KEY, nick);
    setActiveUser(nick);
    migrateLegacyIfNeeded(nick);
    onAuthed(nick);
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
          className="mt-1 w-full border-2 border-border bg-foreground px-5 py-2 text-[10px] uppercase tracking-[0.3em] text-background hover:bg-accent"
        >
          {mode === "login" ? "▶ Login" : "▶ Register"}
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
