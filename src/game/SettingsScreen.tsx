import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lsKey } from "./storage";

const STORAGE_KEY = "parry-accent-rgb";

const DEFAULT_RGB: [number, number, number] = [178, 132, 240];

export function getSavedAccent(): [number, number, number] {
  if (typeof window === "undefined") return DEFAULT_RGB;
  try {
    const raw = localStorage.getItem(lsKey(STORAGE_KEY));
    if (!raw) return DEFAULT_RGB;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length === 3) {
      return parsed.map((n) => Math.max(0, Math.min(255, Number(n) | 0))) as [
        number,
        number,
        number,
      ];
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_RGB;
}

export function applyAccent(rgb: [number, number, number]) {
  const [r, g, b] = rgb;
  const root = document.documentElement.style;
  root.setProperty("--background", `rgb(${r}, ${g}, ${b})`);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const isLight = luminance > 0.55;
  const fg = isLight ? "rgb(20, 20, 24)" : "rgb(240, 240, 245)";
  const muted = isLight ? "rgba(20, 20, 24, 0.6)" : "rgba(240, 240, 245, 0.6)";
  const border = isLight ? "rgba(20, 20, 24, 0.25)" : "rgba(240, 240, 245, 0.25)";
  root.setProperty("--foreground", fg);
  root.setProperty("--muted-foreground", muted);
  root.setProperty("--border", border);
}

function saveAccent(rgb: [number, number, number]) {
  localStorage.setItem(lsKey(STORAGE_KEY), JSON.stringify(rgb));
}

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const [rgb, setRgb] = useState<[number, number, number]>(() => getSavedAccent());
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [busyProfile, setBusyProfile] = useState(false);
  const [busyPassword, setBusyPassword] = useState(false);

  useEffect(() => {
    applyAccent(rgb);
  }, [rgb]);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (!alive || !user) return;

      const nextEmail = user.email ?? "";
      setEmail(nextEmail);
      const metadataNickname = typeof user.user_metadata?.nickname === "string"
        ? user.user_metadata.nickname
        : "";
      setNickname(metadataNickname || nextEmail.split("@")[0] || "");
    });
    return () => {
      alive = false;
    };
  }, []);

  const setChannel = (idx: 0 | 1 | 2, v: number) => {
    const next = [...rgb] as [number, number, number];
    next[idx] = Math.max(0, Math.min(255, v | 0));
    setRgb(next);
    applyAccent(next);
    saveAccent(next);
  };

  const save = () => {
    saveAccent(rgb);
    onBack();
  };

  const reset = () => {
    setRgb(DEFAULT_RGB);
    applyAccent(DEFAULT_RGB);
    saveAccent(DEFAULT_RGB);
  };

  const saveNickname = async () => {
    setProfileMessage("");
    const nextNickname = nickname.trim();
    if (!nextNickname) {
      setProfileMessage("Nickname required");
      return;
    }
    if (/abdurahman/i.test(nextNickname) && !email.toLowerCase().startsWith("abdurahman")) {
      setProfileMessage("That nickname is reserved");
      return;
    }
    setBusyProfile(true);
    try {
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { nickname: nextNickname },
      });
      if (metadataError) throw metadataError;

      setNickname(nextNickname);
      setProfileMessage("Nickname saved");
    } catch (err) {
      setProfileMessage(err instanceof Error ? err.message : "Could not save nickname");
    } finally {
      setBusyProfile(false);
    }
  };

  const changePassword = async () => {
    setPasswordMessage("");
    if (newPassword.length < 6) {
      setPasswordMessage("Use at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage("Passwords do not match");
      return;
    }
    setBusyPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Password changed");
    } catch (err) {
      setPasswordMessage(err instanceof Error ? err.message : "Could not change password");
    } finally {
      setBusyPassword(false);
    }
  };

  const CHANNELS: { label: string; key: "R" | "G" | "B"; idx: 0 | 1 | 2 }[] = [
    { label: "Red", key: "R", idx: 0 },
    { label: "Green", key: "G", idx: 1 },
    { label: "Blue", key: "B", idx: 2 },
  ];

  return (
    <div className="flex h-full w-full items-center justify-center overflow-auto bg-background p-6 font-pixel text-foreground">
      <div className="flex w-full max-w-md flex-col items-center gap-4 border-2 border-border bg-background p-6">
        <div className="flex w-full items-center justify-between">
          <button
            onClick={onBack}
            className="border border-border bg-background px-2 py-1 text-[10px] uppercase tracking-widest hover:bg-foreground hover:text-background"
          >
            Back
          </button>
          <div className="text-[10px] uppercase tracking-[0.3em]">Settings</div>
          <div className="w-[60px]" />
        </div>

        <div className="flex w-full flex-col gap-3 border-2 border-border p-3">
          <div className="text-[10px] uppercase tracking-[0.3em]">Account</div>
          <div className="w-full truncate text-[9px] uppercase tracking-widest text-muted-foreground">
            Email: {email || "Unknown"}
          </div>
          <label className="flex w-full flex-col gap-1 text-[9px] uppercase tracking-widest text-muted-foreground">
            Nickname
            <input
              type="text"
              value={nickname}
              maxLength={32}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full border-2 border-border bg-background px-3 py-2 text-[11px] text-foreground outline-none focus:border-accent"
            />
          </label>
          {profileMessage && (
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
              {profileMessage}
            </div>
          )}
          <button
            onClick={saveNickname}
            disabled={busyProfile}
            className="border-2 border-border bg-background px-3 py-2 text-[10px] uppercase tracking-widest hover:bg-foreground hover:text-background disabled:opacity-50"
          >
            Save Nickname
          </button>
        </div>

        <div className="flex w-full flex-col gap-3 border-2 border-border p-3">
          <div className="text-[10px] uppercase tracking-[0.3em]">Password</div>
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
            Current password is protected
          </div>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="NEW PASSWORD"
            autoComplete="new-password"
            className="w-full border-2 border-border bg-background px-3 py-2 text-[11px] text-foreground outline-none focus:border-accent"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="CONFIRM PASSWORD"
            autoComplete="new-password"
            className="w-full border-2 border-border bg-background px-3 py-2 text-[11px] text-foreground outline-none focus:border-accent"
          />
          {passwordMessage && (
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
              {passwordMessage}
            </div>
          )}
          <button
            onClick={changePassword}
            disabled={busyPassword}
            className="border-2 border-border bg-background px-3 py-2 text-[10px] uppercase tracking-widest hover:bg-foreground hover:text-background disabled:opacity-50"
          >
            Change Password
          </button>
        </div>

        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Background Color
        </div>

        <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
          Type a value from 0 to 255 for each channel
        </div>

        <div className="flex w-full flex-col gap-3">
          {CHANNELS.map(({ label, key, idx }) => (
            <label
              key={key}
              className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground"
            >
              <span className="w-16 text-foreground">{label}</span>
              <input
                type="number"
                min={0}
                max={255}
                value={rgb[idx]}
                onChange={(e) => setChannel(idx, Number(e.target.value))}
                className="w-24 border-2 border-border bg-background px-2 py-2 text-[14px] text-foreground"
              />
              <input
                type="range"
                min={0}
                max={255}
                value={rgb[idx]}
                onChange={(e) => setChannel(idx, Number(e.target.value))}
                className="flex-1 accent-foreground"
              />
            </label>
          ))}
        </div>

        <div className="flex w-full items-center gap-3">
          <div
            className="h-10 flex-1 border-2 border-border"
            style={{ background: `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})` }}
          />
          <span className="text-[10px] uppercase tracking-widest text-foreground">
            #{rgb.map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase()}
          </span>
        </div>

        <div className="flex w-full gap-2">
          <button
            onClick={reset}
            className="flex-1 border-2 border-border bg-background px-3 py-2 text-[10px] uppercase tracking-widest hover:bg-foreground hover:text-background"
          >
            Reset
          </button>
          <button
            onClick={save}
            className="flex-1 border-2 border-border bg-foreground px-3 py-2 text-[10px] uppercase tracking-widest text-background hover:bg-accent"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
