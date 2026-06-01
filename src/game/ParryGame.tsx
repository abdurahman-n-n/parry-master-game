import { useCallback, useEffect, useRef, useState } from "react";
import type { AttackPattern, CharacterDef, EnemyDef, GameState } from "./types";
import { PixelCharacter } from "./PixelCharacters";
import { PixelEnemy } from "./PixelEnemy";
import { CurrencyHUD, getCredits, getGems, spendGems } from "./Currency";
import { ABILITIES, findAbility } from "./abilities";
import { isOwned, getEquippedSkinColor } from "./inventory";

interface Incoming {
  uid: number;
  attack: AttackPattern;
  spawnedAt: number;
}

type Flash = { uid: number; kind: "parry" | "hit" | "perfect" | "dodge" | "dash" | "instakill"; at: number };

export interface FightResult {
  result: "victory" | "defeat";
  fightMs: number;
}

interface Props {
  character: CharacterDef;
  enemy: EnemyDef;
  level: number;
  onEnd: (result: FightResult) => void;
}

const ARENA_W = 640;
const ARENA_H = 360;
const PLAYER_SPEED = 280;
const PLAYER_RADIUS = 18;
const ENEMY_SPEED = 90;
const ENEMY_RADIUS = 28;
const MELEE_RANGE = 80;
const RIPOSTE_MS = 900;
const BLOCK_RAISE_MS = 380;

type Zone =
  | { kind: "slash"; cx: number; cy: number; w: number; h: number }
  | { kind: "thrust"; cx: number; cy: number; w: number; h: number }
  | { kind: "heavy"; cx: number; cy: number; r: number };

function zoneFor(attack: AttackPattern, ex: number, ey: number): Zone {
  if (attack.kind === "thrust") return { kind: "thrust", cx: ex, cy: ey + 80, w: 90, h: 220 };
  if (attack.kind === "heavy")  return { kind: "heavy",  cx: ex, cy: ey + 30, r: 160 };
  return { kind: "slash", cx: ex, cy: ey + 70, w: 280, h: 180 };
}
function insideZone(px: number, py: number, z: Zone): boolean {
  if (z.kind === "heavy") {
    const dx = px - z.cx, dy = py - z.cy;
    return dx * dx + dy * dy <= z.r * z.r;
  }
  return Math.abs(px - z.cx) <= z.w / 2 && Math.abs(py - z.cy) <= z.h / 2;
}

