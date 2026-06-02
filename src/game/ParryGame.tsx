import { useCallback, useEffect, useRef, useState } from "react";
import type { AttackPattern, CharacterDef, EnemyDef, GameState } from "./types";
import { PixelCharacter } from "./PixelCharacters";
import { PixelEnemy } from "./PixelEnemy";
import { CurrencyHUD, getCredits, getGems, spendGems } from "./Currency";
import { ABILITIES, findAbility } from "./abilities";
import { isOwned, getUpgradeCount, getEquippedSkinColor, getEquippedAbility } from "./inventory";
import { minionForLevel, levelTier } from "./levels";

interface Incoming {
  uid: number;
  attack: AttackPattern;
  spawnedAt: number;
  /** Absolute landing time = spawnedAt + windupMs */
  landAt: number;
  /** Radians, direction from enemy toward player at schedule time. */
  aim: number;
}


type Flash = { uid: number; kind: "parry" | "hit" | "perfect" | "dodge" | "dash" | "instakill"; at: number };

export interface FightResult {
  result: "victory" | "defeat";
  fightMs: number;
  playerHpRemaining: number;
}

interface Props {
  character: CharacterDef;
  enemy: EnemyDef;
  level: number;
  onEnd: (result: FightResult) => void;
  /** Override how many enemies spawn (default uses enemyCountForLevel). */
  enemyCountOverride?: number;
  /** Multiplier on max HP (stacks with hp-up upgrades). */
  hpMul?: number;
  /** Multiplier on strike damage (stacks with dmg-up upgrades). */
  dmgMul?: number;
  /** Multiplier on player movement speed. */
  speedMul?: number;
  /** Additional ms shaved off ability cooldowns. */
  cdBonusMs?: number;
  /** HUD label, e.g. "Level" or "Wave". */
  hudLabel?: string;
  /** When true, top-right abandon button is hidden (use pause menu). */
  hideAbandon?: boolean;
}

const ARENA_W = 640;
const ARENA_H = 360;
const PLAYER_SPEED = 280;
const PLAYER_RADIUS = 18;
const ENEMY_SPEED = 70;
const ENEMY_RADIUS = 28;
const ENEMY_SEPARATION = 70;
const MELEE_RANGE = 80;
const RIPOSTE_MS = 900;
const BLOCK_RAISE_MS = 380;

type Zone =
  | { kind: "slash"; cx: number; cy: number; w: number; h: number; aim: number }
  | { kind: "thrust"; cx: number; cy: number; w: number; h: number; aim: number }
  | { kind: "heavy"; cx: number; cy: number; r: number; aim: number };

function zoneFor(attack: AttackPattern, ex: number, ey: number, aim: number): Zone {
  const cos = Math.cos(aim), sin = Math.sin(aim);
  if (attack.kind === "thrust") {
    const off = 110;
    return { kind: "thrust", cx: ex + cos * off, cy: ey + sin * off, w: 220, h: 90, aim };
  }
  if (attack.kind === "heavy") {
    const off = 30;
    return { kind: "heavy", cx: ex + cos * off, cy: ey + sin * off, r: 160, aim };
  }
  const off = 90;
  return { kind: "slash", cx: ex + cos * off, cy: ey + sin * off, w: 280, h: 180, aim };
}
function insideZone(px: number, py: number, z: Zone): boolean {
  const dx = px - z.cx, dy = py - z.cy;
  if (z.kind === "heavy") return dx * dx + dy * dy <= z.r * z.r;
  // Rotate point into zone local frame (zone's long axis aligned with aim).
  const cos = Math.cos(-z.aim), sin = Math.sin(-z.aim);
  const lx = dx * cos - dy * sin;
  const ly = dx * sin + dy * cos;
  return Math.abs(lx) <= z.w / 2 && Math.abs(ly) <= z.h / 2;
}


interface EnemyInstance {
  uid: number;
  def: EnemyDef;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  incoming: Incoming | null;
  nextAttackAt: number;
}

/** 5 in every level, +1 every 5 levels */
export function enemyCountForLevel(level: number): number {
  return 5 + Math.floor((level - 1) / 5);
}

