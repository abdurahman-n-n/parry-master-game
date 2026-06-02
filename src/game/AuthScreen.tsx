import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { setActiveUser, migrateLegacyIfNeeded } from "./storage";
import { requestEmailCode, verifyEmailCode } from "@/lib/auth-codes.functions";

type Account = { nickname: string; password: string; email?: string };
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

function maskEmail(email: string) {
  const [u, d] = email.split("@");
  if (!u || !d) return email;
  const head = u.slice(0, 1);
  const tail = u.length > 2 ? u.slice(-1) : "";
  return `${head}${"*".repeat(Math.max(1, u.length - 2))}${tail}@${d}`;
}

type Stage =
  | { kind: "form" }
  | { kind: "code"; purpose: "register" | "login"; nickname: string; password: string; email: string };

export function AuthScreen({ onAuthed }: { onAuthed: (nickname: string) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [stage, setStage] = useState<Stage>({ kind: "form" });
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [needEmailFor, setNeedEmailFor] = useState<Account | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const requestCode = useServerFn(requestEmailCode);

  const startCodeStep = async (purpose: "register" | "login", nick: string, pwd: string, mail: string) => {
    setBusy(true);
    setError("");
    const res = await requestCode({ data: { email: mail, purpose } });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Could not send code.");
      return;
    }
    setStage({ kind: "code", purpose, nickname: nick, password: pwd, email: mail });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const nick = nickname.trim();
    const mail = email.trim().toLowerCase();
    if (!nick || !password) {
      setError("Nickname and password required");
      return;
    }
    const accounts = loadAccounts();

    if (mode === "register") {
      if (!mail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
        setError("Valid email required");
        return;
      }
      if (accounts.some((a) => a.nickname.toLowerCase() === nick.toLowerCase())) {
        setError("Nickname already taken");
        return;
      }
      if (accounts.some((a) => a.email?.toLowerCase() === mail)) {
        setError("Email already used");
        return;
      }
      await startCodeStep("register", nick, password, mail);
      return;
    }

    // login
    const found = accounts.find(
      (a) => a.nickname.toLowerCase() === nick.toLowerCase() && a.password === password,
    );
    if (!found) {
      setError("Invalid nickname or password");
      return;
    }
    if (!found.email) {
      // legacy account: force them to add+verify an email first
      setNeedEmailFor(found);
      return;
    }
    await startCodeStep("login", found.nickname, found.password, found.email);
  };

  const submitLegacyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!needEmailFor) return;
    const mail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      setError("Valid email required");
      return;
    }
    const accounts = loadAccounts();
    if (accounts.some((a) => a.email?.toLowerCase() === mail && a.nickname !== needEmailFor.nickname)) {
      setError("Email already used");
      return;
    }
    await startCodeStep("register", needEmailFor.nickname, needEmailFor.password, mail);
  };

  const finishAuth = (nick: string, pwd: string, mail: string, purpose: "register" | "login") => {
    const accounts = loadAccounts();
    if (purpose === "register" || needEmailFor) {
      // save / update account
      const idx = accounts.findIndex((a) => a.nickname.toLowerCase() === nick.toLowerCase());
      const updated: Account = { nickname: nick, password: pwd, email: mail };
      if (idx >= 0) accounts[idx] = updated;
      else accounts.push(updated);
      saveAccounts(accounts);
    }
    localStorage.setItem(CURRENT_KEY, nick);
    setActiveUser(nick);
    migrateLegacyIfNeeded(nick);
    setNeedEmailFor(null);
    onAuthed(nick);
  };

  return (
    <div className="flex h-full w-full items-center justify-center bg-background p-6 font-pixel text-foreground">
      {stage.kind === "code" ? (
        <CodeStep
          email={stage.email}
          purpose={stage.purpose}
          onCancel={() => setStage({ kind: "form" })}
          onVerified={() => finishAuth(stage.nickname, stage.password, stage.email, stage.purpose)}
        />
      ) : needEmailFor ? (
        <form
          onSubmit={submitLegacyEmail}
          className="flex w-full max-w-sm flex-col items-center gap-3 border-2 border-border bg-background p-6"
        >
          <div className="text-2xl tracking-[0.3em]">VERIFY EMAIL</div>
          <div className="text-center text-[10px] uppercase tracking-widest text-muted-foreground">
            Add an email to <span className="text-foreground">{needEmailFor.nickname}</span> to keep playing.
          </div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="EMAIL"
            autoComplete="email"
            className="w-full border-2 border-border bg-background px-3 py-2 text-[11px] uppercase tracking-widest text-foreground outline-none focus:border-accent"
          />
          {error && <div className="text-[10px] uppercase tracking-widest text-destructive">{error}</div>}
          <button
            type="submit"
            disabled={busy}
            className="mt-1 w-full border-2 border-border bg-foreground px-5 py-2 text-[10px] uppercase tracking-[0.3em] text-background hover:bg-accent disabled:opacity-50"
          >
            {busy ? "Sending…" : "▶ Send code"}
          </button>
          <button
            type="button"
            onClick={() => { setNeedEmailFor(null); setError(""); setEmail(""); }}
            className="text-[9px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </form>
      ) : (
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
          {mode === "register" && (
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="EMAIL"
              autoComplete="email"
              className="w-full border-2 border-border bg-background px-3 py-2 text-[11px] uppercase tracking-widest text-foreground outline-none focus:border-accent"
            />
          )}
          {error && <div className="text-[10px] uppercase tracking-widest text-destructive">{error}</div>}
          <button
            type="submit"
            disabled={busy}
            className="mt-1 w-full border-2 border-border bg-foreground px-5 py-2 text-[10px] uppercase tracking-[0.3em] text-background hover:bg-accent disabled:opacity-50"
          >
            {busy ? "Sending…" : mode === "login" ? "▶ Login" : "▶ Register"}
          </button>
          <button
            type="button"
            onClick={() => {
              setError("");
              setEmail("");
              setMode(mode === "login" ? "register" : "login");
            }}
            className="text-[9px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            {mode === "login" ? "Need an account? Register" : "Have an account? Login"}
          </button>
        </form>
      )}
    </div>
  );
}

