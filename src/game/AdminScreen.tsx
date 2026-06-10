import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { resetSeason } from "@/lib/cloudSave.functions";
import { isAdminEmail } from "@/lib/admin";
import { getCurrentUser } from "./AuthScreen";
import { addCredits, addGems, getCredits, getGems, setCredits, setGems } from "./Currency";
import {
  STORE_ITEMS,
  getEquippedSkinColor,
  getOwned,
  getUpgradeCount,
  grantItem,
  removeItem,
  setEquippedSkin,
  setUpgradeCount,
} from "./inventory";
import { ACHIEVEMENTS, TITLES, getUnlockedAchievements, removeAchievement, setEquippedTitle, unlockAchievement } from "./achievements";
import { DEFAULT_CHARACTER, TOTAL_LEVELS, getBeatenLevels } from "./levels";
import { lsKey } from "./storage";
import { PixelCharacter } from "./PixelCharacters";
import { PixelEnemy } from "./PixelEnemy";
import { playSfx } from "./sfx";

const LB_KEY = "parry.leaderboard";
const POSES = ["idle", "walk", "strike", "hit"] as const;

export function AdminScreen({ onBack }: { onBack: () => void }) {
  const [msg, setMsg] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [amount, setAmount] = useState(1000);
  const [wave, setWave] = useState(75);
  const [poseIndex, setPoseIndex] = useState(0);
  const [, force] = useState(0);
  const resetSeasonFn = useServerFn(resetSeason);
  const user = getCurrentUser();
  const isAdmin = isAdminEmail(user);
  const credits = getCredits();
  const gems = getGems();
  const owned = getOwned();
  const unlockedAchievements = getUnlockedAchievements();
  const beaten = getBeatenLevels();
  const skinColor = getEquippedSkinColor() ?? "oklch(0.85 0.17 90)";

  useEffect(() => {
    const id = setInterval(() => setPoseIndex((n) => (n + 1) % POSES.length), 650);
    return () => clearInterval(id);
  }, []);

  const refresh = () => force((n) => n + 1);

  const flash = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(""), 1500);
  };

  const mutate = (label: string, fn: () => void) => {
    fn();
    refresh();
    flash(label);
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

  const setAllLevels = (complete: boolean) => {
    const levels = complete ? Array.from({ length: TOTAL_LEVELS }, (_, i) => i + 1) : [];
    localStorage.setItem(lsKey("parry.beatenLevels"), JSON.stringify(levels));
  };

  const setBestWave = (nextWave: number) => {
    localStorage.setItem(lsKey("parry.infinite.bestWave"), String(Math.max(0, Math.round(nextWave))));
    localStorage.setItem(lsKey("parry.infinite.bestWaveAt"), String(Date.now()));
  };

  if (!isAdmin) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background p-6 font-pixel text-foreground">
        <div className="flex w-full max-w-sm flex-col items-center gap-4 border-2 border-border bg-background p-6 text-center">
          <div className="text-2xl uppercase tracking-[0.3em]">Denied</div>
          <button
            onClick={onBack}
            className="border-2 border-border bg-background px-4 py-2 text-[10px] uppercase tracking-widest hover:bg-foreground hover:text-background"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center gap-4 overflow-auto bg-background p-6 font-pixel text-foreground">
      <div className="flex w-full max-w-4xl items-center justify-between">
        <button
          onClick={onBack}
          className="border-2 border-border bg-background px-3 py-1 text-[10px] uppercase tracking-widest hover:bg-foreground hover:text-background"
        >
          Back
        </button>
        <div className="text-2xl tracking-[0.3em]">ADMIN</div>
        <div className="max-w-[180px] truncate text-right text-[9px] uppercase tracking-widest text-muted-foreground">
          {user}
        </div>
      </div>

      {msg && (
        <div className="w-full max-w-4xl border-2 border-accent bg-background p-2 text-center text-[10px] uppercase tracking-widest text-accent">
          {msg}
        </div>
      )}

      <div className="grid w-full max-w-4xl grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Wallet">
          <div className="grid grid-cols-2 gap-2 text-[10px] uppercase tracking-widest">
            <div className="border border-border p-3">Credits: {credits}</div>
            <div className="border border-border p-3">Gems: {gems}</div>
          </div>
          <label className="mt-3 flex flex-col gap-1 text-[9px] uppercase tracking-widest text-muted-foreground">
            Amount
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="border-2 border-border bg-background px-3 py-2 text-foreground outline-none"
            />
          </label>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <AdminButton onClick={() => mutate("Credits added", () => addCredits(amount))}>Give Credits</AdminButton>
            <AdminButton onClick={() => mutate("Credits set", () => setCredits(amount))}>Set Credits</AdminButton>
            <AdminButton onClick={() => mutate("Gems added", () => addGems(amount))}>Give Gems</AdminButton>
            <AdminButton onClick={() => mutate("Gems set", () => setGems(amount))}>Set Gems</AdminButton>
          </div>
        </Panel>

        <Panel title="Progress">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Levels cleared: {beaten.size}/{TOTAL_LEVELS}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <AdminButton onClick={() => mutate("All levels unlocked", () => setAllLevels(true))}>Give All Levels</AdminButton>
            <AdminButton onClick={() => mutate("Levels cleared", () => setAllLevels(false))}>Remove Levels</AdminButton>
          </div>
          <label className="mt-3 flex flex-col gap-1 text-[9px] uppercase tracking-widest text-muted-foreground">
            Best Infinite Wave
            <input
              type="number"
              value={wave}
              onChange={(e) => setWave(Number(e.target.value))}
              className="border-2 border-border bg-background px-3 py-2 text-foreground outline-none"
            />
          </label>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <AdminButton onClick={() => mutate("Best wave set", () => setBestWave(wave))}>Set Wave</AdminButton>
            <AdminButton onClick={() => mutate("Best wave removed", () => setBestWave(0))}>Remove Wave</AdminButton>
          </div>
        </Panel>

        <Panel title="Items">
          <div className="flex max-h-80 flex-col gap-2 overflow-auto pr-1">
            {STORE_ITEMS.map((item) => {
              const count = item.kind === "upgrade" ? getUpgradeCount(item.id) : 0;
              const has = item.kind === "upgrade" ? count > 0 : owned.has(item.id);
              return (
                <div key={item.id} className="grid grid-cols-[1fr_80px_80px] items-center gap-2 border border-border p-2">
                  <div className="min-w-0">
                    <div className="truncate text-[10px] uppercase tracking-widest">{item.name}</div>
                    <div className="text-[8px] uppercase tracking-widest text-muted-foreground">
                      {item.kind}{item.kind === "upgrade" ? ` x${count}` : has ? " owned" : " missing"}
                    </div>
                  </div>
                  <AdminButton onClick={() => mutate(`${item.name} given`, () => grantItem(item.id))}>Give</AdminButton>
                  <AdminButton onClick={() => mutate(`${item.name} removed`, () => removeItem(item.id))}>Remove</AdminButton>
                </div>
              );
            })}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <AdminButton onClick={() => mutate("All items given", () => STORE_ITEMS.forEach((i) => grantItem(i.id)))}>Give All</AdminButton>
            <AdminButton onClick={() => mutate("All items removed", () => STORE_ITEMS.forEach((i) => {
              if (i.kind === "upgrade") setUpgradeCount(i.id, 0);
              else removeItem(i.id);
            }))}>Remove All</AdminButton>
          </div>
        </Panel>

        <Panel title="Achievements">
          <div className="flex flex-col gap-2">
            {ACHIEVEMENTS.map((achievement) => {
              const has = unlockedAchievements.has(achievement.id);
              return (
                <div key={achievement.id} className="grid grid-cols-[1fr_80px_80px] items-center gap-2 border border-border p-2">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest">{achievement.name}</div>
                    <div className="text-[8px] uppercase tracking-widest text-muted-foreground">
                      {has ? "unlocked" : "locked"}
                    </div>
                  </div>
                  <AdminButton onClick={() => mutate("Achievement unlocked", () => unlockAchievement(achievement.id))}>Give</AdminButton>
                  <AdminButton onClick={() => mutate("Achievement removed", () => removeAchievement(achievement.id))}>Remove</AdminButton>
                </div>
              );
            })}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <AdminButton onClick={() => mutate("Title equipped", () => setEquippedTitle("frame-perfect"))}>
              Equip {TITLES["frame-perfect"]}
            </AdminButton>
            <AdminButton onClick={() => mutate("Title removed", () => setEquippedTitle(null))}>Unequip Title</AdminButton>
          </div>
        </Panel>

        <Panel title="Animation Preview" wide>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="flex min-h-36 flex-col items-center justify-center gap-2 border border-border p-3">
              <PixelCharacter skinId="kid:default" size={72} pose={POSES[poseIndex]} />
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{POSES[poseIndex]}</div>
            </div>
            <div className="flex min-h-36 flex-col items-center justify-center gap-2 border border-border p-3">
              <PixelEnemy id="duelist" isBoss accent="oklch(0.74 0.18 25)" size={96} attacking progress={(poseIndex + 1) / POSES.length} />
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Duel Boss</div>
            </div>
            <div className="relative flex min-h-36 flex-col items-center justify-center gap-2 overflow-hidden border border-border p-3">
              <div
                className="h-16 w-16 rounded-full"
                style={{
                  background: `radial-gradient(circle, ${skinColor} 0%, transparent 70%)`,
                  filter: "blur(4px)",
                  transform: "scale(1.7)",
                }}
              />
              <div
                className="absolute h-3 w-28 rotate-[-28deg]"
                style={{
                  background: `linear-gradient(90deg, transparent, ${skinColor}, white, ${skinColor}, transparent)`,
                  boxShadow: `0 0 18px ${skinColor}`,
                }}
              />
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Weapon Effect</div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            <AdminButton onClick={() => playSfx("parry")}>Parry SFX</AdminButton>
            <AdminButton onClick={() => playSfx("hit")}>Hit SFX</AdminButton>
            <AdminButton onClick={() => playSfx("kill")}>Kill SFX</AdminButton>
            <AdminButton onClick={() => playSfx("blackflash")}>Impact SFX</AdminButton>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {STORE_ITEMS.filter((i) => i.kind === "skin").map((item) => (
              <AdminButton key={item.id} onClick={() => mutate(`${item.name} preview`, () => setEquippedSkin(item.id))}>
                {item.name}
              </AdminButton>
            ))}
          </div>
        </Panel>

        <Panel title="Season">
          <div className="mb-2 text-[8px] uppercase tracking-widest text-muted-foreground">
            Wipes all players' lifetime gems and best waves
          </div>
          <button
            onClick={() => setConfirmReset(true)}
            className="border border-destructive px-3 py-1 text-[8px] uppercase tracking-widest text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            Start New Season
          </button>
        </Panel>
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

function Panel({ title, children, wide = false }: { title: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`border-2 border-border bg-background p-4 ${wide ? "lg:col-span-2" : ""}`}>
      <div className="mb-3 text-[11px] uppercase tracking-[0.3em]">{title}</div>
      {children}
    </div>
  );
}

function AdminButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="border border-border bg-background px-2 py-2 text-[8px] uppercase tracking-widest text-foreground hover:bg-foreground hover:text-background"
    >
      {children}
    </button>
  );
}
