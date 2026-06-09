import { useEffect, useState } from "react";
import {
  DEFAULT_CHARACTER, enemyForLevel, TOTAL_LEVELS,
  getBeatenLevels, markLevelBeaten, isLevelUnlocked, rewardForLevel,
} from "./levels";
import { ParryGame, type FightResult } from "./ParryGame";
import { PixelShield, PixelSword } from "./PixelHeart";
import { SettingsScreen, getSavedAccent, applyAccent } from "./SettingsScreen";
import { StoreScreen } from "./StoreScreen";
import { InventoryScreen } from "./InventoryScreen";
import {
  CurrencyHUD, addCredits, addGems, getCredits, getGems,
} from "./Currency";
import type { EnemyDef } from "./types";
import { AuthScreen, forgetAuthedUser, logout, rememberAuthedUser } from "./AuthScreen";
import { LeaderboardScreen } from "./LeaderboardScreen";
import { AdminScreen } from "./AdminScreen";
import { InfiniteDungeon } from "./InfiniteDungeon";
import { supabase } from "@/integrations/supabase/client";
import { hydrateFromCloud, migrateLegacyIfNeeded } from "./storage";

type Screen = "menu" | "levels" | "fight" | "gameover" | "victory" | "settings" | "store" | "inventory" | "leaderboard" | "admin" | "infinite";

