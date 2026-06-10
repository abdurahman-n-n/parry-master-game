import { useEffect, useRef, useState } from "react";
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
import { AiDuel } from "./AiDuel";
import { AchievementsScreen } from "./AchievementsScreen";
import { supabase } from "@/integrations/supabase/client";
import { hydrateFromCloud, migrateLegacyIfNeeded } from "./storage";
import { installButtonSfx } from "./sfx";
import { getEquippedTitle, TITLES } from "./achievements";
import { isAdminEmail } from "@/lib/admin";
import { PixelCharacter } from "./PixelCharacters";

type Screen = "menu" | "levels" | "fight" | "gameover" | "victory" | "settings" | "store" | "inventory" | "leaderboard" | "admin" | "infinite" | "ai-duel" | "achievements";

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
    return installButtonSfx();
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
  if (screen === "ai-duel")   return <AiDuel onExit={() => setScreen("menu")} />;
  if (screen === "achievements") return <AchievementsScreen onBack={() => setScreen("menu")} />;

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
    <div className="h-full w-full bg-background font-pixel text-foreground">
      <LobbyMap
        user={user}
        credits={credits}
        gems={gems}
        levelsCleared={beaten.size}
        onNavigate={setScreen}
        onLogout={() => setShowLogoutConfirm(true)}
      />
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

const LOBBY_W = 760;
const LOBBY_H = 480;
const PLAYER_SIZE = 54;
const STATION_W = 126;
const STATION_H = 58;
const PRACTICE_BOTS = [
  { id: "left", name: "Garden Bot", x: 232, y: 246, offset: 0, color: "oklch(0.72 0.16 160)" },
  { id: "right", name: "Timing Bot", x: 482, y: 246, offset: 980, color: "oklch(0.78 0.14 85)" },
];

type LobbyStation = {
  id: string;
  label: string;
  hint: string;
  x: number;
  y: number;
  screen?: Screen;
  action?: () => void;
  accent: string;
};

