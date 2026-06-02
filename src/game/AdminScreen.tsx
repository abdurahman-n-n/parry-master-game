import { useState, useEffect } from "react";

const ACCOUNTS_KEY = "parry.accounts";
const LB_KEY = "parry.leaderboard";

type Account = { nickname: string; password: string };

function loadAccounts(): Account[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    return raw ? (JSON.parse(raw) as Account[]) : [];
  } catch {
    return [];
  }
}

function loadLeaderboard() {
  try {
    const raw = localStorage.getItem(LB_KEY);
    return raw ? (JSON.parse(raw) as { nickname: string; gems: number; firstGemAt: number }[]) : [];
  } catch {
    return [];
  }
}

export function AdminScreen({ onBack }: { onBack: () => void }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [leaderboard, setLeaderboard] = useState<{ nickname: string; gems: number; firstGemAt: number }[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    setAccounts(loadAccounts());
    setLeaderboard(loadLeaderboard());
  }, []);

  const totalAccounts = accounts.length;
  const totalGems = leaderboard.reduce((sum, e) => sum + e.gems, 0);

  const deleteAccount = (nickname: string) => {
    const updated = accounts.filter((a) => a.nickname.toLowerCase() !== nickname.toLowerCase());
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(updated));
    setAccounts(updated);
    setConfirmDelete(null);
  };

  const resetLeaderboard = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(LB_KEY);
      setLeaderboard([]);
    }
  };

  return (
    <div className="flex h-full w-full flex-col items-center gap-4 overflow-auto bg-background p-6 font-pixel text-foreground">
      <div className="flex w-full max-w-2xl items-center justify-between">
        <button
          onClick={onBack}
          className="border-2 border-border bg-background px-3 py-1 text-[10px] uppercase tracking-widest hover:bg-foreground hover:text-background"
        >
          ← Back
        </button>
        <div className="text-2xl tracking-[0.3em]">ADMIN</div>
        <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
          {totalAccounts} accounts
        </div>
      </div>

      <div className="grid w-full max-w-2xl grid-cols-2 gap-3">
        <div className="border-2 border-border bg-background p-4 text-center">
          <div className="text-2xl text-accent">{totalAccounts}</div>
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Total Accounts</div>
        </div>
        <div className="border-2 border-border bg-background p-4 text-center">
          <div className="text-2xl text-accent">{totalGems}</div>
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Total Gems</div>
        </div>
      </div>

      <div className="w-full max-w-2xl border-2 border-border bg-background p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-[0.3em]">Registered Accounts</div>
        </div>
        <div className="flex flex-col gap-2">
          {accounts.length === 0 && (
            <div className="text-center text-[9px] uppercase tracking-widest text-muted-foreground">
              No accounts registered
            </div>
          )}
          {accounts.map((a) => (
            <div
              key={a.nickname}
              className="flex items-center justify-between border border-border bg-background p-2"
            >
              <div className="text-[11px] uppercase tracking-widest">{a.nickname}</div>
              <div className="flex items-center gap-2">
                <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
                  {leaderboard.find((l) => l.nickname.toLowerCase() === a.nickname.toLowerCase())?.gems ?? 0} gems
                </div>
                <button
                  onClick={() => setConfirmDelete(a.nickname)}
                  className="border border-destructive px-2 py-1 text-[8px] uppercase tracking-widest text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full max-w-2xl border-2 border-border bg-background p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-[0.3em]">Leaderboard</div>
          <button
            onClick={resetLeaderboard}
            className="border border-destructive px-3 py-1 text-[8px] uppercase tracking-widest text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            Reset
          </button>
        </div>
        <div className="flex flex-col gap-1">
          {leaderboard
            .sort((a, b) => b.gems - a.gems || a.firstGemAt - b.firstGemAt)
            .map((e, i) => (
              <div key={e.nickname} className="flex items-center justify-between border border-border p-2">
                <div className="flex items-center gap-3">
                  <div className="w-6 text-center text-[10px] text-muted-foreground">{i + 1}</div>
                  <div className="text-[10px] uppercase tracking-widest">{e.nickname}</div>
                </div>
                <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
                  {e.gems} gem{e.gems !== 1 ? "s" : ""}
                </div>
              </div>
            ))}
          {leaderboard.length === 0 && (
            <div className="text-center text-[9px] uppercase tracking-widest text-muted-foreground">
              No leaderboard entries
            </div>
          )}
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-6 font-pixel">
          <div className="flex w-full max-w-sm flex-col items-center gap-4 border-2 border-border bg-background p-6 text-center">
            <div className="text-[12px] uppercase tracking-[0.2em] text-foreground">
              Delete account "{confirmDelete}"?
            </div>
            <div className="text-[9px] uppercase tracking-widest text-destructive">
              This cannot be undone.
            </div>
            <div className="flex w-full gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 border-2 border-border bg-background px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-foreground hover:bg-foreground hover:text-background"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteAccount(confirmDelete)}
                className="flex-1 border-2 border-border bg-destructive px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-destructive-foreground hover:bg-destructive/80"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