function CodeStep({
  email,
  purpose,
  onCancel,
  onVerified,
}: {
  email: string;
  purpose: "register" | "login";
  onCancel: () => void;
  onVerified: () => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(30);
  const inputRef = useRef<HTMLInputElement>(null);

  const verify = useServerFn(verifyEmailCode);
  const request = useServerFn(requestEmailCode);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError("Enter the 6-digit code");
      return;
    }
    setBusy(true);
    setError("");
    const res = await verify({ data: { email, purpose, code } });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Wrong code.");
      return;
    }
    onVerified();
  };

  const resend = async () => {
    if (cooldown > 0 || busy) return;
    setBusy(true);
    setError("");
    const res = await request({ data: { email, purpose } });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Could not resend.");
      return;
    }
    setCooldown(30);
  };

  return (
    <form
      onSubmit={submit}
      className="flex w-full max-w-sm flex-col items-center gap-3 border-2 border-border bg-background p-6"
    >
      <div className="text-2xl tracking-[0.3em]">ENTER CODE</div>
      <div className="text-center text-[10px] uppercase tracking-widest text-muted-foreground">
        Sent to <span className="text-foreground">{maskEmail(email)}</span>
      </div>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        placeholder="••••••"
        className="w-full border-2 border-border bg-background px-3 py-3 text-center text-2xl tracking-[0.5em] text-foreground outline-none focus:border-accent"
      />
      {error && <div className="text-[10px] uppercase tracking-widest text-destructive">{error}</div>}
      <button
        type="submit"
        disabled={busy}
        className="mt-1 w-full border-2 border-border bg-foreground px-5 py-2 text-[10px] uppercase tracking-[0.3em] text-background hover:bg-accent disabled:opacity-50"
      >
        {busy ? "Checking…" : "▶ Verify"}
      </button>
      <button
        type="button"
        onClick={resend}
        disabled={cooldown > 0 || busy}
        className="text-[9px] uppercase tracking-widest text-muted-foreground hover:text-foreground disabled:opacity-40"
      >
        {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="text-[9px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
      >
        ← Back
      </button>
    </form>
  );
}
