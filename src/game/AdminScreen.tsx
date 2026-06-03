import { useState, useEffect } from "react";
import { STORE_ITEMS } from "./inventory";

const ACCOUNTS_KEY = "parry.accounts";
const LB_KEY = "parry.leaderboard";

type Account = { nickname: string; password: string };
type LBEntry = { nickname: string; gems: number };

function loadAccounts(): Account[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    return raw ? (JSON.parse(raw) as Account[]) : [];
  } catch { return []; }
}
function loadLeaderboard(): LBEntry[] {
  try {
    const raw = localStorage.getItem(LB_KEY);
    return raw ? (JSON.parse(raw) as LBEntry[]) : [];
  } catch { return []; }
}

// Build a per-user storage key matching storage.ts lsKey() format.
const userKey = (base: string, nick: string) => `${base}::user::${nick.toLowerCase()}`;

function readNum(base: string, nick: string): number {
  return Number(localStorage.getItem(userKey(base, nick)) ?? 0) || 0;
}
function writeNum(base: string, nick: string, n: number) {
  localStorage.setItem(userKey(base, nick), String(Math.max(0, Math.floor(n))));
}
function readOwned(nick: string): string[] {
  try { return JSON.parse(localStorage.getItem(userKey("parry.inventory", nick)) || "[]"); }
  catch { return []; }
}
function writeOwned(nick: string, arr: string[]) {
  localStorage.setItem(userKey("parry.inventory", nick), JSON.stringify(arr));
}
function readUpgrades(nick: string): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(userKey("parry.upgradeCounts", nick)) || "{}"); }
  catch { return {}; }
}
function writeUpgrades(nick: string, counts: Record<string, number>) {
  localStorage.setItem(userKey("parry.upgradeCounts", nick), JSON.stringify(counts));
}

function syncGemsToLeaderboard(nick: string, gems: number) {
  const lb = loadLeaderboard();
  const idx = lb.findIndex((e) => e.nickname.toLowerCase() === nick.toLowerCase());
  if (idx >= 0) {
    lb[idx].gems = gems;
  } else if (gems > 0) {
    lb.push({ nickname: nick, gems });
  }
  localStorage.setItem(LB_KEY, JSON.stringify(lb));
}