function LobbyMap({
  user,
  credits,
  gems,
  levelsCleared,
  onNavigate,
  onLogout,
}: {
  user: string;
  credits: number;
  gems: number;
  levelsCleared: number;
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
}) {
  const [player, setPlayer] = useState({ x: LOBBY_W / 2, y: LOBBY_H - 92 });
  const [keys, setKeys] = useState<Record<string, boolean>>({});
  const [viewport, setViewport] = useState({ width: LOBBY_W + 40, height: LOBBY_H + 40 });
  const [walking, setWalking] = useState(false);
  const [lobbyTime, setLobbyTime] = useState(0);
  const [parryPop, setParryPop] = useState<{ x: number; y: number; at: number } | null>(null);
  const playerRef = useRef(player);
  const lobbyTimeRef = useRef(lobbyTime);
  playerRef.current = player;
  lobbyTimeRef.current = lobbyTime;
  const isAdmin = isAdminEmail(user);
  const title = getEquippedTitle();

  const stations: LobbyStation[] = [
    { id: "levels", label: "Play", hint: "Level gate", x: 318, y: 54, screen: "levels", accent: "var(--color-accent)" },
    { id: "infinite", label: "Infinite", hint: "Wave door", x: 78, y: 124, screen: "infinite", accent: "oklch(0.72 0.16 160)" },
    { id: "duel", label: "Duel", hint: "1v1 arena", x: 556, y: 124, screen: "ai-duel", accent: "var(--color-danger)" },
    { id: "achievements", label: "Awards", hint: "Titles", x: 78, y: 304, screen: "achievements", accent: "oklch(0.78 0.14 85)" },
    { id: "store", label: "Store", hint: "Buy gear", x: 238, y: 336, screen: "store", accent: "oklch(0.76 0.15 35)" },
    { id: "inventory", label: "Inventory", hint: "Equip", x: 396, y: 336, screen: "inventory", accent: "oklch(0.70 0.13 250)" },
    { id: "leaderboard", label: "Board", hint: "Rankings", x: 556, y: 304, screen: "leaderboard", accent: "oklch(0.80 0.13 120)" },
    { id: "settings", label: "Settings", hint: "Profile", x: 556, y: 214, screen: "settings", accent: "oklch(0.72 0.08 300)" },
    ...(isAdmin
      ? [{ id: "admin", label: "Admin", hint: "Panel", x: 78, y: 214, screen: "admin" as Screen, accent: "oklch(0.78 0.18 25)" }]
      : []),
    { id: "logout", label: "Logout", hint: "Exit", x: 318, y: 214, action: onLogout, accent: "oklch(0.66 0.06 260)" },
  ];

  const nearest = stations.reduce<{ station: LobbyStation | null; dist: number }>(
    (best, station) => {
      const cx = station.x + STATION_W / 2;
      const cy = station.y + STATION_H / 2;
      const dist = Math.hypot(player.x - cx, player.y - cy);
      return dist < best.dist ? { station, dist } : best;
    },
    { station: null, dist: Infinity }
  );
  const activeStation = nearest.dist < 92 ? nearest.station : null;

  const useStation = (station: LobbyStation | null) => {
    if (!station) return;
    if (station.screen) onNavigate(station.screen);
    station.action?.();
  };

  const tryPracticeParry = () => {
    const bot = PRACTICE_BOTS.find((practiceBot) => {
      const phase = (lobbyTimeRef.current + practiceBot.offset) % 2600;
      const close = Math.hypot(playerRef.current.x - practiceBot.x, playerRef.current.y - practiceBot.y) < 118;
      return close && phase >= 980 && phase <= 1550;
    });

    if (!bot) return;
    setParryPop({ x: bot.x, y: bot.y - 44, at: performance.now() });
  };

  useEffect(() => {
    const updateViewport = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    window.addEventListener("orientationchange", updateViewport);
    return () => {
      window.removeEventListener("resize", updateViewport);
      window.removeEventListener("orientationchange", updateViewport);
    };
  }, []);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowleft", "arrowdown", "arrowright"].includes(key)) {
        event.preventDefault();
        setKeys((current) => ({ ...current, [key]: true }));
      }
      if (key === "e" || key === "enter") {
        event.preventDefault();
        useStation(activeStation);
      }
      if (key === "q" || key === "f") {
        event.preventDefault();
        tryPracticeParry();
      }
    };
    const up = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      setKeys((current) => ({ ...current, [key]: false }));
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [activeStation]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const frame = (time: number) => {
      const dt = Math.min(0.033, (time - last) / 1000);
      last = time;
      lobbyTimeRef.current = time;
      setLobbyTime(time);
      const left = keys.a || keys.arrowleft;
      const right = keys.d || keys.arrowright;
      const up = keys.w || keys.arrowup;
      const down = keys.s || keys.arrowdown;
      const dx = (right ? 1 : 0) - (left ? 1 : 0);
      const dy = (down ? 1 : 0) - (up ? 1 : 0);
      const moving = dx !== 0 || dy !== 0;
      setWalking(moving);

      if (moving) {
        const len = Math.hypot(dx, dy) || 1;
        setPlayer((p) => ({
          x: Math.max(38, Math.min(LOBBY_W - 38, p.x + (dx / len) * 190 * dt)),
          y: Math.max(74, Math.min(LOBBY_H - 42, p.y + (dy / len) * 190 * dt)),
        }));
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [keys]);

  const scale = Math.max(0.44, Math.min(1, (viewport.width - 24) / LOBBY_W, (viewport.height - 24) / LOBBY_H));
  const mapWidth = LOBBY_W * scale;
  const mapHeight = LOBBY_H * scale;

  const holdMove = (key: string, pressed: boolean) => {
    setKeys((current) => ({ ...current, [key]: pressed }));
  };

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 overflow-auto bg-background p-3">
      <div
        className="relative overflow-hidden border-4 border-border"
        style={{ width: mapWidth, height: mapHeight }}
      >
        <div
          className="relative overflow-hidden"
          style={{
            width: LOBBY_W,
            height: LOBBY_H,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            background:
              "linear-gradient(180deg, oklch(0.20 0.03 260), oklch(0.15 0.02 260))",
          }}
        >
          <div
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage:
                "linear-gradient(oklch(0.28 0.02 260) 2px, transparent 2px), linear-gradient(90deg, oklch(0.28 0.02 260) 2px, transparent 2px)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-3">
            <PixelShield size={34} />
            <div className="text-3xl tracking-[0.32em] text-foreground">PARRY!</div>
            <PixelSword size={34} />
          </div>
          <div className="absolute left-4 top-4 flex flex-col gap-2 text-[8px] uppercase tracking-widest text-muted-foreground">
            <CurrencyHUD credits={credits} gems={gems} />
            <div className="max-w-72 truncate">
              {user}{title ? ` · ${TITLES[title]}` : ""}
            </div>
            <div>{levelsCleared}/{TOTAL_LEVELS} levels cleared</div>
          </div>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 border-2 border-border bg-background/85 px-3 py-2 text-center text-[8px] uppercase tracking-widest text-muted-foreground">
            WASD / arrows to walk · E / Enter near a station · Q / F in garden
          </div>

          <div className="absolute left-8 top-72 h-40 w-[704px] border-2 border-[oklch(0.42_0.10_145)] bg-[oklch(0.24_0.07_145)]/70" />
          <div className="absolute left-24 top-[332px] h-20 w-[560px] border-t-2 border-dashed border-[oklch(0.58_0.12_120)]" />
          <div className="absolute left-[378px] top-[300px] h-[116px] border-l-2 border-dashed border-[oklch(0.58_0.12_120)]" />
          <div className="absolute left-32 top-[286px] h-10 w-28 border-2 border-[oklch(0.55_0.10_220)] bg-[oklch(0.34_0.10_220)]" />
          <div className="absolute left-[590px] top-[348px] h-12 w-20 border-2 border-[oklch(0.50_0.12_85)] bg-[oklch(0.33_0.12_85)]" />
          {[
            [44, 326, "oklch(0.76 0.16 35)"],
            [68, 380, "oklch(0.82 0.14 85)"],
            [170, 384, "oklch(0.74 0.18 320)"],
            [630, 300, "oklch(0.72 0.16 160)"],
            [704, 386, "oklch(0.76 0.16 35)"],
            [548, 396, "oklch(0.82 0.14 85)"],
          ].map(([x, y, color], index) => (
            <div
              key={index}
              className="absolute h-3 w-3 border border-background"
              style={{ left: x, top: y, background: color }}
            />
          ))}
          <div className="absolute left-[270px] top-[284px] border border-accent bg-background/90 px-2 py-1 text-[8px] uppercase tracking-widest text-accent">
            Training garden
          </div>

          {stations.map((station) => {
            const active = activeStation?.id === station.id;
            return (
              <button
                key={station.id}
                onClick={() => useStation(station)}
                className={`absolute flex flex-col items-center justify-center gap-1 border-2 bg-background/95 p-2 text-center uppercase transition-colors ${
                  active
                    ? "border-accent text-accent"
                    : "border-border text-foreground hover:border-foreground"
                }`}
                style={{
                  left: station.x,
                  top: station.y,
                  width: STATION_W,
                  height: STATION_H,
                  boxShadow: active ? `0 0 18px ${station.accent}` : undefined,
                }}
              >
                <span className="text-[10px] tracking-[0.18em]">{station.label}</span>
                <span className="text-[7px] tracking-widest text-muted-foreground">{station.hint}</span>
                <span
                  className="absolute bottom-0 left-0 h-1 w-full"
                  style={{ background: station.accent }}
                />
              </button>
            );
          })}

          {PRACTICE_BOTS.map((bot) => {
            const phase = (lobbyTime + bot.offset) % 2600;
            const windup = phase < 1200;
            const striking = phase >= 1200 && phase < 1550;
            const charge = Math.min(1, phase / 1200);
            const close = Math.hypot(player.x - bot.x, player.y - bot.y) < 118;
            return (
              <div key={bot.id}>
                <div
                  className="pointer-events-none absolute -translate-x-1/2 rounded-[50%]"
                  style={{
                    left: bot.x,
                    top: bot.y + 26,
                    width: 58,
                    height: 10,
                    background: "radial-gradient(ellipse, rgba(0,0,0,0.45), rgba(0,0,0,0))",
                  }}
                />
                <div
                  className="absolute -translate-x-1/2 -translate-y-1/2 border-2 bg-background"
                  style={{
                    left: bot.x,
                    top: bot.y,
                    width: 44,
                    height: 54,
                    borderColor: striking ? "var(--color-danger)" : close ? "var(--color-accent)" : "var(--color-border)",
                    boxShadow: striking ? "0 0 18px var(--color-danger)" : close ? "0 0 12px var(--color-accent)" : undefined,
                    transform: `translate(-50%, -50%) ${windup ? `rotate(${charge * -8}deg)` : striking ? "translateX(8px)" : ""}`,
                  }}
                >
                  <div className="absolute left-3 top-2 h-2 w-2" style={{ background: bot.color }} />
                  <div className="absolute right-3 top-2 h-2 w-2" style={{ background: bot.color }} />
                  <div className="absolute left-2 top-7 h-2 w-8 bg-foreground" />
                  <div className="absolute left-4 top-10 h-2 w-4" style={{ background: bot.color }} />
                  <div
                    className="absolute h-2 w-20 origin-left"
                    style={{
                      left: 30,
                      top: 25,
                      background: striking ? "var(--color-danger)" : bot.color,
                      transform: `rotate(${windup ? -38 + charge * 24 : striking ? -8 : 42}deg)`,
                    }}
                  />
                </div>
                <div
                  className="absolute -translate-x-1/2 text-center text-[7px] uppercase tracking-widest text-muted-foreground"
                  style={{ left: bot.x, top: bot.y + 36 }}
                >
                  {bot.name}
                </div>
                {striking && (
                  <div
                    className="pointer-events-none absolute h-16 w-28 -translate-x-1/2 -translate-y-1/2 border-2 border-danger bg-danger/20"
                    style={{ left: bot.x + 50, top: bot.y + 4 }}
                  />
                )}
              </div>
            );
          })}

          {parryPop && performance.now() - parryPop.at < 700 && (
            <div
              className="pointer-events-none absolute -translate-x-1/2 text-2xl uppercase tracking-[0.24em] text-accent"
              style={{
                left: parryPop.x,
                top: parryPop.y,
                textShadow: "0 0 14px var(--color-accent), 2px 2px 0 var(--color-background)",
                animation: "lobbyParryPop 700ms ease-out forwards",
              }}
            >
              PARRY!
            </div>
          )}

          {activeStation && (
            <div
              className="pointer-events-none absolute -translate-x-1/2 border border-accent bg-background px-2 py-1 text-[8px] uppercase tracking-widest text-accent"
              style={{ left: player.x, top: player.y - 68 }}
            >
              Press E: {activeStation.label}
            </div>
          )}

          <div
            className="pointer-events-none absolute -translate-x-1/2 rounded-[50%]"
            style={{
              left: player.x,
              top: player.y + 24,
              width: 54,
              height: 12,
              background: "radial-gradient(ellipse, rgba(0,0,0,0.55), rgba(0,0,0,0))",
            }}
          />
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: player.x, top: player.y }}
          >
            <PixelCharacter skinId="kid:default" size={PLAYER_SIZE} pose={walking ? "walk" : "idle"} />
          </div>
          <style>{`
            @keyframes lobbyParryPop {
              0% { opacity: 0; transform: translate(-50%, 8px) scale(0.72); }
              18% { opacity: 1; transform: translate(-50%, -4px) scale(1.22); }
              100% { opacity: 0; transform: translate(-50%, -34px) scale(1); }
            }
          `}</style>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 sm:hidden">
        <div />
        <PadButton label="W" onDown={() => holdMove("w", true)} onUp={() => holdMove("w", false)} />
        <div />
        <PadButton label="A" onDown={() => holdMove("a", true)} onUp={() => holdMove("a", false)} />
        <button
          onClick={() => useStation(activeStation)}
          className="border-2 border-border bg-foreground px-3 py-2 text-[9px] uppercase tracking-widest text-background"
        >
          Use
        </button>
        <PadButton label="D" onDown={() => holdMove("d", true)} onUp={() => holdMove("d", false)} />
        <div />
        <PadButton label="S" onDown={() => holdMove("s", true)} onUp={() => holdMove("s", false)} />
        <div />
      </div>
      <button
        onClick={tryPracticeParry}
        className="border-2 border-accent bg-background px-4 py-2 text-[9px] uppercase tracking-widest text-accent sm:hidden"
      >
        Parry
      </button>
    </div>
  );
}

function PadButton({ label, onDown, onUp }: { label: string; onDown: () => void; onUp: () => void }) {
  return (
    <button
      onPointerDown={onDown}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onPointerLeave={onUp}
      className="border-2 border-border bg-background px-3 py-2 text-[9px] uppercase tracking-widest text-foreground"
    >
      {label}
    </button>
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