export function GameShell() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [user, setUser] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [level, setLevel] = useState(1);
  const [enemy, setEnemy] = useState<EnemyDef>(() => enemyForLevel(1));
  const [credits, setCredits] = useState(0);
  const [gems, setGems] = useState(0);
  const [beaten, setBeaten] = useState<Set<number>>(new Set());
  const [lastReward, setLastReward] = useState<{ credits: number; gems: number } | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    let alive = true;
    let unsubscribe: (() => void) | undefined;

    const finish = (email: string | null) => {
      if (!alive) return;
      if (email) {
        rememberAuthedUser(email);
        migrateLegacyIfNeeded(email);
        hydrateFromCloud(email).catch(() => {});
        setUser(email);
      } else {
        forgetAuthedUser();
        setUser(null);
      }
    };

    const cleanAuthUrl = () => {
      if (typeof window === "undefined") return;
      const url = new URL(window.location.href);
      url.searchParams.delete("code");
      url.searchParams.delete("state");
      url.searchParams.delete("error");
      url.searchParams.delete("error_code");
      url.searchParams.delete("error_description");
      window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
    };

    const completeOAuthRedirect = async () => {
      if (typeof window === "undefined") return null;
      const code = new URLSearchParams(window.location.search).get("code");
      if (!code) return null;
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      cleanAuthUrl();
      if (error) {
        console.error(error);
        return null;
      }
      return data.session?.user.email ?? null;
    };

    const init = async () => {
      try {
        const callbackEmail = await completeOAuthRedirect();
        if (callbackEmail) {
          finish(callbackEmail);
        } else {
          const { data } = await supabase.auth.getSession();
          finish(data.session?.user.email ?? null);
        }
      } catch (error) {
        console.error(error);
        finish(null);
      } finally {
        if (alive) setReady(true);
      }

      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!alive) return;
        finish(session?.user.email ?? null);
      });
      unsubscribe = () => listener.subscription.unsubscribe();
    };

    init();

    return () => {
      alive = false;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    applyAccent(getSavedAccent());
    setCredits(getCredits());
    setGems(getGems());
    setBeaten(getBeatenLevels());
  }, [screen]);

  const startLevel = (lvl: number) => {
    setLevel(lvl);
    setEnemy(enemyForLevel(lvl));
    setLastReward(null);
    setScreen("fight");
  };

  const onFightEnd = (res: FightResult) => {
    if (res.result === "victory") {
      const already = beaten.has(level);
      const reward = rewardForLevel(level, already, enemy.isBoss);
      if (reward.credits > 0) setCredits(addCredits(reward.credits));
      if (reward.gems > 0) setGems(addGems(reward.gems));
      setLastReward(reward);
      markLevelBeaten(level);
      setBeaten(getBeatenLevels());
      setScreen("victory");
    } else {
      setScreen("gameover");
    }
  };

  if (!ready) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background p-6 font-pixel text-foreground">
        <div className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onAuthed={(n) => setUser(n)} />;
  }

  if (screen === "fight") {
    return (
      <ParryGame
        key={`${level}-${enemy.id}`}
        character={DEFAULT_CHARACTER}
        enemy={enemy}
        level={level}
        onEnd={onFightEnd}
      />
    );
  }

  if (screen === "settings")  return <SettingsScreen onBack={() => setScreen("menu")} />;
  if (screen === "store")     return <StoreScreen onBack={() => setScreen("menu")} />;
  if (screen === "inventory") return <InventoryScreen onBack={() => setScreen("menu")} />;
  if (screen === "leaderboard") return <LeaderboardScreen onBack={() => setScreen("menu")} />;
  if (screen === "admin")     return <AdminScreen onBack={() => setScreen("menu")} />;
  if (screen === "infinite")  return <InfiniteDungeon onExit={() => setScreen("menu")} />;

  if (screen === "levels") {
    return (
      <div className="flex h-full w-full flex-col items-center gap-4 overflow-auto bg-background p-6 font-pixel text-foreground">
        <div className="flex w-full max-w-2xl items-center justify-between">
          <button
            onClick={() => setScreen("menu")}
            className="border-2 border-border bg-background px-3 py-1 text-[10px] uppercase tracking-widest hover:bg-foreground hover:text-background"
          >
            ← Back
          </button>
          <div className="text-2xl tracking-[0.3em]">LEVELS</div>
          <CurrencyHUD credits={credits} gems={gems} />
        </div>
        <div className="grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {Array.from({ length: TOTAL_LEVELS }, (_, i) => i + 1).map((lvl) => {
            const unlocked = isLevelUnlocked(lvl);
            const isBeaten = beaten.has(lvl);
            const isBoss = lvl % 10 === 0;
            const e = enemyForLevel(lvl);
            return (
              <button
                key={lvl}
                disabled={!unlocked}
                onClick={() => startLevel(lvl)}
                className="flex flex-col items-center gap-1 border-2 border-border bg-background p-3 text-[10px] uppercase tracking-widest text-foreground hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-background disabled:hover:text-foreground"
              >
                <div className="text-lg">{lvl}</div>
                <div className="text-[9px] text-muted-foreground">
                  {isBoss ? "BOSS" : e.name}
                </div>
                <div className="text-[8px]">
                  {!unlocked ? "🔒 LOCKED" : isBeaten ? "✓ CLEARED" : "▶ START"}
                </div>
              </button>
            );
          })}
        </div>
        <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
          15 credits + 1 gem per win · replays pay 1/3
        </div>
      </div>
    );
  }

  if (screen === "gameover") {
    return (
      <CenterCard>
        <div className="text-3xl tracking-[0.3em] text-foreground">DEFEATED</div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Fell on level {level} · {enemy.name}
        </div>
        <CurrencyHUD credits={credits} gems={gems} />
        <button
          onClick={() => startLevel(level)}
          className="mt-2 border-2 border-border bg-foreground px-5 py-2 text-[10px] uppercase tracking-[0.3em] text-background hover:bg-accent"
        >
          ▶ Retry
        </button>
        <button
          onClick={() => setScreen("levels")}
          className="text-[9px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          ← Levels
        </button>
      </CenterCard>
    );
  }

  if (screen === "victory") {
    const next = level + 1;
    const canContinue = next <= TOTAL_LEVELS;
    return (
      <CenterCard>
        <div className="text-3xl tracking-[0.3em] text-foreground">VICTORY</div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Level {level} cleared
        </div>
        {lastReward && (
          <div className="text-[10px] uppercase tracking-widest text-accent">
            +{lastReward.credits} credits
            {lastReward.gems > 0 ? ` · +${lastReward.gems} gem` : ""}
          </div>
        )}
        <CurrencyHUD credits={credits} gems={gems} />
        {canContinue && (
          <button
            onClick={() => startLevel(next)}
            className="mt-2 border-2 border-border bg-foreground px-5 py-2 text-[10px] uppercase tracking-[0.3em] text-background hover:bg-accent"
          >
            ▶ Next Level
          </button>
        )}
        <button
          onClick={() => setScreen("levels")}
          className="text-[9px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          ← Levels
        </button>
      </CenterCard>
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 bg-background p-6 font-pixel text-foreground">
      <div className="flex items-center gap-4">
        <PixelShield size={44} />
        <h1 className="text-4xl tracking-[0.3em] sm:text-6xl">PARRY!</h1>
        <PixelSword size={44} />
      </div>
      <CurrencyHUD credits={credits} gems={gems} />
      <p className="max-w-md text-center text-[10px] uppercase leading-relaxed tracking-widest text-muted-foreground">
        WASD to move · F to block · Space / Click to strike · E to use equipped ability
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={() => setScreen("levels")}
          className="border-2 border-border bg-foreground px-6 py-3 text-[11px] uppercase tracking-[0.3em] text-background transition-colors hover:bg-accent"
        >
          ▶ Play
        </button>
        <button
          onClick={() => setScreen("infinite")}
          title="Endless waves"
          className="border-2 border-border bg-background px-6 py-3 text-[11px] uppercase tracking-[0.3em] text-foreground transition-colors hover:bg-foreground hover:text-background"
        >
          ∞ Infinite Dungeon
        </button>
        <button
          onClick={() => setScreen("store")}
          className="border-2 border-border bg-background px-6 py-3 text-[11px] uppercase tracking-[0.3em] text-foreground transition-colors hover:bg-foreground hover:text-background"
        >
          🛒 Store
        </button>
        <button
          onClick={() => setScreen("inventory")}
          className="border-2 border-border bg-background px-6 py-3 text-[11px] uppercase tracking-[0.3em] text-foreground transition-colors hover:bg-foreground hover:text-background"
        >
          Inventory
        </button>
        <button
          onClick={() => setScreen("leaderboard")}
          className="border-2 border-border bg-background px-6 py-3 text-[11px] uppercase tracking-[0.3em] text-foreground transition-colors hover:bg-foreground hover:text-background"
        >
          🏆 Leaderboard
        </button>
        <button
          onClick={() => setScreen("settings")}
          className="border-2 border-border bg-background px-6 py-3 text-[11px] uppercase tracking-[0.3em] text-foreground transition-colors hover:bg-foreground hover:text-background"
        >
          ⚙ Settings
        </button>
        {user?.toLowerCase().startsWith("abdurahman") && (
          <button
            onClick={() => setScreen("admin")}
            className="border-2 border-border bg-background px-6 py-3 text-[11px] uppercase tracking-[0.3em] text-foreground transition-colors hover:bg-foreground hover:text-background"
          >
            🔧 Admin
          </button>
        )}
      </div>
      <div className="text-[8px] uppercase tracking-widest text-muted-foreground">
        v0.6 · {beaten.size}/{TOTAL_LEVELS} levels cleared
      </div>
      <div className="flex items-center gap-3 text-[9px] uppercase tracking-widest text-muted-foreground">
        <span>Logged in as {user}</span>
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="border border-border px-2 py-1 hover:bg-foreground hover:text-background"
        >
          Logout
        </button>
      </div>
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-6 font-pixel">
          <div className="flex w-full max-w-sm flex-col items-center gap-4 border-2 border-border bg-background p-6 text-center">
            <div className="text-[12px] uppercase tracking-[0.2em] text-foreground">
              Are you sure you want to logout?
            </div>
            <div className="flex w-full gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 border-2 border-border bg-background px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-foreground hover:bg-foreground hover:text-background"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await logout();
                  setShowLogoutConfirm(false);
                  setUser(null);
                }}
                className="flex-1 border-2 border-border bg-foreground px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-background hover:bg-accent"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CenterCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background p-6 font-pixel text-foreground">
      <div className="flex w-full max-w-sm flex-col items-center gap-3 border-2 border-border bg-background p-6 text-center">
        {children}
      </div>
    </div>
  );
}
