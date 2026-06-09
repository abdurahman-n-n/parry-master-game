import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { resetSeason } from "@/lib/cloudSave.functions";
import { getCurrentUser } from "./AuthScreen";

const LB_KEY = "parry.leaderboard";

export function AdminScreen({ onBack }: { onBack: () => void }) {
  const [msg, setMsg] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const resetSeasonFn = useServerFn(resetSeason);
  const user = getCurrentUser();

  const flash = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(""), 1500);
  };

  const startNewSeason = async () => {
    try {
      await resetSeasonFn();
    } catch {
      flash("Failed to start new season");
      return;
    }

    const prefixes = [
      "parry.lifetimeGems::user::",
      "parry.infinite.bestWave::user::",
      "parry.infinite.bestWaveAt::user::",
      "parry-gems::user::",
    ];
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && prefixes.some((p) => k.startsWith(p))) toRemove.push(k);
    }
    for (const k of toRemove) localStorage.removeItem(k);
    localStorage.removeItem(LB_KEY);
    setConfirmReset(false);
    flash("New season started");
  };

  return (
    <div className="flex h-full w-full flex-col items-center gap-4 overflow-auto bg-background p-6 font-pixel text-foreground">
      <div className="flex w-full max-w-2xl items-center justify-between">
        <button
          onClick={onBack}
          className="border-2 border-border bg-background px-3 py-1 text-[10px] uppercase tracking-widest hover:bg-foreground hover:text-background"
        >
          Back
        </button>
        <div className="text-2xl tracking-[0.3em]">ADMIN</div>
        <div className="max-w-[160px] truncate text-right text-[9px] uppercase tracking-widest text-muted-foreground">
          {user}
        </div>
      </div>

      {msg && (
        <div className="w-full max-w-2xl border-2 border-accent bg-background p-2 text-center text-[10px] uppercase tracking-widest text-accent">
          {msg}
        </div>
      )}

      <div className="w-full max-w-2xl border-2 border-border bg-background p-4">
        <div className="mb-3 text-[11px] uppercase tracking-[0.3em]">Season</div>
        <div className="mb-2 text-[8px] uppercase tracking-widest text-muted-foreground">
          Wipes all players' lifetime gems and best waves
        </div>
        <button
          onClick={() => setConfirmReset(true)}
          className="border border-destructive px-3 py-1 text-[8px] uppercase tracking-widest text-destructive hover:bg-destructive hover:text-destructive-foreground"
        >
          Start New Season
        </button>
      </div>

      {confirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-6 font-pixel">
          <div className="flex w-full max-w-sm flex-col items-center gap-4 border-2 border-border bg-background p-6 text-center">
            <div className="text-[12px] uppercase tracking-[0.2em] text-foreground">
              Start a new season?
            </div>
            <div className="text-[9px] uppercase tracking-widest text-destructive">
              All players' lifetime gems and best waves will be reset. This cannot be undone.
            </div>
            <div className="flex w-full gap-3">
              <button
                onClick={() => setConfirmReset(false)}
                className="flex-1 border-2 border-border bg-background px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-foreground hover:bg-foreground hover:text-background"
              >
                Cancel
              </button>
              <button
                onClick={startNewSeason}
                className="flex-1 border-2 border-border bg-destructive px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-destructive-foreground hover:bg-destructive/80"
              >
                Start
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