export function ParryGame({ character, enemy, level, onEnd }: Props) {
  // Upgrades (read once at mount)
  const ownsHpUp = isOwned("hp-up");
  const ownsDmgUp = isOwned("dmg-up");
  const ownsCdDown = isOwned("cd-down");
  const strikeDmg = ownsDmgUp ? 2 : 1;
  const cdAdjust = ownsCdDown ? -2000 : 0;
  const skinColor = getEquippedSkinColor();

  const [state, setState] = useState<GameState>("playing");
  const [playerHp, setPlayerHp] = useState(character.maxHp + (ownsHpUp ? 1 : 0));
  const [enemyHp, setEnemyHp] = useState(enemy.maxHp);
  const [incoming, setIncoming] = useState<Incoming | null>(null);
  const [flashes, setFlashes] = useState<Flash[]>([]);
  const [log, setLog] = useState<string>("* The battle begins.");
  const [paused, setPaused] = useState(false);
  const [credits, setCredits] = useState(() => getCredits());
  const [gems, setGems] = useState(() => getGems());
  const [pose, setPose] = useState<"idle" | "walk" | "strike" | "hit">("idle");
  const [isWalking, setIsWalking] = useState(false);

  // Ability cooldowns (epoch ms when ready)
  const [cdInsta, setCdInsta] = useState(0);
  const [cdDash, setCdDash] = useState(0);
  const cdInstaRef = useRef(0);
  const cdDashRef = useRef(0);

  // Player + enemy positions
  const playerRef = useRef({ x: ARENA_W * 0.5, y: ARENA_H * 0.75 });
  const enemyRef = useRef({ x: ARENA_W * 0.5, y: ARENA_H * 0.3 });
  const keysRef = useRef<Record<string, boolean>>({});
  const blockHeldRef = useRef(false);
  const [, tick] = useState(0);

  const blockUntilRef = useRef(0);
  const riposteUntilRef = useRef(0);
  const lastActionRef = useRef(0);
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

  const endFight = useCallback((result: "victory" | "defeat") => {
    const fightMs = performance.now() - fightStartRef.current;
    setState(result);
    (endFight as any)._payload = { result, fightMs };
  }, []);

  const pushFlash = useCallback((kind: Flash["kind"]) => {
    const f: Flash = { uid: uidRef.current++, kind, at: performance.now() };
    setFlashes((arr) => [...arr, f]);
    setTimeout(() => setFlashes((arr) => arr.filter((x) => x.uid !== f.uid)), 500);
  }, []);

  useEffect(() => {
    if (state === "playing") return;
    const payload = (endFight as any)._payload as FightResult | undefined;
    const t = setTimeout(
      () => onEnd(payload ?? { result: state === "victory" ? "victory" : "defeat",
        fightMs: performance.now() - fightStartRef.current }),
      1100,
    );
    return () => clearTimeout(t);
  }, [state, onEnd, endFight]);

  // Schedule next attack
  useEffect(() => {
    if (state !== "playing" || paused || incoming) return;
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
      const en = enemyRef.current;
      const zone = zoneFor(incoming.attack, en.x, en.y);
      const inDanger = insideZone(player.x, player.y, zone);
      const now = performance.now();
      const blockUp = now < blockUntilRef.current || blockHeldRef.current;

      if (!inDanger) {
        setLog(`* You sidestep the ${incoming.attack.kind}.`);
        pushFlash("dodge");
        setIncoming(null);
        return;
      }
      if (blockUp) {
        const until = performance.now() + RIPOSTE_MS;
        riposteUntilRef.current = until;
        setRiposteEndAt(until);
        setLog(`* Blocked! Strike back within ${(RIPOSTE_MS / 1000).toFixed(1)}s.`);
        pushFlash("parry");
        setIncoming(null);
        return;
      }
      setPlayerHp((hp) => {
        const next = Math.max(0, hp - incoming.attack.damage);
        if (next === 0) endFight("defeat");
        return next;
      });
      setLog(`* ${enemy.name}'s ${incoming.attack.kind} lands. -${incoming.attack.damage} HP`);
      pushFlash("hit");
      setPose("hit");
      setTimeout(() => setPose("idle"), 250);
      setIncoming(null);
    }, landAt);
    return () => clearTimeout(timeoutId);
  }, [incoming, state, enemy.name, pushFlash, paused, endFight]);

  // Attack action (Space / Left click)
  const tryAttack = useCallback(() => {
    if (stateRef.current !== "playing" || pausedRef.current) return;
    const now = performance.now();
    if (now - lastActionRef.current < 180) return;
    lastActionRef.current = now;

    const p = playerRef.current;
    const en = enemyRef.current;
    const distToEnemy = Math.hypot(p.x - en.x, p.y - en.y);
    const inRiposte = now < riposteUntilRef.current;

    if (inRiposte) {
      riposteUntilRef.current = 0;
      setRiposteEndAt(0);
      setEnemyHp((hp) => {
        const next = Math.max(0, hp - strikeDmg);
        if (next === 0) endFight("victory");
        return next;
      });
      setLog(`* Riposte! -${strikeDmg}`);
      pushFlash("perfect");
      setPose("strike");
      setTimeout(() => setPose("idle"), 220);
      return;
    }
    if (distToEnemy <= MELEE_RANGE + ENEMY_RADIUS) {
      setEnemyHp((hp) => {
        const next = Math.max(0, hp - strikeDmg);
        if (next === 0) endFight("victory");
        return next;
      });
      setLog(`* You strike ${enemy.name}. -${strikeDmg}`);
      pushFlash("perfect");
      setPose("strike");
      setTimeout(() => setPose("idle"), 220);
      return;
    }
    setLog(`* Too far! Close the distance.`);
  }, [enemy.name, pushFlash, endFight, strikeDmg]);

  // Block (F key) — tap also raises block briefly
  const triggerBlockTap = useCallback(() => {
    if (stateRef.current !== "playing" || pausedRef.current) return;
    blockUntilRef.current = performance.now() + BLOCK_RAISE_MS;
    setLog("* Block raised.");
  }, []);

  // Ability: Insta-kill (Q)
  const useInstakill = useCallback(() => {
    if (stateRef.current !== "playing" || pausedRef.current) return;
    if (!isOwned("instakill")) { setLog("* Insta-kill not owned. Visit the Store."); return; }
    const now = performance.now();
    if (now < cdInstaRef.current) return;
    const a = findAbility("instakill");
    if (!spendGems(a.gemCost)) {
      setLog(`* Not enough gems (${a.gemCost} needed).`);
      return;
    }
    setGems(getGems());
    cdInstaRef.current = now + Math.max(1000, a.cooldownMs + cdAdjust);
    setCdInsta(cdInstaRef.current);
    setEnemyHp(0);
    pushFlash("instakill");
    setLog(`* INSTA-KILL! ${enemy.name} obliterated.`);
    endFight("victory");
  }, [enemy.name, pushFlash, endFight, cdAdjust]);

  // Ability: Dash (E) — moves player away from enemy attack zone
  const useDash = useCallback(() => {
    if (stateRef.current !== "playing" || pausedRef.current) return;
    if (!isOwned("dash")) { setLog("* Dash not owned. Visit the Store."); return; }
    const now = performance.now();
    if (now < cdDashRef.current) return;
    const a = findAbility("dash");
    cdDashRef.current = now + Math.max(1000, a.cooldownMs + cdAdjust);
    setCdDash(cdDashRef.current);

    const p = playerRef.current;
    const en = enemyRef.current;
    // Direction away from enemy
    let dx = p.x - en.x;
    let dy = p.y - en.y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    const DASH_DIST = 140;
    p.x = Math.max(PLAYER_RADIUS, Math.min(ARENA_W - PLAYER_RADIUS, p.x + dx * DASH_DIST));
    p.y = Math.max(PLAYER_RADIUS, Math.min(ARENA_H - PLAYER_RADIUS, p.y + dy * DASH_DIST));
    pushFlash("dash");
    setLog("* Dashed away!");
  }, [pushFlash]);

  // Keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "w" || k === "a" || k === "s" || k === "d") {
        keysRef.current[k] = true;
        e.preventDefault();
        return;
      }
      if (k === "f") {
        e.preventDefault();
        if (!blockHeldRef.current) triggerBlockTap();
        blockHeldRef.current = true;
        return;
      }
      if (k === "q") { e.preventDefault(); useInstakill(); return; }
      if (k === "e") { e.preventDefault(); useDash(); return; }
      if (e.code === "Space") { e.preventDefault(); tryAttack(); return; }
      if (e.code === "Escape") {
        if (stateRef.current !== "playing") return;
        e.preventDefault();
        setPaused((p) => { if (!p) setIncoming(null); return !p; });
      }
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "w" || k === "a" || k === "s" || k === "d") keysRef.current[k] = false;
      if (k === "f") blockHeldRef.current = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [tryAttack, triggerBlockTap, useDash, useInstakill]);

  // Left mouse click = attack
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const t = e.target as HTMLElement | null;
      if (t && t.closest("button")) return;
      e.preventDefault();
      tryAttack();
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [tryAttack]);

  // rAF loop: move player + move enemy + repaint
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!pausedRef.current && stateRef.current === "playing") {
        // Player movement
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
          p.y = Math.max(PLAYER_RADIUS, Math.min(ARENA_H - PLAYER_RADIUS, p.y + dy * PLAYER_SPEED * dt));
          setIsWalking(true);
        } else {
          setIsWalking(false);
        }
        // Enemy movement — slowly chases player, but stops while winding up
        const en = enemyRef.current;
        const p = playerRef.current;
        const incomingNow = incomingRef.current;
        if (!incomingNow) {
          let edx = p.x - en.x;
          let edy = p.y - en.y;
          const dist = Math.hypot(edx, edy);
          const stopAt = MELEE_RANGE * 0.7;
          if (dist > stopAt) {
            edx /= dist; edy /= dist;
            en.x = Math.max(ENEMY_RADIUS, Math.min(ARENA_W - ENEMY_RADIUS, en.x + edx * ENEMY_SPEED * dt));
            en.y = Math.max(ENEMY_RADIUS, Math.min(ARENA_H * 0.7, en.y + edy * ENEMY_SPEED * dt));
          }
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
  const blockUp = now < blockUntilRef.current || blockHeldRef.current;
  const inRiposte = now < riposteUntilRef.current;
  const riposteRemaining = inRiposte ? Math.max(0, riposteEndAt - now) : 0;
  const player = playerRef.current;
  const en = enemyRef.current;
  const zone = incoming ? zoneFor(incoming.attack, en.x, en.y) : null;
  const zoneAlpha = incoming ? 0.18 + 0.45 * telegraphProgress : 0;
  const effectivePose: "idle" | "walk" | "strike" | "hit" =
    pose === "idle" && isWalking ? "walk" : pose;

  const instaReady = now >= cdInsta;
  const dashReady = now >= cdDash;
  const instaCdRem = Math.max(0, Math.ceil((cdInsta - now) / 1000));
  const dashCdRem = Math.max(0, Math.ceil((cdDash - now) / 1000));

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-background p-4 font-pixel">
      {/* HUD */}
      <div className="flex w-full max-w-[640px] items-center justify-between text-[10px] uppercase tracking-widest">
        <button
          onClick={() => onEnd({ result: "defeat", fightMs: performance.now() - fightStartRef.current })}
          className="border border-border bg-background px-2 py-1 text-foreground hover:bg-foreground hover:text-background"
        >
          ← Abandon
        </button>
        <div className="text-foreground">
          Level <span className="text-accent">{level}</span>
          {enemy.isBoss && <span className="ml-2 text-danger">⚠ BOSS</span>}
        </div>
        <CurrencyHUD credits={credits} gems={gems} />
      </div>

      {/* Arena — flat 2D */}
      <div
        className="relative overflow-hidden border-4 border-border"
        style={{
          width: ARENA_W,
          height: ARENA_H,
          background: "oklch(0.18 0.02 270)",
          backgroundImage:
            "linear-gradient(oklch(0.22 0.02 270) 1px, transparent 1px), linear-gradient(90deg, oklch(0.22 0.02 270) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      >
        {/* Enemy shadow */}
        <div
          className="pointer-events-none absolute -translate-x-1/2 rounded-[50%]"
          style={{
            left: en.x, top: en.y + (enemy.isBoss ? 50 : 38),
            width: enemy.isBoss ? 90 : 70, height: 12,
            background: "radial-gradient(ellipse, rgba(0,0,0,0.55), rgba(0,0,0,0))",
          }}
        />

        {/* Enemy sprite */}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
          style={{ left: en.x, top: en.y }}
        >
          <PixelEnemy
            id={enemy.id}
            isBoss={enemy.isBoss}
            accent={enemy.color}
            size={enemy.isBoss ? 112 : 88}
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
                left: zone.cx - zone.r, top: zone.cy - zone.r,
                width: zone.r * 2, height: zone.r * 2,
                background: `color-mix(in oklab, var(--color-danger) ${zoneAlpha * 100}%, transparent)`,
                border: "2px dashed var(--color-danger)",
              }}
            />
          ) : (
            <div
              className="pointer-events-none absolute"
              style={{
                left: zone.cx - zone.w / 2, top: zone.cy - zone.h / 2,
                width: zone.w, height: zone.h,
                background: `color-mix(in oklab, var(--color-danger) ${zoneAlpha * 100}%, transparent)`,
                border: "2px dashed var(--color-danger)",
              }}
            />
          )
        )}

        {/* Player shadow */}
        <div
          className="pointer-events-none absolute -translate-x-1/2 rounded-[50%]"
          style={{
            left: player.x, top: player.y + 24,
            width: 52, height: 12,
            background: "radial-gradient(ellipse, rgba(0,0,0,0.55), rgba(0,0,0,0))",
          }}
        />

        {/* Player sprite */}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: player.x, top: player.y }}
        >
          <div className="relative" style={{ width: 56, height: 56 }}>
            <PixelCharacter
              skinId="kid:default"
              size={56}
              pose={effectivePose}
              key={overlayFlash?.uid ?? effectivePose}
            />
            {skinColor && (
              <div
                className="pointer-events-none absolute inset-0"
                style={{ background: skinColor, mixBlendMode: "color", opacity: 0.75 }}
              />
            )}
          </div>
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
              <div className="h-full bg-accent" style={{ width: `${(riposteRemaining / RIPOSTE_MS) * 100}%` }} />
            </div>
          </div>
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
                  : overlayFlash.kind === "dodge"
                  ? "color-mix(in oklab, var(--color-foreground) 12%, transparent)"
                  : overlayFlash.kind === "dash"
                  ? "color-mix(in oklab, var(--color-accent) 20%, transparent)"
                  : overlayFlash.kind === "instakill"
                  ? "color-mix(in oklab, var(--color-danger) 60%, transparent)"
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
                onClick={() => onEnd({ result: "defeat", fightMs: performance.now() - fightStartRef.current })}
                className="border-2 border-border bg-background px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-foreground hover:bg-foreground hover:text-background"
              >
                ✕ Abandon
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
          </div>
        )}
      </div>

      {/* Status + abilities + log */}
      <div className="flex w-full max-w-[640px] flex-col gap-2">
        <EnemyHealth enemy={enemy} hp={enemyHp} />
        <StatusRow label={character.name.toUpperCase()} alive={playerHp > 0} color="var(--color-foreground)" />

        {/* Abilities bar */}
        <div className="flex items-center gap-2">
          {ABILITIES.map((a) => {
            const ready = a.id === "instakill" ? instaReady : dashReady;
            const rem = a.id === "instakill" ? instaCdRem : dashCdRem;
            return (
              <button
                key={a.id}
                onClick={() => (a.id === "instakill" ? useInstakill() : useDash())}
                disabled={!ready}
                className="flex-1 border-2 border-border bg-background px-2 py-1 text-left text-[9px] uppercase tracking-widest text-foreground hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-background disabled:hover:text-foreground"
              >
                <div className="flex items-center justify-between">
                  <span>[{a.hotkey}] {a.name}</span>
                  <span className="text-muted-foreground">
                    {ready ? (a.gemCost > 0 ? `${a.gemCost}💎` : "FREE") : `${rem}s`}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-1 border-2 border-border bg-background px-3 py-2 text-[10px] uppercase tracking-widest text-foreground">
          {log}
        </div>
        <div className="text-center text-[9px] uppercase tracking-widest text-muted-foreground">
          [ WASD ] Move &middot; [ F ] Block &middot; [ Space / Click ] Strike &middot; [ Q ] Insta-kill &middot; [ E ] Dash &middot; [ Esc ] Pause
        </div>
      </div>

      <style>{`
        @keyframes parryFlash { from { opacity: 1; } to { opacity: 0; } }
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
