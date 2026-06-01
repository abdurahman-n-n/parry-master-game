import { useCallback, useEffect, useRef, useState } from "react";
import type { AttackPattern, CharacterDef, EnemyDef, GameState } from "./types";
import { PixelHero } from "./PixelHero";
import { PixelEnemy } from "./PixelEnemy";
import { CurrencyHUD, getCredits, getGems, rewardFor } from "./Currency";

interface Incoming {
  uid: number;
  attack: AttackPattern;
  spawnedAt: number;
}

type Flash = { uid: number; kind: "parry" | "hit" | "perfect"; at: number };

export interface FightResult {
  result: "victory" | "defeat";
  credits: number;
  gems: number;
  fightMs: number;
}

interface Props {
  character: CharacterDef;
  enemy: EnemyDef;
  wave: number;
  onEnd: (result: FightResult) => void;
}

const ARENA_W = 640;
const ARENA_H = 360;

export function ParryGame({ character, enemy, wave, onEnd }: Props) {
  const [state, setState] = useState<GameState>("playing");
  const [playerHp, setPlayerHp] = useState(character.maxHp);
  const [enemyHp, setEnemyHp] = useState(enemy.maxHp);
  const [incoming, setIncoming] = useState<Incoming | null>(null);
  const [flashes, setFlashes] = useState<Flash[]>([]);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [log, setLog] = useState<string>("* The battle begins.");
  const [paused, setPaused] = useState(false);
  const [credits] = useState(() => getCredits());
  const [gems] = useState(() => getGems());
  const [pendingReward, setPendingReward] = useState<{ credits: number; gems: number } | null>(null);

  const fightStartRef = useRef<number>(performance.now());
  const uidRef = useRef(1);
  const stateRef = useRef(state);
  stateRef.current = state;
  const incomingRef = useRef<Incoming | null>(null);
  incomingRef.current = incoming;
  const playerHpRef = useRef(playerHp);
  playerHpRef.current = playerHp;
  const enemyHpRef = useRef(enemyHp);
  enemyHpRef.current = enemyHp;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const endFight = useCallback(
    (result: "victory" | "defeat") => {
      const fightMs = performance.now() - fightStartRef.current;
      const reward =
        result === "victory"
          ? rewardFor({ isBoss: !!enemy.isBoss, fightMs })
          : { credits: 0, gems: 0, speedBonus: 0 };
      setPendingReward({ credits: reward.credits, gems: reward.gems });
      setState(result);
      // Defer onEnd via the result-watcher effect (keeps the flash visible).
      (endFight as any)._payload = { result, credits: reward.credits, gems: reward.gems, fightMs };
    },
    [enemy.isBoss],
  );

  const pushFlash = useCallback((kind: Flash["kind"]) => {
    const f: Flash = { uid: uidRef.current++, kind, at: performance.now() };
    setFlashes((arr) => [...arr, f]);
    setTimeout(() => setFlashes((arr) => arr.filter((x) => x.uid !== f.uid)), 500);
  }, []);

  // Auto-advance to the shell when the fight resolves
  useEffect(() => {
    if (state === "playing") return;
    const payload = (endFight as any)._payload as FightResult | undefined;
    const t = setTimeout(
      () =>
        onEnd(
          payload ?? {
            result: state === "victory" ? "victory" : "defeat",
            credits: 0,
            gems: 0,
            fightMs: performance.now() - fightStartRef.current,
          },
        ),
      1300,
    );
    return () => clearTimeout(t);
  }, [state, onEnd, endFight]);

  // Schedule next attack
  useEffect(() => {
    if (state !== "playing" || paused) return;
    if (incoming) return;
    const [a, b] = enemy.cadenceMs;
    const delay = a + Math.random() * (b - a);
    const t = setTimeout(() => {
      const atk = enemy.attacks[Math.floor(Math.random() * enemy.attacks.length)];
      setIncoming({ uid: uidRef.current++, attack: atk, spawnedAt: performance.now() });
    }, delay);
    return () => clearTimeout(t);
  }, [state, incoming, enemy, paused]);

  // Resolve attack if not parried in time
  useEffect(() => {
    if (!incoming || state !== "playing" || paused) return;
    const timeToHit = incoming.attack.windupMs;
    const timeoutId = setTimeout(() => {
      if (pausedRef.current) return;
      // Player missed parry — take damage
      const dmg = incoming.attack.damage;
      setPlayerHp((hp) => {
        const next = Math.max(0, hp - dmg);
        if (next === 0) endFight("defeat");
        return next;
      });
      setCombo(0);
      setLog(`* ${enemy.name}'s ${incoming.attack.kind} lands. -${dmg} HP`);
      pushFlash("hit");
      setIncoming(null);
    }, timeToHit + incoming.attack.parryWindowMs / 2);
    return () => clearTimeout(timeoutId);
  }, [incoming, state, enemy.name, pushFlash, paused]);


  // Core parry action — fired by Space or mouse click
  const tryParry = useCallback(() => {
    if (stateRef.current !== "playing" || pausedRef.current) return;
    const inc = incomingRef.current;
    const now = performance.now();
    if (!inc) {
      setCombo(0);
      setLog("* You swing at empty air.");
      return;
    }
    const elapsed = now - inc.spawnedAt;
    const hitAt = inc.attack.windupMs;
    const half = inc.attack.parryWindowMs / 2;
    const delta = Math.abs(elapsed - hitAt);
    if (delta <= half) {
      const perfect = delta <= half * 0.35;
      const refl = perfect ? Math.round(inc.attack.reflect * 1.5) : inc.attack.reflect;
      setEnemyHp((hp) => {
        const next = Math.max(0, hp - refl);
        if (next === 0) endFight("victory");
        return next;
      });
      setCombo((c) => {
        const n = c + 1;
        setBestCombo((b) => Math.max(b, n));
        return n;
      });
      setLog(perfect ? `* PERFECT PARRY! -${refl}` : `* Parried! -${refl}`);
      pushFlash(perfect ? "perfect" : "parry");
      setIncoming(null);
    } else {
      setPlayerHp((hp) => {
        const next = Math.max(0, hp - inc.attack.damage);
        if (next === 0) endFight("defeat");
        return next;
      });
      setCombo(0);
      setLog("* Mistimed! You take the blow.");
      pushFlash("hit");
      setIncoming(null);
    }
  }, [pushFlash]);

  // Keyboard: Space
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      e.preventDefault();
      tryParry();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [tryParry]);

  // Mouse: left click anywhere on the page (handled by arena onClick too)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (e.button !== 0) return;
      // Ignore clicks on actual UI buttons
      const t = e.target as HTMLElement | null;
      if (t && t.closest("button")) return;
      e.preventDefault();
      tryParry();
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [tryParry]);

  // Keyboard: Escape — toggle pause (only while playing)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code !== "Escape") return;
      if (stateRef.current !== "playing") return;
      e.preventDefault();
      setPaused((p) => {
        // Clear any pending attack so it doesn't land on resume
        if (!p) setIncoming(null);
        return !p;
      });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);


  // Telegraph animation tick
  const [, force] = useState(0);
  useEffect(() => {
    if (!incoming) return;
    let raf = 0;
    const loop = () => {
      force((n) => n + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [incoming]);

  const telegraphProgress = incoming
    ? Math.min(1, (performance.now() - incoming.spawnedAt) / incoming.attack.windupMs)
    : 0;

  const overlayFlash = flashes[flashes.length - 1];

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-background p-4 font-pixel">
      {/* HUD */}
      <div className="flex w-full max-w-[640px] items-center justify-between text-[10px] uppercase tracking-widest">
        <button
          onClick={() => onEnd({ result: "defeat", credits: 0, gems: 0, fightMs: performance.now() - fightStartRef.current })}
          className="border border-border bg-background px-2 py-1 text-foreground hover:bg-foreground hover:text-background"
        >
          ← Abandon
        </button>
        <div className="text-foreground">
          Wave <span className="text-accent">{wave}</span>
          {enemy.isBoss && <span className="ml-2 text-danger">⚠ BOSS</span>}
        </div>
        <CurrencyHUD credits={credits} gems={gems} reward={pendingReward} />
        <div className="text-muted-foreground">
          Combo <span className="text-foreground">{combo}</span> · Best{" "}
          <span className="text-foreground">{bestCombo}</span>
        </div>
      </div>

      {/* Arena */}
      <div
        className="relative overflow-hidden border-4 border-border bg-background"
        style={{ width: ARENA_W, height: ARENA_H }}
      >
        {/* Enemy */}
        <EnemySprite enemy={enemy} attacking={!!incoming} progress={telegraphProgress} />

        {/* Player heart */}
        {/* Hero sprite (replaces the heart) */}
        <div className="absolute left-1/2 top-[78%] -translate-x-1/2 -translate-y-1/2">
          <PixelHero
            size={64}
            pose={
              overlayFlash?.kind === "hit"
                ? "hit"
                : overlayFlash?.kind === "parry" || overlayFlash?.kind === "perfect"
                ? "strike"
                : "idle"
            }
            key={overlayFlash?.uid ?? "idle"}
          />
        </div>

        {/* Telegraph bar */}
        {incoming && (
          <TelegraphBar
            attack={incoming.attack}
            progress={telegraphProgress}
          />
        )}

        {/* Flash overlays */}
        {overlayFlash && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                overlayFlash.kind === "hit"
                  ? "color-mix(in oklab, var(--color-danger) 35%, transparent)"
                  : overlayFlash.kind === "perfect"
                  ? "color-mix(in oklab, var(--color-accent) 45%, transparent)"
                  : "color-mix(in oklab, var(--color-foreground) 25%, transparent)",
              animation: "parryFlash 280ms ease-out forwards",
            }}
          />
        )}

        {/* Pause overlay */}
        {paused && state === "playing" && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-background/90 text-center">
            <div className="text-2xl tracking-[0.4em] text-foreground">PAUSED</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              [ Esc ] to resume
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPaused(false)}
                className="border-2 border-border bg-foreground px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-background hover:bg-accent"
              >
                ▶ Continue
              </button>
              <button
                onClick={() => onEnd("defeat")}
                className="border-2 border-border bg-background px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-foreground hover:bg-foreground hover:text-background"
              >
                ✕ Abandon Run
              </button>
            </div>
          </div>
        )}

        {/* Result */}
        {state !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/85 text-center">
            <div className="text-2xl tracking-widest text-foreground">
              {state === "victory" ? "VICTORY" : "DEFEATED"}
            </div>
            <div className="text-[10px] uppercase text-muted-foreground">
              Combo: {bestCombo}
            </div>
          </div>
        )}
      </div>

      {/* Status + log — one mistake is lethal */}
      <div className="flex w-full max-w-[640px] flex-col gap-2">
        <EnemyHealth enemy={enemy} hp={enemyHp} />
        <StatusRow label={character.name.toUpperCase()} alive={playerHp > 0} color="var(--color-foreground)" />
        <div className="mt-1 border-2 border-border bg-background px-3 py-2 text-[10px] uppercase tracking-widest text-foreground">
          {log}
        </div>
        <div className="text-center text-[9px] uppercase tracking-widest text-muted-foreground">
          [ Space ] / [ Click ] Parry &middot; [ Esc ] Pause &middot; One Mistake Is Death
        </div>
      </div>

      <style>{`
        @keyframes parryFlash {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes enemyShake {
          0%,100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}

const SHAPE_CLIP: Record<string, string> = {
  pentagon: "polygon(50% 0,100% 35%,80% 100%,20% 100%,0 35%)",
  diamond: "polygon(50% 0,100% 50%,50% 100%,0 50%)",
  circle: "circle(50% at 50% 50%)",
  triangle: "polygon(50% 0,100% 100%,0 100%)",
  hex: "polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)",
  star:
    "polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)",
};

function EnemySprite({
  enemy,
  attacking,
  progress,
}: {
  enemy: EnemyDef;
  attacking: boolean;
  progress: number;
}) {
  return (
    <div className="absolute left-1/2 top-[30%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
      <PixelEnemy
        id={enemy.id}
        isBoss={enemy.isBoss}
        accent={enemy.color}
        size={enemy.isBoss ? 128 : 96}
        attacking={attacking}
        progress={progress}
      />
      <div className="mt-1 text-center text-[9px] uppercase tracking-widest text-foreground">
        {enemy.name}
        {enemy.title && (
          <div className="text-[8px] text-muted-foreground normal-case tracking-wider">
            {enemy.title}
          </div>
        )}
      </div>
    </div>
  );
}

function TelegraphBar({
  attack,
  progress,
}: {
  attack: AttackPattern;
  progress: number;
}) {
  const windowFrac = attack.parryWindowMs / attack.windupMs / 2;
  const center = 1;
  const start = Math.max(0, center - windowFrac);
  const end = Math.min(1, center + windowFrac);
  return (
    <div className="absolute bottom-3 left-1/2 w-[80%] -translate-x-1/2">
      <div className="relative h-3 border-2 border-border bg-background">
        {/* parry window marker */}
        <div
          className="absolute top-0 h-full"
          style={{
            left: `${start * 100}%`,
            width: `${(end - start) * 100}%`,
            background: "var(--color-accent)",
            opacity: 0.55,
          }}
        />
        {/* progress fill */}
        <div
          className="absolute top-0 h-full"
          style={{
            width: `${progress * 100}%`,
            background: "var(--color-danger)",
          }}
        />
      </div>
      <div className="mt-1 text-center text-[8px] uppercase tracking-widest text-muted-foreground">
        {attack.kind} — press space at the marker
      </div>
    </div>
  );
}

function StatusRow({
  label,
  alive,
  color,
}: {
  label: string;
  alive: boolean;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 text-[9px] uppercase tracking-widest text-foreground">{label}</div>
      <div className="relative h-4 flex-1 border-2 border-border bg-background">
        <div
          className="h-full transition-all duration-200"
          style={{
            width: alive ? "100%" : "0%",
            background: color,
          }}
        />
      </div>
      <div
        className="w-16 text-right text-[9px] uppercase tracking-widest"
        style={{ color: alive ? "var(--color-foreground)" : "var(--color-danger)" }}
      >
        {alive ? "Alive" : "Down"}
      </div>
    </div>
  );
}

function EnemyHealth({ enemy, hp }: { enemy: EnemyDef; hp: number }) {
  // Regulars use the simple Alive/Down row; bosses get HP pips.
  if (!enemy.isBoss || enemy.maxHp <= 1) {
    return (
      <StatusRow
        label={enemy.name.toUpperCase()}
        alive={hp > 0}
        color="var(--color-accent)"
      />
    );
  }
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 text-[9px] uppercase tracking-widest text-foreground">
        {enemy.name.toUpperCase()}
      </div>
      <div className="flex flex-1 items-center gap-1">
        {Array.from({ length: enemy.maxHp }).map((_, i) => {
          const filled = i < hp;
          return (
            <div
              key={i}
              className="h-4 flex-1 border-2 border-border transition-all duration-200"
              style={{
                background: filled ? enemy.color : "transparent",
              }}
            />
          );
        })}
      </div>
      <div className="w-16 text-right text-[9px] uppercase tracking-widest text-foreground">
        {hp}/{enemy.maxHp}
      </div>
    </div>
  );
}