export function ParryGame({
  character, enemy, level, onEnd,
  enemyCountOverride, hpMul = 1, dmgMul = 1, speedMul = 1, cdBonusMs = 0,
  hudLabel = "Level", hideAbandon = false,
}: Props) {
  // Upgrades (stackable)
  const hpUpCount = getUpgradeCount("hp-up");
  const dmgUpCount = getUpgradeCount("dmg-up");
  const cdDownCount = getUpgradeCount("cd-down");
  const baseMaxHp = character.maxHp + hpUpCount;
  const playerMaxHp = Math.max(1, Math.round(baseMaxHp * hpMul));
  const strikeDmg = Math.max(1, Math.round((1 + dmgUpCount) * dmgMul));
  const cdAdjust = Math.max(-8000, -2000 * cdDownCount - cdBonusMs);
  const skinColor = getEquippedSkinColor();
  const equippedAbility = getEquippedAbility();
  const tier = levelTier(level);
  const enemySpeed = ENEMY_SPEED * (1 + 0.1 * tier);
  const playerSpeed = PLAYER_SPEED * speedMul;


  const [state, setState] = useState<GameState>("playing");
  const [playerHp, setPlayerHp] = useState(playerMaxHp);
  const [flashes, setFlashes] = useState<Flash[]>([]);
  const [log, setLog] = useState<string>("* The battle begins.");
  const [paused, setPaused] = useState(false);
  const [credits] = useState(() => getCredits());
  const [gems, setGems] = useState(() => getGems());
  const [pose, setPose] = useState<"idle" | "walk" | "strike" | "hit">("idle");
  const [isWalking, setIsWalking] = useState(false);

  // Ability cooldowns
  const [cdInsta, setCdInsta] = useState(0);
  const [cdDash, setCdDash] = useState(0);
  const cdInstaRef = useRef(0);
  const cdDashRef = useRef(0);

  const playerRef = useRef({ x: ARENA_W * 0.5, y: ARENA_H * 0.78 });
  const keysRef = useRef<Record<string, boolean>>({});
  const blockHeldRef = useRef(false);
  const [, tick] = useState(0);

  const blockUntilRef = useRef(0);
  const riposteUntilRef = useRef(0);
  const riposteTargetRef = useRef<number | null>(null);
  const lastActionRef = useRef(0);
  const [riposteEndAt, setRiposteEndAt] = useState(0);

  const fightStartRef = useRef<number>(performance.now());
  const uidRef = useRef(1);
  const stateRef = useRef(state);
  stateRef.current = state;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  // Initial enemy spawn
  const enemiesRef = useRef<EnemyInstance[]>([]);
  if (enemiesRef.current.length === 0) {
    const count = enemyCountOverride ?? enemyCountForLevel(level);
    const minion = enemy.isBoss ? minionForLevel(level) : null;
    const arr: EnemyInstance[] = [];
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      const x = ARENA_W * (0.12 + 0.76 * t);
      const y = ARENA_H * (i % 2 === 0 ? 0.20 : 0.32);
      // Boss fights: index 0 is the boss; rest are minions.
      const def = minion && i > 0 ? minion : enemy;
      arr.push({
        uid: uidRef.current++,
        def,
        x, y,
        hp: def.maxHp,
        maxHp: def.maxHp,
        incoming: null,
        nextAttackAt: performance.now() + 600 + Math.random() * 1400 + i * 180,
      });
    }
    enemiesRef.current = arr;
  }

  const endFight = useCallback((result: "victory" | "defeat") => {
    if (stateRef.current !== "playing") return;
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

  const checkVictory = useCallback(() => {
    const alive = enemiesRef.current.filter((e) => e.hp > 0).length;
    if (alive === 0) endFight("victory");
  }, [endFight]);

  const damageEnemy = useCallback((uid: number, dmg: number, label: string) => {
    const en = enemiesRef.current.find((e) => e.uid === uid);
    if (!en || en.hp <= 0) return;
    en.hp = Math.max(0, en.hp - dmg);
    setLog(`* ${label} ${en.def.name}. -${dmg}`);
    pushFlash("perfect");
    setPose("strike");
    setTimeout(() => setPose("idle"), 220);
    checkVictory();
  }, [pushFlash, checkVictory]);

  const tryAttack = useCallback(() => {
    if (stateRef.current !== "playing" || pausedRef.current) return;
    const now = performance.now();
    if (now - lastActionRef.current < 180) return;
    lastActionRef.current = now;

    const p = playerRef.current;
    const inRiposte = now < riposteUntilRef.current;

    if (inRiposte && riposteTargetRef.current != null) {
      const targetUid = riposteTargetRef.current;
      riposteUntilRef.current = 0;
      riposteTargetRef.current = null;
      setRiposteEndAt(0);
      damageEnemy(targetUid, strikeDmg, "Riposte! Struck");
      return;
    }

    // Nearest alive enemy in melee range
    let best: EnemyInstance | null = null;
    let bestDist = Infinity;
    for (const e of enemiesRef.current) {
      if (e.hp <= 0) continue;
      const d = Math.hypot(p.x - e.x, p.y - e.y);
      if (d < bestDist) { bestDist = d; best = e; }
    }
    if (best && bestDist <= MELEE_RANGE + ENEMY_RADIUS) {
      damageEnemy(best.uid, strikeDmg, "You strike");
    } else {
      setLog(`* Too far! Close the distance.`);
    }
  }, [damageEnemy, strikeDmg]);

  const triggerBlockTap = useCallback(() => {
    if (stateRef.current !== "playing" || pausedRef.current) return;
    blockUntilRef.current = performance.now() + BLOCK_RAISE_MS;
    setLog("* Block raised.");
  }, []);

  const useInstakill = useCallback(() => {
    if (stateRef.current !== "playing" || pausedRef.current) return;
    if (!isOwned("instakill")) { setLog("* Insta-kill not owned. Visit the Store."); return; }
    const now = performance.now();
    if (now < cdInstaRef.current) return;
    const a = findAbility("instakill");
    cdInstaRef.current = now + Math.max(1000, a.cooldownMs + cdAdjust);
    setCdInsta(cdInstaRef.current);
    // Boss first, else closest alive enemy
    let target: EnemyInstance | null = null;
    for (const e of enemiesRef.current) {
      if (e.hp <= 0) continue;
      if (e.def.isBoss) { target = e; break; }
    }
    if (!target) {
      const p = playerRef.current;
      let bestDist = Infinity;
      for (const e of enemiesRef.current) {
        if (e.hp <= 0) continue;
        const d = Math.hypot(p.x - e.x, p.y - e.y);
        if (d < bestDist) { bestDist = d; target = e; }
      }
    }
    if (!target) return;
    target.hp = 0;
    pushFlash("instakill");
    setLog(`* INSTA-KILL! ${target.def.name} obliterated.`);
    checkVictory();
  }, [pushFlash, checkVictory, cdAdjust]);

  const useDash = useCallback(() => {
    if (stateRef.current !== "playing" || pausedRef.current) return;
    if (!isOwned("dash")) { setLog("* Dash not owned. Visit the Store."); return; }
    const now = performance.now();
    if (now < cdDashRef.current) return;
    const a = findAbility("dash");
    cdDashRef.current = now + Math.max(1000, a.cooldownMs + cdAdjust);
    setCdDash(cdDashRef.current);

    // Dash away from average enemy position
    const p = playerRef.current;
    let cx = 0, cy = 0, n = 0;
    for (const e of enemiesRef.current) {
      if (e.hp <= 0) continue;
      cx += e.x; cy += e.y; n++;
    }
    let dx = 0, dy = -1;
    if (n > 0) {
      cx /= n; cy /= n;
      dx = p.x - cx; dy = p.y - cy;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;
    }
    const DASH_DIST = 140;
    p.x = Math.max(PLAYER_RADIUS, Math.min(ARENA_W - PLAYER_RADIUS, p.x + dx * DASH_DIST));
    p.y = Math.max(PLAYER_RADIUS, Math.min(ARENA_H - PLAYER_RADIUS, p.y + dy * DASH_DIST));
    pushFlash("dash");
    setLog("* Dashed away!");
  }, [pushFlash, cdAdjust]);

  // Keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "w" || k === "a" || k === "s" || k === "d") {
        keysRef.current[k] = true;
        e.preventDefault();
        return;
      }
      if (k === "q") {
        e.preventDefault();
        if (!blockHeldRef.current) triggerBlockTap();
        blockHeldRef.current = true;
        return;
      }
      if (k === "e") {
        e.preventDefault();
        if (equippedAbility === "instakill") useInstakill();
        else if (equippedAbility === "dash") useDash();
        return;
      }
      if (e.code === "Space") { e.preventDefault(); tryAttack(); return; }
      if (e.code === "Escape") {
        if (stateRef.current !== "playing") return;
        e.preventDefault();
        setPaused((p) => p ? false : true);
      }
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "w" || k === "a" || k === "s" || k === "d") keysRef.current[k] = false;
      if (k === "q") blockHeldRef.current = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [tryAttack, triggerBlockTap, useDash, useInstakill, equippedAbility]);

  // Mouse click = attack
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

  // Resolve a single enemy's incoming attack at landing time
  const resolveAttack = useCallback((en: EnemyInstance) => {
    if (!en.incoming || en.hp <= 0) { en.incoming = null; return; }
    const inc = en.incoming;
    const player = playerRef.current;
    const zone = zoneFor(inc.attack, en.x, en.y, inc.aim);
    const inDanger = insideZone(player.x, player.y, zone);
    const now = performance.now();
    const blockUp = now < blockUntilRef.current || blockHeldRef.current;

    if (!inDanger) {
      setLog(`* Sidestepped ${en.def.name}'s ${inc.attack.kind}.`);
      pushFlash("dodge");
    } else if (blockUp) {
      const until = now + RIPOSTE_MS;
      riposteUntilRef.current = until;
      riposteTargetRef.current = en.uid;
      setRiposteEndAt(until);
      setLog(`* Blocked ${en.def.name}! Strike back within ${(RIPOSTE_MS / 1000).toFixed(1)}s.`);
      pushFlash("parry");
    } else {
      setPlayerHp((hp) => {
        const next = Math.max(0, hp - inc.attack.damage);
        if (next === 0) endFight("defeat");
        return next;
      });
      setLog(`* ${en.def.name}'s ${inc.attack.kind} lands. -${inc.attack.damage} HP`);
      pushFlash("hit");
      setPose("hit");
      setTimeout(() => setPose("idle"), 250);
    }
    en.incoming = null;
    const [a, b] = en.def.cadenceMs;
    en.nextAttackAt = now + (a + Math.random() * (b - a));
  }, [pushFlash, endFight]);

  // rAF loop
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
          p.x = Math.max(PLAYER_RADIUS, Math.min(ARENA_W - PLAYER_RADIUS, p.x + dx * playerSpeed * dt));
          p.y = Math.max(PLAYER_RADIUS, Math.min(ARENA_H - PLAYER_RADIUS, p.y + dy * playerSpeed * dt));
          setIsWalking(true);
        } else {
          setIsWalking(false);
        }

        const p = playerRef.current;
        const enemies = enemiesRef.current;

        // Per-enemy update: attack scheduling + resolution + chase
        for (const en of enemies) {
          if (en.hp <= 0) continue;

          // Resolve landed attack
          if (en.incoming && now >= en.incoming.landAt) {
            resolveAttack(en);
            continue;
          }

          // Schedule new attack
          if (!en.incoming && now >= en.nextAttackAt) {
            const atk = en.def.attacks[Math.floor(Math.random() * en.def.attacks.length)];
            en.incoming = {
              uid: uidRef.current++,
              attack: atk,
              spawnedAt: now,
              landAt: now + atk.windupMs,
              aim: Math.atan2(p.y - en.y, p.x - en.x),
            };
            continue;
          }

          // Chase only when not winding up
          if (!en.incoming) {
            let edx = p.x - en.x;
            let edy = p.y - en.y;
            const dist = Math.hypot(edx, edy);
            const stopAt = MELEE_RANGE * 0.7;
            if (dist > stopAt) {
              edx /= dist; edy /= dist;
              en.x = Math.max(ENEMY_RADIUS, Math.min(ARENA_W - ENEMY_RADIUS, en.x + edx * enemySpeed * dt));
              en.y = Math.max(ENEMY_RADIUS, Math.min(ARENA_H * 0.7, en.y + edy * enemySpeed * dt));
            }
          }

        }

        // Enemy separation — push apart overlapping enemies
        for (let i = 0; i < enemies.length; i++) {
          const a = enemies[i];
          if (a.hp <= 0) continue;
          for (let j = i + 1; j < enemies.length; j++) {
            const b = enemies[j];
            if (b.hp <= 0) continue;
            const dx = b.x - a.x, dy = b.y - a.y;
            const d = Math.hypot(dx, dy);
            if (d > 0 && d < ENEMY_SEPARATION) {
              const push = (ENEMY_SEPARATION - d) / 2;
              const nx = dx / d, ny = dy / d;
              a.x = Math.max(ENEMY_RADIUS, Math.min(ARENA_W - ENEMY_RADIUS, a.x - nx * push));
              a.y = Math.max(ENEMY_RADIUS, Math.min(ARENA_H * 0.7, a.y - ny * push));
              b.x = Math.max(ENEMY_RADIUS, Math.min(ARENA_W - ENEMY_RADIUS, b.x + nx * push));
              b.y = Math.max(ENEMY_RADIUS, Math.min(ARENA_H * 0.7, b.y + ny * push));
            }
          }
        }
      }
      tick((n) => (n + 1) % 1000000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [resolveAttack]);

  const overlayFlash = flashes[flashes.length - 1];
  const now = performance.now();
  const blockUp = now < blockUntilRef.current || blockHeldRef.current;
  const inRiposte = now < riposteUntilRef.current;
  const riposteRemaining = inRiposte ? Math.max(0, riposteEndAt - now) : 0;
  const player = playerRef.current;
  const enemies = enemiesRef.current;
  const aliveCount = enemies.filter((e) => e.hp > 0).length;
  const totalHp = enemies.reduce((s, e) => s + e.hp, 0);
  const totalMaxHp = enemies.reduce((s, e) => s + e.maxHp, 0);
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
        {hideAbandon ? (
          <div className="w-[80px]" />
        ) : (
          <button
            onClick={() => onEnd({ result: "defeat", fightMs: performance.now() - fightStartRef.current })}
            className="border border-border bg-background px-2 py-1 text-foreground hover:bg-foreground hover:text-background"
          >
            ← Abandon
          </button>
        )}
        <div className="text-foreground">
          {hudLabel} <span className="text-accent">{level}</span>
          {enemy.isBoss && <span className="ml-2 text-danger">⚠ BOSS</span>}
          <span className="ml-2 text-muted-foreground">· {aliveCount}/{enemies.length} alive</span>
        </div>
        <CurrencyHUD credits={credits} gems={gems} />
      </div>

      {/* Arena */}
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
        {/* Enemies */}
        {enemies.map((en) => {
          if (en.hp <= 0) return null;
          const tp = en.incoming
            ? Math.min(1, (performance.now() - en.incoming.spawnedAt) / en.incoming.attack.windupMs)
            : 0;
          const zone = en.incoming ? zoneFor(en.incoming.attack, en.x, en.y, en.incoming.aim) : null;
          const zoneAlpha = en.incoming ? 0.18 + 0.45 * tp : 0;
          return (
            <div key={en.uid}>
              {/* shadow */}
              <div
                className="pointer-events-none absolute -translate-x-1/2 rounded-[50%]"
                style={{
                  left: en.x, top: en.y + (en.def.isBoss ? 50 : 38),
                  width: en.def.isBoss ? 90 : 60, height: 10,
                  background: "radial-gradient(ellipse, rgba(0,0,0,0.55), rgba(0,0,0,0))",
                }}
              />
              {/* sprite */}
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                style={{ left: en.x, top: en.y }}
              >
                <PixelEnemy
                  id={en.def.id}
                  isBoss={en.def.isBoss}
                  accent={en.def.color}
                  size={en.def.isBoss ? 96 : 72}
                  attacking={!!en.incoming}
                  progress={tp}
                />
                {/* mini hp bar */}
                <div className="mt-1 flex h-1 w-12 border border-border bg-background">
                  <div className="h-full" style={{
                    width: `${(en.hp / en.maxHp) * 100}%`,
                    background: en.def.color,
                  }} />
                </div>
              </div>
              {/* danger zone */}
              {en.incoming && zone && (
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
                      transform: `rotate(${zone.aim}rad)`,
                      transformOrigin: "center",
                      background: `color-mix(in oklab, var(--color-danger) ${zoneAlpha * 100}%, transparent)`,
                      border: "2px dashed var(--color-danger)",
                    }}
                  />
                )
              )}
            </div>
          );

        })}

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
            {skinColor && (
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: `radial-gradient(circle, ${skinColor} 0%, transparent 70%)`,
                  filter: "blur(6px)",
                  opacity: effectivePose === "strike" ? 0.95 : 0.55,
                  transform: effectivePose === "strike" ? "scale(1.35)" : "scale(1)",
                  transition: "opacity 120ms, transform 120ms",
                }}
              />
            )}
            <PixelCharacter
              skinId="kid:default"
              size={56}
              pose={effectivePose}
              key={overlayFlash?.uid ?? effectivePose}
            />
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
        {/* Aggregate enemy bar */}
        <div className="flex items-center gap-3">
          <div className="w-32 text-[9px] uppercase tracking-widest text-foreground">
            Enemies ×{enemies.length}
          </div>
          <div className="relative h-4 flex-1 border-2 border-border bg-background">
            <div className="h-full transition-all duration-200"
              style={{
                width: totalMaxHp ? `${(totalHp / totalMaxHp) * 100}%` : "0%",
                background: enemy.color,
              }} />
          </div>
          <div className="w-16 text-right text-[9px] uppercase tracking-widest text-foreground">
            {totalHp}/{totalMaxHp}
          </div>
        </div>

        <StatusRow label={character.name.toUpperCase()} alive={playerHp > 0} color="var(--color-foreground)" hp={playerHp} maxHp={playerMaxHp} />

        {/* Equipped ability */}
        {(() => {
          if (!equippedAbility) {
            return (
              <div className="border-2 border-dashed border-border bg-background px-3 py-2 text-center text-[9px] uppercase tracking-widest text-muted-foreground">
                No ability equipped — equip one in Inventory
              </div>
            );
          }
          const a = ABILITIES.find((x) => x.id === equippedAbility);
          if (!a) return null;
          const ready = a.id === "instakill" ? instaReady : dashReady;
          const rem = a.id === "instakill" ? instaCdRem : dashCdRem;
          const onUse = () => (a.id === "instakill" ? useInstakill() : useDash());
          return (
            <button
              onClick={onUse}
              disabled={!ready}
              className="w-full border-2 border-border bg-background px-3 py-2 text-left text-[10px] uppercase tracking-widest text-foreground hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-background disabled:hover:text-foreground"
            >
              <div className="flex items-center justify-between">
                <span>[E] {a.name}</span>
                <span className="text-muted-foreground">
                  {ready ? "READY" : `${rem}s`}
                </span>
              </div>
            </button>
          );
        })()}

        <div className="mt-1 border-2 border-border bg-background px-3 py-2 text-[10px] uppercase tracking-widest text-foreground">
          {log}
        </div>
        <div className="text-center text-[9px] uppercase tracking-widest text-muted-foreground">
          [ WASD ] Move &middot; [ Q ] Block &middot; [ Space / Click ] Strike &middot; [ E ] Ability &middot; [ Esc ] Pause
        </div>
      </div>

      <style>{`
        @keyframes parryFlash { from { opacity: 1; } to { opacity: 0; } }
      `}</style>
    </div>
  );
}

function StatusRow({ label, alive, color, hp, maxHp }: { label: string; alive: boolean; color: string; hp?: number; maxHp?: number }) {
  const hasHp = typeof hp === "number" && typeof maxHp === "number" && maxHp > 0;
  const pct = hasHp ? Math.max(0, Math.min(100, (hp! / maxHp!) * 100)) : (alive ? 100 : 0);
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 text-[9px] uppercase tracking-widest text-foreground">{label}</div>
      <div className="relative h-4 flex-1 border-2 border-border bg-background">
        <div className="h-full transition-all duration-200" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="w-16 text-right text-[9px] uppercase tracking-widest"
        style={{ color: alive ? "var(--color-foreground)" : "var(--color-danger)" }}>
        {hasHp ? `${hp}/${maxHp}` : (alive ? "Alive" : "Down")}
      </div>
    </div>
  );
}