export function AdminScreen({ onBack }: { onBack: () => void }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [leaderboard, setLeaderboard] = useState<LBEntry[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [target, setTarget] = useState<string>("");
  const [credits, setCredits] = useState(0);
  const [gems, setGems] = useState(0);
  const [owned, setOwned] = useState<string[]>([]);
  const [upgrades, setUpgrades] = useState<Record<string, number>>({});
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    const accs = loadAccounts();
    setAccounts(accs);
    setLeaderboard(loadLeaderboard());
    if (accs.length && !target) setTarget(accs[0].nickname);
  }, []);

  useEffect(() => {
    if (!target) return;
    setCredits(readNum("parry-credits", target));
    setGems(readNum("parry-gems", target));
    setOwned(readOwned(target));
    setUpgrades(readUpgrades(target));
  }, [target]);

  const flash = (t: string) => { setMsg(t); setTimeout(() => setMsg(""), 1500); };

  const saveCredits = (n: number) => {
    writeNum("parry-credits", target, n);
    setCredits(Math.max(0, Math.floor(n)));
    flash(`Set credits to ${Math.max(0, Math.floor(n))}`);
  };
  const saveGems = (n: number) => {
    const v = Math.max(0, Math.floor(n));
    writeNum("parry-gems", target, v);
    setGems(v);
    syncGemsToLeaderboard(target, v);
    setLeaderboard(loadLeaderboard());
    flash(`Set gems to ${v}`);
  };
  const toggleItem = (id: string) => {
    const set = new Set(owned);
    if (set.has(id)) set.delete(id); else set.add(id);
    const arr = Array.from(set);
    writeOwned(target, arr);
    setOwned(arr);
    flash(set.has(id) ? `Granted ${id}` : `Removed ${id}`);
  };
  const setUpgradeLevel = (id: string, n: number) => {
    const v = Math.max(0, Math.floor(n));
    const next = { ...upgrades, [id]: v };
    if (v === 0) delete next[id];
    writeUpgrades(target, next);
    setUpgrades(next);
    flash(`${id} set to ${v}`);
  };

  const deleteAccount = (nickname: string) => {
    const updated = accounts.filter((a) => a.nickname.toLowerCase() !== nickname.toLowerCase());
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(updated));
    setAccounts(updated);
    setConfirmDelete(null);
    if (target.toLowerCase() === nickname.toLowerCase()) setTarget(updated[0]?.nickname ?? "");
  };

  const resetLeaderboard = () => {
    localStorage.removeItem(LB_KEY);
    setLeaderboard([]);
  };

  const skins = STORE_ITEMS.filter((i) => i.kind === "skin");
  const abilities = STORE_ITEMS.filter((i) => i.kind === "ability");
  const upgradeItems = STORE_ITEMS.filter((i) => i.kind === "upgrade");

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
          {accounts.length} accounts
        </div>
      </div>

      {msg && (
        <div className="w-full max-w-2xl border-2 border-accent bg-background p-2 text-center text-[10px] uppercase tracking-widest text-accent">
          {msg}
        </div>
      )}

      {/* Target picker */}
      <div className="w-full max-w-2xl border-2 border-border bg-background p-4">
        <div className="mb-2 text-[11px] uppercase tracking-[0.3em]">Target Account</div>
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="w-full border-2 border-border bg-background p-2 text-[11px] uppercase tracking-widest text-foreground"
        >
          {accounts.length === 0 && <option value="">No accounts</option>}
          {accounts.map((a) => (
            <option key={a.nickname} value={a.nickname}>{a.nickname}</option>
          ))}
        </select>
      </div>

      {target && (
        <>
          {/* Currency */}
          <div className="w-full max-w-2xl border-2 border-border bg-background p-4">
            <div className="mb-3 text-[11px] uppercase tracking-[0.3em]">Currency</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="mb-1 text-[9px] uppercase tracking-widest text-muted-foreground">Credits</div>
                <div className="flex gap-1">
                  <input
                    type="number"
                    value={credits}
                    onChange={(e) => setCredits(Number(e.target.value))}
                    className="w-full border-2 border-border bg-background p-2 text-[11px] text-foreground"
                  />
                  <button onClick={() => saveCredits(credits)} className="border-2 border-border bg-background px-3 text-[10px] uppercase hover:bg-foreground hover:text-background">Set</button>
                </div>
                <div className="mt-1 flex gap-1">
                  <button onClick={() => saveCredits(credits + 100)} className="flex-1 border border-border px-2 py-1 text-[9px] uppercase hover:bg-foreground hover:text-background">+100</button>
                  <button onClick={() => saveCredits(credits + 1000)} className="flex-1 border border-border px-2 py-1 text-[9px] uppercase hover:bg-foreground hover:text-background">+1000</button>
                </div>
              </div>
              <div>
                <div className="mb-1 text-[9px] uppercase tracking-widest text-muted-foreground">Gems</div>
                <div className="flex gap-1">
                  <input
                    type="number"
                    value={gems}
                    onChange={(e) => setGems(Number(e.target.value))}
                    className="w-full border-2 border-border bg-background p-2 text-[11px] text-foreground"
                  />
                  <button onClick={() => saveGems(gems)} className="border-2 border-border bg-background px-3 text-[10px] uppercase hover:bg-foreground hover:text-background">Set</button>
                </div>
                <div className="mt-1 flex gap-1">
                  <button onClick={() => saveGems(gems + 10)} className="flex-1 border border-border px-2 py-1 text-[9px] uppercase hover:bg-foreground hover:text-background">+10</button>
                  <button onClick={() => saveGems(gems + 100)} className="flex-1 border border-border px-2 py-1 text-[9px] uppercase hover:bg-foreground hover:text-background">+100</button>
                </div>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="w-full max-w-2xl border-2 border-border bg-background p-4">
            <div className="mb-3 text-[11px] uppercase tracking-[0.3em]">Items (toggle to grant/remove)</div>
            <div className="mb-2 text-[9px] uppercase tracking-widest text-muted-foreground">Abilities</div>
            <div className="mb-3 flex flex-wrap gap-2">
              {abilities.map((i) => (
                <button
                  key={i.id}
                  onClick={() => toggleItem(i.id)}
                  className={`border-2 px-2 py-1 text-[9px] uppercase tracking-widest ${owned.includes(i.id) ? "border-accent bg-accent text-background" : "border-border bg-background text-foreground hover:bg-foreground hover:text-background"}`}
                >
                  {i.name}
                </button>
              ))}
            </div>
            <div className="mb-2 text-[9px] uppercase tracking-widest text-muted-foreground">Skins</div>
            <div className="flex flex-wrap gap-2">
              {skins.map((i) => (
                <button
                  key={i.id}
                  onClick={() => toggleItem(i.id)}
                  className={`border-2 px-2 py-1 text-[9px] uppercase tracking-widest ${owned.includes(i.id) ? "border-accent bg-accent text-background" : "border-border bg-background text-foreground hover:bg-foreground hover:text-background"}`}
                >
                  {i.name}
                </button>
              ))}
            </div>
          </div>

          {/* Upgrades */}
          <div className="w-full max-w-2xl border-2 border-border bg-background p-4">
            <div className="mb-3 text-[11px] uppercase tracking-[0.3em]">Upgrades</div>
            <div className="flex flex-col gap-2">
              {upgradeItems.map((i) => {
                const lvl = upgrades[i.id] ?? 0;
                return (
                  <div key={i.id} className="flex items-center justify-between border border-border p-2">
                    <div className="text-[10px] uppercase tracking-widest">{i.name}</div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setUpgradeLevel(i.id, lvl - 1)} className="border border-border px-2 py-1 text-[10px] hover:bg-foreground hover:text-background">−</button>
                      <input
                        type="number"
                        value={lvl}
                        onChange={(e) => setUpgradeLevel(i.id, Number(e.target.value))}
                        className="w-16 border border-border bg-background p-1 text-center text-[10px]"
                      />
                      <button onClick={() => setUpgradeLevel(i.id, lvl + 1)} className="border border-border px-2 py-1 text-[10px] hover:bg-foreground hover:text-background">+</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Accounts list */}
      <div className="w-full max-w-2xl border-2 border-border bg-background p-4">
        <div className="mb-3 text-[11px] uppercase tracking-[0.3em]">Registered Accounts</div>
        <div className="flex flex-col gap-2">
          {accounts.length === 0 && (
            <div className="text-center text-[9px] uppercase tracking-widest text-muted-foreground">
              No accounts registered
            </div>
          )}
          {accounts.map((a) => (
            <div key={a.nickname} className="flex items-center justify-between border border-border bg-background p-2">
              <div className="text-[11px] uppercase tracking-widest">{a.nickname}</div>
              <div className="flex items-center gap-2">
                <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
                  {leaderboard.find((l) => l.nickname.toLowerCase() === a.nickname.toLowerCase())?.gems ?? 0} gems
                </div>
                <button
                  onClick={() => setTarget(a.nickname)}
                  className="border border-border px-2 py-1 text-[8px] uppercase tracking-widest hover:bg-foreground hover:text-background"
                >
                  Edit
                </button>
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
