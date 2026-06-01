import { useCallback, useEffect, useRef, useState } from "react";
import type { AttackPattern, CharacterDef, EnemyDef, GameState } from "./types";
import { PixelCharacter } from "./PixelCharacters";
import { PixelEnemy } from "./PixelEnemy";
import {
  CurrencyHUD, getCredits, getGems, getCrowns, rewardFor,
} from "./Currency";
import { getEquipped, findSkin } from "./characters";

interface Incoming {
  uid: number;
  attack: AttackPattern;
  spawnedAt: number;
}

type Flash = { uid: number; kind: "parry" | "hit" | "perfect" | "dodge"; at: number };

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
const ENEMY_X = ARENA_W / 2;
const ENEMY_Y = ARENA_H * 0.30;
const PLAYER_SPEED = 340; // px/s
const PLAYER_RADIUS = 18;
const RIPOSTE_MS = 900;
const BLOCK_RAISE_MS = 320; // how long a block stays "up" after pressing

// ----- Danger zone geometry -----
type Zone =
  | { kind: "slash"; cx: number; cy: number; w: number; h: number }
  | { kind: "thrust"; cx: number; cy: number; w: number; h: number }
  | { kind: "heavy"; cx: number; cy: number; r: number };

function zoneFor(attack: AttackPattern): Zone {
  if (attack.kind === "thrust") return { kind: "thrust", cx: ENEMY_X, cy: ENEMY_Y + 130, w: 110, h: 280 };
  if (attack.kind === "heavy")  return { kind: "heavy",  cx: ENEMY_X, cy: ENEMY_Y + 50,  r: 230 };
  return { kind: "slash", cx: ENEMY_X, cy: ENEMY_Y + 120, w: 420, h: 240 };
}
function insideZone(px: number, py: number, z: Zone): boolean {
  if (z.kind === "heavy") {
    const dx = px - z.cx, dy = py - z.cy;
    return dx * dx + dy * dy <= z.r * z.r;
  }
  return Math.abs(px - z.cx) <= z.w / 2 && Math.abs(py - z.cy) <= z.h / 2;
}

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
  const [crowns] = useState(() => getCrowns());
  const [pendingReward, setPendingReward] = useState<{ credits: number; gems: number } | null>(null);
  const [pose, setPose] = useState<"idle" | "walk" | "strike" | "hit">("idle");
  const [isWalking, setIsWalking] = useState(false);
  const [killPops, setKillPops] = useState<{ uid: number; x: number; y: number }[]>([]);

  // Equipped skin + effects
  const equipped = useRef(getEquipped()).current;
  const skinEffects = findSkin(equipped.skinId)?.effects ?? {};

  // Player position (mutable ref) + force re-render at rAF speed
  const playerRef = useRef({ x: ARENA_W / 2, y: ARENA_H * 0.78 });
  const keysRef = useRef<Record<string, boolean>>({});
  const [, tick] = useState(0);

  // Block / riposte state machine
  const blockUntilRef = useRef(0);     // block is "up" if performance.now() < this
  const riposteUntilRef = useRef(0);   // riposte window
  const lastBlockPressRef = useRef(0); // cooldown
  const [riposteEndAt, setRiposteEndAt] = useState(0);

  const fightStartRef = useRef<number>(performance.now());
  const uidRef = useRef(1);
  const stateRef = useRef(state);
  stateRef.current = state;
  const incomingRef = useRef<Incoming | null>(null);
  incomingRef.current = incoming;
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
      (endFight as any)._payload = { result, credits: reward.credits, gems: reward.gems, fightMs };
    },
    [enemy.isBoss],
  );

  const pushFlash = useCallback((kind: Flash["kind"]) => {
    const f: Flash = { uid: uidRef.current++, kind, at: performance.now() };
    setFlashes((arr) => [...arr, f]);
    setTimeout(() => setFlashes((arr) => arr.filter((x) => x.uid !== f.uid)), 500);
  }, []);

  const spawnKillPop = useCallback(() => {
    if (!skinEffects.killNumbers) return;
    const uid = uidRef.current++;
    setKillPops((arr) => [...arr, { uid, x: ENEMY_X, y: ENEMY_Y - 10 }]);
    setTimeout(() => setKillPops((arr) => arr.filter((p) => p.uid !== uid)), 900);
  }, [skinEffects.killNumbers]);

  // Resolve on victory/defeat → tell shell
  useEffect(() => {
    if (state === "playing") return;
    const payload = (endFight as any)._payload as FightResult | undefined;
    const t = setTimeout(
      () =>
        onEnd(
          payload ?? {
            result: state === "victory" ? "victory" : "defeat",
            credits: 0, gems: 0,
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

  // Resolve attack at landing moment
  useEffect(() => {
    if (!incoming || state !== "playing" || paused) return;
    const landAt = incoming.attack.windupMs;
    const timeoutId = setTimeout(() => {
      if (pausedRef.current) return;
      const player = playerRef.current;
      const zone = zoneFor(incoming.attack);
      const inDanger = insideZone(player.x, player.y, zone);
      const now = performance.now();
      const blockUp = now < blockUntilRef.current;

      if (!inDanger) {
        // Free dodge
        setCombo(0);
        setLog(`* You sidestep the ${incoming.attack.kind}.`);
        pushFlash("dodge");
        setIncoming(null);
        return;
      }
      if (blockUp) {
        // Successful block → open riposte window
        const until = performance.now() + RIPOSTE_MS;
        riposteUntilRef.current = until;
        setRiposteEndAt(until);
        setCombo((c) => {
          const n = c + 1;
          setBestCombo((b) => Math.max(b, n));
          return n;
        });
        setLog(`* Blocked! Strike back within 1.5s.`);
        pushFlash("parry");
        setIncoming(null);
        return;
      }
      // Took the hit
      setPlayerHp((hp) => {
        const next = Math.max(0, hp - incoming.attack.damage);
        if (next === 0) endFight("defeat");
        return next;
      });
      setCombo(0);
      setLog(`* ${enemy.name}'s ${incoming.attack.kind} lands. -${incoming.attack.damage} HP`);
      pushFlash("hit");
      setPose("hit");
      setTimeout(() => setPose("idle"), 250);
      setIncoming(null);
    }, landAt);
    return () => clearTimeout(timeoutId);
  }, [incoming, state, enemy.name, pushFlash, paused, endFight]);

  // Action: melee / block / riposte (Space / Click)
  const tryAction = useCallback(() => {
    if (stateRef.current !== "playing" || pausedRef.current) return;
    const now = performance.now();
    // Melee: if close enough to enemy, swing
    const p = playerRef.current;
    const dxE = p.x - ENEMY_X, dyE = p.y - ENEMY_Y;
    const distToEnemy = Math.hypot(dxE, dyE);
    const MELEE_RANGE = 80;
    if (distToEnemy <= MELEE_RANGE && now >= riposteUntilRef.current) {
      if (now - lastBlockPressRef.current < 250) return;
      lastBlockPressRef.current = now;
      setEnemyHp((hp) => {
        const next = Math.max(0, hp - 1);
        if (next === 0) {
          spawnKillPop();
          endFight("victory");
        }
        return next;
      });
      setLog(`* You strike ${enemy.name}. -1`);
      pushFlash("perfect");
      setPose("strike");
      setTimeout(() => setPose("idle"), 220);
      return;
    }
    // Riposte takes priority if window open
    if (now < riposteUntilRef.current) {
      riposteUntilRef.current = 0;
      setRiposteEndAt(0);
      const refl = 1; // each successful riposte = 1 wound
      setEnemyHp((hp) => {
        const next = Math.max(0, hp - refl);
        if (next === 0) {
          spawnKillPop();
          endFight("victory");
        }
        return next;
      });
      setLog(`* Riposte! -${refl}`);
      pushFlash("perfect");
      setPose("strike");
      setTimeout(() => setPose("idle"), 250);
      return;
    }
    // Otherwise raise block (with tiny cooldown)
    if (now - lastBlockPressRef.current < 200) return;
    lastBlockPressRef.current = now;
    blockUntilRef.current = now + BLOCK_RAISE_MS;
    setPose("strike");
    setTimeout(() => setPose("idle"), 200);
    setLog("* Block raised.");
  }, [pushFlash, endFight, spawnKillPop, enemy.name]);

  // Keyboard handlers
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "w" || k === "a" || k === "s" || k === "d") {
        keysRef.current[k] = true;
        e.preventDefault();
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        tryAction();
        return;
      }
      if (e.code === "Escape") {
        if (stateRef.current !== "playing") return;
        e.preventDefault();
        setPaused((p) => {
          if (!p) setIncoming(null);
          return !p;
        });
      }
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "w" || k === "a" || k === "s" || k === "d") {
        keysRef.current[k] = false;
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [tryAction]);

  // Mouse click on arena = action
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const t = e.target as HTMLElement | null;
      if (t && t.closest("button")) return;
      e.preventDefault();
      tryAction();
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [tryAction]);

  // rAF loop: move player + repaint
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!pausedRef.current && stateRef.current === "playing") {
        const k = keysRef.current;
        let dx = 0, dy = 0;
        if (k["w"]) dy -= 1;
        if (k["s"]) dy += 1;
        if (k["a"]) dx -= 1;
        if (k["d"]) dx += 1;
        if (dx || dy) {
          const len = Math.hypot(dx, dy);
          dx /= len; dy /= len;
          const p = playerRef.current;
          p.x = Math.max(PLAYER_RADIUS, Math.min(ARENA_W - PLAYER_RADIUS, p.x + dx * PLAYER_SPEED * dt));
          p.y = Math.max(ARENA_H * 0.45, Math.min(ARENA_H - PLAYER_RADIUS, p.y + dy * PLAYER_SPEED * dt));
          setIsWalking(true);
        } else {
          setIsWalking(false);
        }
      }
      tick((n) => (n + 1) % 1000000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const telegraphProgress = incoming
    ? Math.min(1, (performance.now() - incoming.spawnedAt) / incoming.attack.windupMs)
    : 0;
  const overlayFlash = flashes[flashes.length - 1];
  const now = performance.now();
  const blockUp = now < blockUntilRef.current;
  const inRiposte = now < riposteUntilRef.current;
  const riposteRemaining = inRiposte ? Math.max(0, riposteEndAt - now) : 0;
  const player = playerRef.current;
  const zone = incoming ? zoneFor(incoming.attack) : null;
  const zoneAlpha = incoming ? 0.18 + 0.45 * telegraphProgress : 0;
  const slashColor = skinEffects.slashColor;
  const effectivePose: "idle" | "walk" | "strike" | "hit" =
    pose === "idle" && isWalking ? "walk" : pose;

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
        <CurrencyHUD credits={credits} gems={gems} crowns={crowns} reward={pendingReward} />
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
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
          style={{ left: ENEMY_X, top: ENEMY_Y }}
        >
          <PixelEnemy
            id={enemy.id}
            isBoss={enemy.isBoss}
            accent={enemy.color}
            size={enemy.isBoss ? 128 : 96}
            attacking={!!incoming}
            progress={telegraphProgress}
          />
          <div className="mt-1 text-center text-[9px] uppercase tracking-widest text-foreground">
            {enemy.name}
            {enemy.title && (
              <div className="text-[8px] text-muted-foreground normal-case tracking-wider">{enemy.title}</div>
            )}
          </div>
        </div>

        {/* Danger zone */}
        {incoming && zone && (
          zone.kind === "heavy" ? (
            <div
              className="pointer-events-none absolute rounded-full"
              style={{
                left: zone.cx - zone.r,
                top: zone.cy - zone.r,
                width: zone.r * 2,
                height: zone.r * 2,
                background: `color-mix(in oklab, var(--color-danger) ${zoneAlpha * 100}%, transparent)`,
                border: "2px dashed var(--color-danger)",
              }}
            />
          ) : (
            <div
              className="pointer-events-none absolute"
              style={{
                left: zone.cx - zone.w / 2,
                top: zone.cy - zone.h / 2,
                width: zone.w,
                height: zone.h,
                background: `color-mix(in oklab, var(--color-danger) ${zoneAlpha * 100}%, transparent)`,
                border: "2px dashed var(--color-danger)",
              }}
            />
          )
        )}

        {/* Player sprite */}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: player.x, top: player.y }}
        >
          <PixelCharacter
            skinId={equipped.skinId}
            size={56}
            pose={effectivePose}
            key={overlayFlash?.uid ?? effectivePose}
          />
          {blockUp && (
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                width: 70, height: 70,
                border: "2px solid var(--color-accent)",
                background: "color-mix(in oklab, var(--color-accent) 12%, transparent)",
              }}
            />
          )}
        </div>

        {/* Riposte indicator */}
        {inRiposte && (
          <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 text-center">
            <div className="text-[10px] uppercase tracking-[0.3em] text-accent">RIPOSTE!</div>
            <div className="mx-auto mt-1 h-1 w-32 bg-background">
              <div
                className="h-full bg-accent"
                style={{ width: `${(riposteRemaining / RIPOSTE_MS) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Kill numbers VFX */}
        {killPops.map((p) => (
          <div
            key={p.uid}
            className="pointer-events-none absolute -translate-x-1/2 font-pixel text-2xl font-bold"
            style={{
              left: p.x,
              top: p.y,
              color: slashColor ?? "oklch(0.65 0.25 25)",
              textShadow: "2px 2px 0 #000",
              animation: "killPop 900ms ease-out forwards",
            }}
          >
            99999999
          </div>
        ))}

        {/* Flash overlays */}
        {overlayFlash && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                overlayFlash.kind === "hit"
                  ? "color-mix(in oklab, var(--color-danger) 35%, transparent)"
                  : overlayFlash.kind === "perfect"
                  ? `color-mix(in oklab, ${slashColor ?? "var(--color-accent)"} 45%, transparent)`
                  : overlayFlash.kind === "dodge"
                  ? "color-mix(in oklab, var(--color-foreground) 12%, transparent)"
                  : "color-mix(in oklab, var(--color-accent) 25%, transparent)",
              animation: "parryFlash 280ms ease-out forwards",
            }}
          />
        )}

        {/* Pause overlay */}
        {paused && state === "playing" && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-background/90 text-center">
            <div className="text-2xl tracking-[0.4em] text-foreground">PAUSED</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">[ Esc ] to resume</div>
            <div className="flex gap-2">
              <button
                onClick={() => setPaused(false)}
                className="border-2 border-border bg-foreground px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-background hover:bg-accent"
              >
                ▶ Continue
              </button>
              <button
                onClick={() => onEnd({ result: "defeat", credits: 0, gems: 0, fightMs: performance.now() - fightStartRef.current })}
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
            <div className="text-[10px] uppercase text-muted-foreground">Combo: {bestCombo}</div>
            {state === "victory" && pendingReward && (
              <div className="text-[10px] uppercase tracking-widest text-accent">
                Reward: +{pendingReward.credits} credits
                {pendingReward.gems > 0 ? ` · +${pendingReward.gems} gem` : ""}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status + log */}
      <div className="flex w-full max-w-[640px] flex-col gap-2">
        <EnemyHealth enemy={enemy} hp={enemyHp} />
        <StatusRow label={character.name.toUpperCase()} alive={playerHp > 0} color="var(--color-foreground)" />
        <div className="mt-1 border-2 border-border bg-background px-3 py-2 text-[10px] uppercase tracking-widest text-foreground">
          {log}
        </div>
        <div className="text-center text-[9px] uppercase tracking-widest text-muted-foreground">
          [ WASD ] Move/Dodge &middot; [ Space / Click ] Close = Attack · Far = Block → Riposte &middot; [ Esc ] Pause
        </div>
      </div>

      <style>{`
        @keyframes parryFlash { from { opacity: 1; } to { opacity: 0; } }
        @keyframes killPop {
          0% { transform: translate(-50%, 0) scale(0.4); opacity: 0; }
          25% { transform: translate(-50%, -10px) scale(1.2); opacity: 1; }
          100% { transform: translate(-50%, -60px) scale(1); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function StatusRow({ label, alive, color }: { label: string; alive: boolean; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 text-[9px] uppercase tracking-widest text-foreground">{label}</div>
      <div className="relative h-4 flex-1 border-2 border-border bg-background">
        <div className="h-full transition-all duration-200" style={{ width: alive ? "100%" : "0%", background: color }} />
      </div>
      <div className="w-16 text-right text-[9px] uppercase tracking-widest"
        style={{ color: alive ? "var(--color-foreground)" : "var(--color-danger)" }}>
        {alive ? "Alive" : "Down"}
      </div>
    </div>
  );
}

function EnemyHealth({ enemy, hp }: { enemy: EnemyDef; hp: number }) {
  if (!enemy.isBoss || enemy.maxHp <= 1) {
    return <StatusRow label={enemy.name.toUpperCase()} alive={hp > 0} color="var(--color-accent)" />;
  }
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 text-[9px] uppercase tracking-widest text-foreground">{enemy.name.toUpperCase()}</div>
      <div className="flex flex-1 items-center gap-1">
        {Array.from({ length: enemy.maxHp }).map((_, i) => (
          <div key={i} className="h-4 flex-1 border-2 border-border transition-all duration-200"
            style={{ background: i < hp ? enemy.color : "transparent" }} />
        ))}
      </div>
      <div className="w-16 text-right text-[9px] uppercase tracking-widest text-foreground">{hp}/{enemy.maxHp}</div>
    </div>
  );
}
