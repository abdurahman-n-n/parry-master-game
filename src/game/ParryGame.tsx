import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { AttackPattern, CharacterDef, EnemyDef, GameState } from "./types";
import { PixelCharacter } from "./PixelCharacters";
import { PixelEnemy } from "./PixelEnemy";
import { CurrencyHUD, getCredits, getGems, spendGems } from "./Currency";
import { ABILITIES, findAbility } from "./abilities";
import { findItem, isOwned, getUpgradeCount, getEquippedSkinColor, getEquippedAbility, getEquippedWeapon } from "./inventory";
import { minionForLevel, levelTier } from "./levels";
import { getEquippedTitle, TITLES, unlockAchievement } from "./achievements";
import { playSfx } from "./sfx";

interface Incoming {
  uid: number;
  attack: AttackPattern;
  spawnedAt: number;
  /** Absolute landing time = spawnedAt + windupMs */
  landAt: number;
  /** Radians, direction from enemy toward player at schedule time. */
  aim: number;
}


type Flash = { uid: number; kind: "parry" | "hit" | "perfect" | "dodge" | "dash" | "instakill" | "blackflash"; at: number };

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
  /** Start fight with a specific HP value (clamped to max). Default = full HP. */
  startHpOverride?: number;
  /** Explicit ability override for screens that prepare their own loadout. */
  abilityOverride?: string | null;
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
const BASE_BLOCK_COOLDOWN_MS = 2000;
const BASE_STRIKE_COOLDOWN_MS = 180;
const WEAPON_SPECIAL_COOLDOWN_MS = 10000;
const MACE_SPECIAL_MS = 5000;
const DAGGER_RAIN_MS = 10000;

type Zone =
  | { kind: "slash"; cx: number; cy: number; w: number; h: number; aim: number }
  | { kind: "thrust"; cx: number; cy: number; w: number; h: number; aim: number }
  | { kind: "heavy"; cx: number; cy: number; r: number; aim: number };
type WeaponSpecialKind = "mace" | "daggers" | null;

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
  hudLabel = "Level", hideAbandon = false, startHpOverride, abilityOverride,
}: Props) {
  // Upgrades (stackable)
  const hpUpCount = getUpgradeCount("hp-up");
  const dmgUpCount = getUpgradeCount("dmg-up");
  const cdDownCount = getUpgradeCount("cd-down");
  const baseMaxHp = character.maxHp + hpUpCount;
  const playerMaxHp = Math.max(1, Math.round(baseMaxHp * hpMul));
  const strikeDmg = Math.max(1, Math.round((1 + dmgUpCount) * dmgMul));
  const hasteMs = Math.min(1200, 100 * cdDownCount + cdBonusMs);
  const cdAdjust = -hasteMs;
  const blockCooldownMs = Math.max(500, BASE_BLOCK_COOLDOWN_MS - hasteMs);
  const skinColor = getEquippedSkinColor();
  const equippedAbility = abilityOverride ?? getEquippedAbility();
  const equippedWeaponId = getEquippedWeapon();
  const equippedWeapon = equippedWeaponId && isOwned(equippedWeaponId) ? findItem(equippedWeaponId) : null;
  const weaponStats = equippedWeapon?.kind === "weapon" ? equippedWeapon.weapon : null;
  const strikeCooldownMs = Math.max(60, (weaponStats?.cooldownMs ?? BASE_STRIKE_COOLDOWN_MS) - hasteMs);
  const weaponDamage = weaponStats?.damage ?? Math.max(1, Math.round(strikeDmg * (weaponStats?.damageMultiplier ?? 1)));
  const weaponIsRanged = !!weaponStats?.ranged;
  const weaponName = equippedWeapon?.name ?? "Sword";
  const weaponId = equippedWeapon?.id ?? "weapon-sword";
  const hasParryShield = weaponId === "weapon-mace" || weaponId === "weapon-heavy-sword";
  const tier = levelTier(level);
  const enemySpeed = ENEMY_SPEED * (1 + 0.1 * tier);
  const playerSpeed = PLAYER_SPEED * speedMul;


  const [state, setState] = useState<GameState>("playing");
  const [playerHp, setPlayerHp] = useState(() =>
    Math.max(0, Math.min(playerMaxHp, startHpOverride ?? playerMaxHp))
  );
  const playerHpRef = useRef(0);
  playerHpRef.current = playerHp;
  const [flashes, setFlashes] = useState<Flash[]>([]);
  const [log, setLog] = useState<string>("* The battle begins.");
  const [paused, setPaused] = useState(false);
  const [credits] = useState(() => getCredits());
  const [gems, setGems] = useState(() => getGems());
  const [pose, setPose] = useState<"idle" | "walk" | "strike" | "hit">("idle");
  const [isWalking, setIsWalking] = useState(false);
  const [viewport, setViewport] = useState({ width: ARENA_W + 32, height: ARENA_H + 260 });
  const [dashEffectUntil, setDashEffectUntil] = useState(0);
  const [instakillEyeUntil, setInstakillEyeUntil] = useState(0);
  const [weaponSpecialCooldownUntil, setWeaponSpecialCooldownUntil] = useState(0);
  const [weaponSpecialUntil, setWeaponSpecialUntil] = useState(0);
  const [weaponSpecialKind, setWeaponSpecialKind] = useState<WeaponSpecialKind>(null);
  const [heavySlashUntil, setHeavySlashUntil] = useState(0);
  const [heavySlashAngle, setHeavySlashAngle] = useState(-0.2);
  const [daggerThrowAngle, setDaggerThrowAngle] = useState(-0.2);

  // Ability cooldowns
  const [cdInsta, setCdInsta] = useState(0);
  const [cdDash, setCdDash] = useState(0);
  const cdInstaRef = useRef(0);
  const cdDashRef = useRef(0);

  const playerRef = useRef({ x: ARENA_W * 0.5, y: ARENA_H * 0.78 });
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const aimRef = useRef({ x: ARENA_W * 0.5, y: ARENA_H * 0.2 });
  const keysRef = useRef<Record<string, boolean>>({});
  const blockHeldRef = useRef(false);
  const [, tick] = useState(0);
  const weaponSpecialCooldownRef = useRef(0);
  const weaponSpecialUntilRef = useRef(0);
  const weaponSpecialKindRef = useRef<WeaponSpecialKind>(null);
  const lastMaceSpecialHitRef = useRef(0);
  const lastDaggerRainHitRef = useRef(0);

  const blockUntilRef = useRef(0);
  const blockStartedAtRef = useRef(0);
  const blockCooldownUntilRef = useRef(0);
  const riposteUntilRef = useRef(0);
  const riposteTargetRef = useRef<number | null>(null);
  const lastActionRef = useRef(0);
  const [riposteEndAt, setRiposteEndAt] = useState(0);
  const [blockCooldownUntil, setBlockCooldownUntil] = useState(0);
  const frameParryTargetRef = useRef<{ uid: number; at: number } | null>(null);

  const fightStartRef = useRef<number>(performance.now());
  const uidRef = useRef(1);
  const stateRef = useRef(state);
  stateRef.current = state;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  weaponSpecialCooldownRef.current = weaponSpecialCooldownUntil;
  weaponSpecialUntilRef.current = weaponSpecialUntil;
  weaponSpecialKindRef.current = weaponSpecialKind;

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
    (endFight as any)._payload = {
      result,
      fightMs,
      playerHpRemaining: result === "victory" ? playerHpRef.current : 0,
    };
  }, []);

  const pushFlash = useCallback((kind: Flash["kind"]) => {
    const f: Flash = { uid: uidRef.current++, kind, at: performance.now() };
    setFlashes((arr) => [...arr, f]);
    setTimeout(() => setFlashes((arr) => arr.filter((x) => x.uid !== f.uid)), kind === "blackflash" ? 900 : 500);
  }, []);

  useEffect(() => {
    if (state === "playing") return;
    const payload = (endFight as any)._payload as FightResult | undefined;
    const t = setTimeout(
      () => onEnd(payload ?? {
        result: state === "victory" ? "victory" : "defeat",
        fightMs: performance.now() - fightStartRef.current,
        playerHpRemaining: state === "victory" ? playerHpRef.current : 0,
      }),
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
    const frameParry = frameParryTargetRef.current;
    const framePerfect = frameParry?.uid === uid && performance.now() - frameParry.at >= RIPOSTE_MS - 90;
    if (framePerfect && unlockAchievement("parry-frame-perfect")) {
      pushFlash("blackflash");
      playSfx("blackflash");
      setLog("* PARRY!! Frame Perfect title unlocked.");
    } else {
      pushFlash("perfect");
      playSfx(en.hp === 0 ? "kill" : "strike");
    }
    setPose("strike");
    setTimeout(() => setPose("idle"), 220);
    checkVictory();
  }, [pushFlash, checkVictory]);

  const tryAttack = useCallback(() => {
    if (stateRef.current !== "playing" || pausedRef.current) return;
    const now = performance.now();
    if (now - lastActionRef.current < strikeCooldownMs) return;
    lastActionRef.current = now;

    const p = playerRef.current;
    const inRiposte = now < riposteUntilRef.current;

    if (inRiposte && riposteTargetRef.current != null) {
      const targetUid = riposteTargetRef.current;
      riposteUntilRef.current = 0;
      riposteTargetRef.current = null;
      setRiposteEndAt(0);
      damageEnemy(targetUid, weaponDamage, "Riposte! Struck");
      frameParryTargetRef.current = null;
      return;
    }

    const aim = aimRef.current;
    const slashAngle = Math.atan2(aim.y - p.y, aim.x - p.x);

    if (weaponId === "weapon-heavy-sword") {
      setHeavySlashAngle(slashAngle);
      setHeavySlashUntil(now + 300);
    }
    if (weaponId === "weapon-daggers") {
      setDaggerThrowAngle(slashAngle);
    }

    // Nearest alive enemy in melee range, or closest to the cursor for daggers.
    let best: EnemyInstance | null = null;
    let bestDist = Infinity;
    for (const e of enemiesRef.current) {
      if (e.hp <= 0) continue;
      const d = weaponIsRanged ? Math.hypot(aim.x - e.x, aim.y - e.y) : Math.hypot(p.x - e.x, p.y - e.y);
      if (d < bestDist) { bestDist = d; best = e; }
    }
    if (best && (weaponIsRanged || bestDist <= MELEE_RANGE + ENEMY_RADIUS)) {
      damageEnemy(best.uid, weaponDamage, weaponIsRanged ? "Dagger hit" : "You strike");
    } else {
      setLog(`* Too far! Close the distance.`);
    }
  }, [damageEnemy, weaponDamage, weaponId, weaponIsRanged]);

  const useWeaponSpecial = useCallback(() => {
    if (stateRef.current !== "playing" || pausedRef.current) return;
    const now = performance.now();
    if (now < weaponSpecialCooldownRef.current || now < weaponSpecialUntilRef.current) {
      const remaining = Math.max(0, Math.ceil((Math.max(weaponSpecialCooldownRef.current, weaponSpecialUntilRef.current) - now) / 1000));
      setLog(`* Weapon special cooling down: ${remaining}s.`);
      return;
    }

    if (weaponId === "weapon-mace") {
      const endAt = now + MACE_SPECIAL_MS;
      weaponSpecialUntilRef.current = endAt;
      weaponSpecialCooldownRef.current = endAt + WEAPON_SPECIAL_COOLDOWN_MS;
      setWeaponSpecialKind("mace");
      setWeaponSpecialUntil(endAt);
      setWeaponSpecialCooldownUntil(weaponSpecialCooldownRef.current);
      setPose("strike");
      setLog("* Mace cyclone! Faster movement for 5s.");
      playSfx("dash");
      return;
    }

    if (weaponId === "weapon-daggers") {
      const endAt = now + DAGGER_RAIN_MS;
      weaponSpecialUntilRef.current = endAt;
      weaponSpecialCooldownRef.current = endAt + WEAPON_SPECIAL_COOLDOWN_MS;
      setWeaponSpecialKind("daggers");
      setWeaponSpecialUntil(endAt);
      setWeaponSpecialCooldownUntil(weaponSpecialCooldownRef.current);
      setPose("strike");
      setLog("* Dagger rain!");
      playSfx("strike");
      return;
    }

    if (weaponId === "weapon-heavy-sword") {
      const p = playerRef.current;
      const aim = aimRef.current;
      const aimAngle = Math.atan2(aim.y - p.y, aim.x - p.x);
      let hit = false;
      setHeavySlashUntil(now + 520);
      setHeavySlashAngle(aimAngle);
      setPose("strike");
      for (const e of enemiesRef.current) {
        if (e.hp <= 0) continue;
        const dx = e.x - p.x;
        const dy = e.y - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 230) continue;
        const angleDelta = Math.abs(Math.atan2(Math.sin(Math.atan2(dy, dx) - aimAngle), Math.cos(Math.atan2(dy, dx) - aimAngle)));
        if (angleDelta > 0.85) continue;
        hit = true;
        damageEnemy(e.uid, 30, "Excalibur cleaves");
        const len = dist || 1;
        e.x = Math.max(ENEMY_RADIUS, Math.min(ARENA_W - ENEMY_RADIUS, e.x + (dx / len) * 90));
        e.y = Math.max(ENEMY_RADIUS, Math.min(ARENA_H * 0.7, e.y + (dy / len) * 60));
      }
      weaponSpecialCooldownRef.current = now + 520 + WEAPON_SPECIAL_COOLDOWN_MS;
      setWeaponSpecialCooldownUntil(weaponSpecialCooldownRef.current);
      setLog(hit ? "* Excalibur shockwave!" : "* Excalibur missed.");
      playSfx(hit ? "strike" : "dash");
      return;
    }

    setLog("* Base sword has no weapon special.");
  }, [damageEnemy, weaponId]);

  const triggerBlockTap = useCallback(() => {
    if (stateRef.current !== "playing" || pausedRef.current) return;
    const now = performance.now();
    if (now < blockCooldownUntilRef.current) {
      setLog("* Block cooling down.");
      return;
    }
    blockStartedAtRef.current = now;
    blockUntilRef.current = now + BLOCK_RAISE_MS;
    blockCooldownUntilRef.current = now + blockCooldownMs;
    setBlockCooldownUntil(blockCooldownUntilRef.current);
    setLog("* Block raised.");
  }, [blockCooldownMs]);

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
    setInstakillEyeUntil(now + 560);
    target.hp = 0;
    pushFlash("instakill");
    playSfx("kill");
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
    setDashEffectUntil(now + 380);
    pushFlash("dash");
    playSfx("dash");
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
        useWeaponSpecial();
        return;
      }
      if (k === "e" || (k === "r" && equippedAbility === "instakill")) {
        e.preventDefault();
        if (equippedAbility === "instakill") useInstakill();
        else if (equippedAbility === "dash") useDash();
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        if (!blockHeldRef.current) triggerBlockTap();
        blockHeldRef.current = true;
        return;
      }
      if (e.code === "Escape") {
        if (stateRef.current !== "playing") return;
        e.preventDefault();
        setPaused((p) => p ? false : true);
      }
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "w" || k === "a" || k === "s" || k === "d") keysRef.current[k] = false;
      if (e.code === "Space") blockHeldRef.current = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [tryAttack, triggerBlockTap, useDash, useInstakill, useWeaponSpecial, equippedAbility]);

  const updateAimFromMouse = useCallback((event: { clientX: number; clientY: number }) => {
    const rect = arenaRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scale = rect.width / ARENA_W || 1;
    aimRef.current = {
      x: Math.max(0, Math.min(ARENA_W, (event.clientX - rect.left) / scale)),
      y: Math.max(0, Math.min(ARENA_H, (event.clientY - rect.top) / scale)),
    };
  }, []);

  const setMobileMoveFromPointer = useCallback((event: { currentTarget: EventTarget & HTMLElement; clientX: number; clientY: number }) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const dead = 12;
    keysRef.current.w = dy < -dead;
    keysRef.current.s = dy > dead;
    keysRef.current.a = dx < -dead;
    keysRef.current.d = dx > dead;
  }, []);

  const clearMobileMove = useCallback(() => {
    keysRef.current.w = false;
    keysRef.current.a = false;
    keysRef.current.s = false;
    keysRef.current.d = false;
  }, []);

  // Mouse click = attack
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const t = e.target as HTMLElement | null;
      if (t && t.closest("button")) return;
      e.preventDefault();
      updateAimFromMouse(e);
      tryAttack();
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [tryAttack, updateAimFromMouse]);

  // Resolve a single enemy's incoming attack at landing time
  const resolveAttack = useCallback((en: EnemyInstance) => {
    if (!en.incoming || en.hp <= 0) { en.incoming = null; return; }
    const inc = en.incoming;
    const player = playerRef.current;
    const zone = zoneFor(inc.attack, en.x, en.y, inc.aim);
    const inDanger = insideZone(player.x, player.y, zone);
    const now = performance.now();
    const blockUp = now < blockUntilRef.current;

    if (!inDanger) {
      setLog(`* Sidestepped ${en.def.name}'s ${inc.attack.kind}.`);
      pushFlash("dodge");
    } else if (blockUp) {
      const until = now + RIPOSTE_MS;
      riposteUntilRef.current = until;
      riposteTargetRef.current = en.uid;
      frameParryTargetRef.current = now - blockStartedAtRef.current <= 80 ? { uid: en.uid, at: now } : null;
      setRiposteEndAt(until);
      setLog(`* Blocked ${en.def.name}! Strike back within ${(RIPOSTE_MS / 1000).toFixed(1)}s.`);
      pushFlash("parry");
      playSfx("parry");
    } else {
      setPlayerHp((hp) => {
        const next = Math.max(0, hp - inc.attack.damage);
        if (next === 0) endFight("defeat");
        return next;
      });
      setLog(`* ${en.def.name}'s ${inc.attack.kind} lands. -${inc.attack.damage} HP`);
      pushFlash("hit");
      playSfx("hit");
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
          const specialSpeed = weaponSpecialKindRef.current === "mace" && now < weaponSpecialUntilRef.current ? 1.65 : 1;
          p.x = Math.max(PLAYER_RADIUS, Math.min(ARENA_W - PLAYER_RADIUS, p.x + dx * playerSpeed * specialSpeed * dt));
          p.y = Math.max(PLAYER_RADIUS, Math.min(ARENA_H - PLAYER_RADIUS, p.y + dy * playerSpeed * specialSpeed * dt));
          setIsWalking(true);
        } else {
          setIsWalking(false);
        }

        const p = playerRef.current;
        const enemies = enemiesRef.current;

        if (weaponSpecialKindRef.current === "mace" && now < weaponSpecialUntilRef.current && now - lastMaceSpecialHitRef.current > 480) {
          lastMaceSpecialHitRef.current = now;
          for (const en of enemies) {
            if (en.hp <= 0) continue;
            if (Math.hypot(p.x - en.x, p.y - en.y) <= 120) damageEnemy(en.uid, 20, "Mace cyclone hits");
          }
        }

        if (weaponSpecialKindRef.current === "daggers" && now < weaponSpecialUntilRef.current && now - lastDaggerRainHitRef.current > 320) {
          lastDaggerRainHitRef.current = now;
          const alive = enemies.filter((en) => en.hp > 0);
          if (alive.length > 0) {
            const target = alive[Math.floor(Math.random() * alive.length)];
            damageEnemy(target.uid, 2, "Dagger rain hits");
          }
        }

        if (weaponSpecialKindRef.current && now >= weaponSpecialUntilRef.current) {
          weaponSpecialKindRef.current = null;
          setWeaponSpecialKind(null);
          setWeaponSpecialUntil(0);
          setPose("idle");
        }

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
  }, [resolveAttack, damageEnemy, playerSpeed]);

  const overlayFlash = flashes[flashes.length - 1];
  const now = performance.now();
  const blockUp = now < blockUntilRef.current;
  const blockReady = now >= blockCooldownUntil;
  const blockCdRem = Math.max(0, (blockCooldownUntil - now) / 1000).toFixed(1);
  const inRiposte = now < riposteUntilRef.current;
  const riposteRemaining = inRiposte ? Math.max(0, riposteEndAt - now) : 0;
  const player = playerRef.current;
  const enemies = enemiesRef.current;
  const aliveCount = enemies.filter((e) => e.hp > 0).length;
  const totalHp = enemies.reduce((s, e) => s + e.hp, 0);
  const totalMaxHp = enemies.reduce((s, e) => s + e.maxHp, 0);
  const effectivePose: "idle" | "walk" | "strike" | "hit" =
    pose === "idle" && isWalking ? "walk" : pose;
  const equippedTitle = getEquippedTitle();
  const playerLabel = equippedTitle ? TITLES[equippedTitle].toUpperCase() : character.name.toUpperCase();
  const dashEffectActive = now < dashEffectUntil;
  const instakillEyeActive = now < instakillEyeUntil;
  const weaponSpecialActive = now < weaponSpecialUntil;
  const weaponSpecialReady = weaponId !== "weapon-sword" && now >= weaponSpecialCooldownUntil && !weaponSpecialActive;
  const weaponSpecialRemaining = Math.max(0, Math.ceil((Math.max(weaponSpecialCooldownUntil, weaponSpecialUntil) - now) / 1000));

  const instaReady = now >= cdInsta;
  const dashReady = now >= cdDash;
  const instaCdRem = Math.max(0, Math.ceil((cdInsta - now) / 1000));
  const dashCdRem = Math.max(0, Math.ceil((cdDash - now) / 1000));
  const arenaScale = Math.max(
    0.58,
    Math.min(1, (viewport.width - 12) / ARENA_W, (viewport.height - 190) / ARENA_H)
  );
  const arenaDisplayWidth = ARENA_W * arenaScale;
  const arenaDisplayHeight = ARENA_H * arenaScale;
  const compact = viewport.width < 560;

  return (
    <div className="flex h-full w-full flex-col items-center justify-start gap-3 overflow-auto bg-background p-3 font-pixel sm:justify-center sm:gap-4 sm:p-4">
      {/* HUD */}
      <div
        className="flex w-full items-center justify-between gap-2 text-[9px] uppercase tracking-widest sm:text-[10px]"
        style={{ maxWidth: ARENA_W, width: arenaDisplayWidth }}
      >
        {hideAbandon ? (
          <div className={compact ? "hidden" : "w-[80px]"} />
        ) : (
          <button
            onClick={() => onEnd({ result: "defeat", fightMs: performance.now() - fightStartRef.current, playerHpRemaining: 0 })}
            className="shrink-0 border border-border bg-background px-2 py-1 text-foreground hover:bg-foreground hover:text-background"
          >
            ← Abandon
          </button>
        )}
        <div className="min-w-0 truncate text-center text-foreground">
          {hudLabel} <span className="text-accent">{level}</span>
          {enemy.isBoss && <span className="ml-2 text-danger">⚠ BOSS</span>}
          <span className="ml-2 text-muted-foreground">· {aliveCount}/{enemies.length} alive</span>
        </div>
        {!compact && <CurrencyHUD credits={credits} gems={gems} />}
      </div>

      {/* Arena */}
      <div
        ref={arenaRef}
        className="relative overflow-hidden border-4 border-border"
        onMouseMove={updateAimFromMouse}
        style={{
          width: arenaDisplayWidth,
          height: arenaDisplayHeight,
        }}
      >
        <div
          className="relative overflow-hidden"
          style={{
            width: ARENA_W,
            height: ARENA_H,
            transform: `scale(${arenaScale})`,
            transformOrigin: "top left",
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

        {weaponSpecialKind === "daggers" && weaponSpecialActive && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {Array.from({ length: 14 }, (_, i) => (
              <div
                key={`dagger-rain-${i}`}
                className="absolute h-2 w-12 rotate-[68deg] bg-[oklch(0.90_0.02_250)] shadow-[0_0_10px_var(--color-accent)]"
                style={{
                  left: `${(i * 47) % ARENA_W}px`,
                  top: -30,
                  animation: `daggerRain ${720 + (i % 4) * 120}ms linear infinite`,
                  animationDelay: `${i * 70}ms`,
                }}
              />
            ))}
          </div>
        )}

        {now < heavySlashUntil && (
          <div
            className="pointer-events-none absolute h-28 w-[520px] -translate-y-1/2 border-y-4 border-accent"
            style={{
              left: player.x,
              top: player.y,
              background: "linear-gradient(90deg, transparent, color-mix(in oklab, var(--color-accent) 35%, transparent), transparent)",
              boxShadow: "0 0 30px var(--color-accent)",
              transformOrigin: "left center",
              transform: `rotate(${heavySlashAngle}rad)`,
              animation: "excaliburWave 520ms ease-out forwards",
            }}
          />
        )}

        {equippedTitle && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 border border-accent bg-background/95 px-2 py-1 text-[8px] uppercase tracking-widest text-accent"
            style={{
              left: player.x,
              top: player.y - 58,
              textShadow: "0 0 10px var(--color-accent)",
            }}
          >
            {TITLES[equippedTitle]}
          </div>
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
            {skinColor && (
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: `radial-gradient(circle, ${skinColor} 0%, transparent 70%)`,
                  filter: "blur(6px)",
                  opacity: effectivePose === "strike" ? 1 : 0.78,
                  transform: effectivePose === "strike" ? "scale(1.75)" : "scale(1.22)",
                  transition: "opacity 120ms, transform 120ms",
                }}
              />
            )}
            {skinColor && effectivePose === "strike" && (
              <div
                className="pointer-events-none absolute left-1/2 top-1/2 h-3 w-24 -translate-x-1/2 -translate-y-1/2 rotate-[-28deg]"
                style={{
                  background: `linear-gradient(90deg, transparent, ${skinColor}, white, ${skinColor}, transparent)`,
                  boxShadow: `0 0 18px ${skinColor}`,
                }}
              />
            )}
            {weaponId === "weapon-mace" && (
              <div
                className="pointer-events-none absolute left-[34px] top-[26px] h-8 w-16"
                style={{
                  animation: `maceSpin ${weaponSpecialActive ? "180ms" : effectivePose === "strike" ? "260ms" : "900ms"} linear infinite`,
                  filter: weaponSpecialActive ? "drop-shadow(0 0 12px var(--color-accent))" : undefined,
                  transformOrigin: "0px 50%",
                }}
              >
                <div className="absolute left-0 top-[13px] h-2 w-12 bg-[oklch(0.56_0.05_55)]" />
                <div className="absolute left-[42px] top-[6px] h-7 w-7 border-2 border-border bg-[oklch(0.48_0.03_250)]" />
                <div className="absolute left-[39px] top-[9px] h-2 w-3 bg-[oklch(0.75_0.02_250)]" />
                <div className="absolute left-[62px] top-[19px] h-2 w-3 bg-[oklch(0.75_0.02_250)]" />
              </div>
            )}
            <PixelCharacter
              skinId="kid:default"
              size={56}
              pose={effectivePose}
              dash={dashEffectActive}
              redEyeSpark={instakillEyeActive}
              showBuiltInWeapon={weaponId === "weapon-sword"}
              key={overlayFlash?.uid ?? effectivePose}
            />
            {weaponId === "weapon-daggers" && (
              <>
                <div className="pointer-events-none absolute left-[4px] top-[23px] h-2 w-10 origin-right rotate-[220deg] bg-[oklch(0.96_0.02_250)] shadow-[0_0_8px_var(--color-accent)]">
                  <div className="absolute right-[-2px] top-[-2px] h-6 w-2 bg-[oklch(0.45_0.12_285)]" />
                </div>
                <div className="pointer-events-none absolute left-[34px] top-[23px] h-2 w-10 origin-left rotate-[-40deg] bg-[oklch(0.96_0.02_250)] shadow-[0_0_8px_var(--color-accent)]">
                  <div className="absolute left-[-2px] top-[-2px] h-6 w-2 bg-[oklch(0.45_0.12_285)]" />
                </div>
                {effectivePose === "strike" && (
                  <div
                    className="pointer-events-none absolute left-[48px] top-[22px] h-2 w-28 origin-left bg-[oklch(0.96_0.02_250)] shadow-[0_0_14px_var(--color-accent)]"
                    style={{
                      transform: `rotate(${daggerThrowAngle}rad)`,
                      animation: "daggerThrow 240ms ease-out forwards",
                    }}
                  />
                )}
              </>
            )}
            {weaponId === "weapon-heavy-sword" && (
              <div className="pointer-events-none absolute left-[28px] top-[-15px] h-28 w-10 rotate-[16deg]" style={{ transformOrigin: "22px 84px", animation: effectivePose === "strike" ? "excaliburSwing 360ms ease-out" : undefined }}>
                <div className="absolute left-[17px] top-1 h-[78px] w-4 bg-[oklch(0.95_0.02_250)] shadow-[0_0_14px_var(--color-accent)]" />
                <div className="absolute left-[12px] top-0 h-6 w-14 bg-[oklch(0.95_0.02_250)]" style={{ clipPath: "polygon(50% 0, 100% 100%, 0 100%)" }} />
                <div className="absolute left-[4px] top-[76px] h-3 w-12 bg-[oklch(0.78_0.14_85)]" />
                <div className="absolute left-[22px] top-[78px] h-10 w-3 bg-[oklch(0.40_0.08_55)]" />
              </div>
            )}
            {weaponSpecialKind === "mace" && weaponSpecialActive && (
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-accent" style={{ animation: "maceCyclone 520ms linear infinite", boxShadow: "0 0 28px var(--color-accent), inset 0 0 18px var(--color-accent)" }} />
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
          {blockUp && hasParryShield && (
            <div
              className="pointer-events-none absolute left-[-22px] top-1/2 h-16 w-11 -translate-y-1/2 border-4 border-accent bg-background/80"
              style={{
                borderRadius: weaponId === "weapon-mace" ? "999px 999px 12px 12px" : 6,
                boxShadow: "0 0 18px var(--color-accent), inset 0 0 12px var(--color-accent)",
                animation: "weaponShieldPop 380ms ease-out",
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
                  : overlayFlash.kind === "blackflash"
                  ? "linear-gradient(90deg, black 0 10%, white 10% 20%, black 20% 30%, white 30% 40%, black 40% 50%, white 50% 60%, black 60% 70%, white 70% 80%, black 80% 90%, white 90% 100%)"
                  : overlayFlash.kind === "perfect"
                  ? "color-mix(in oklab, var(--color-accent) 65%, transparent)"
                  : overlayFlash.kind === "dodge"
                  ? "color-mix(in oklab, var(--color-foreground) 12%, transparent)"
                  : overlayFlash.kind === "dash"
                  ? "color-mix(in oklab, var(--color-accent) 20%, transparent)"
                  : overlayFlash.kind === "instakill"
                  ? "color-mix(in oklab, var(--color-danger) 60%, transparent)"
                  : "color-mix(in oklab, var(--color-accent) 25%, transparent)",
              animation: overlayFlash.kind === "blackflash" ? "impactFrames 820ms steps(6) forwards" : "parryFlash 280ms ease-out forwards",
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
                onClick={() => onEnd({ result: "defeat", fightMs: performance.now() - fightStartRef.current, playerHpRemaining: 0 })}
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

        {state === "playing" && !paused && (
          <>
            <div className="absolute left-2 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2 sm:hidden">
              <MobileActionButton label="Hit" onPress={tryAttack}>
                <span className="block h-5 w-5 border-2 border-current bg-current" />
              </MobileActionButton>
              <MobileActionButton label="Special" onPress={useWeaponSpecial} disabled={weaponId === "weapon-sword" || !weaponSpecialReady}>
                <span className="text-xl leading-none">*</span>
              </MobileActionButton>
              <MobileActionButton
                label="Ability"
                onPress={() => {
                  if (equippedAbility === "instakill") useInstakill();
                  else if (equippedAbility === "dash") useDash();
                }}
                disabled={!equippedAbility || (equippedAbility === "instakill" ? !instaReady : !dashReady)}
              >
                <span className="text-lg leading-none">{equippedAbility === "dash" ? ">" : equippedAbility === "instakill" ? "!" : "-"}</span>
              </MobileActionButton>
            </div>
            <div
              className="absolute bottom-3 right-3 z-20 flex h-28 w-28 touch-none select-none items-center justify-center rounded-full border-2 border-border bg-background/70 text-[8px] uppercase tracking-widest text-muted-foreground sm:hidden"
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                setMobileMoveFromPointer(event);
              }}
              onPointerMove={setMobileMoveFromPointer}
              onPointerUp={clearMobileMove}
              onPointerCancel={clearMobileMove}
            >
              <div className="h-8 w-8 rounded-full border-2 border-accent" />
            </div>
          </>
        )}
      </div>

      {/* Status + abilities + log */}
      <div className="flex w-full flex-col gap-2" style={{ maxWidth: ARENA_W, width: arenaDisplayWidth }}>
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

        <StatusRow label={playerLabel} alive={playerHp > 0} color="var(--color-foreground)" hp={playerHp} maxHp={playerMaxHp} />

        <div className="flex items-center justify-between border-2 border-border bg-background px-3 py-2 text-[9px] uppercase tracking-widest text-foreground">
          <span>[Space] Block</span>
          <span className="text-muted-foreground">{blockReady ? "READY" : `${blockCdRem}s`}</span>
        </div>

        <div className="flex items-center justify-between border-2 border-border bg-background px-3 py-2 text-[9px] uppercase tracking-widest text-foreground">
          <span>{weaponName}</span>
          <span className="text-muted-foreground">{(strikeCooldownMs / 1000).toFixed(1)}s · {weaponDamage} dmg</span>
        </div>

        <div className="flex items-center justify-between border-2 border-border bg-background px-3 py-2 text-[9px] uppercase tracking-widest text-foreground">
          <span>[Q] Weapon Special</span>
          <span className="text-muted-foreground">
            {weaponId === "weapon-sword" ? "NONE" : weaponSpecialReady ? "READY" : `${weaponSpecialRemaining}s`}
          </span>
        </div>

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
          [ WASD ] Move &middot; [ Space ] Block &middot; [ Q ] Weapon &middot; [ Click ] Strike &middot; [ E ] Ability &middot; [ Esc ] Pause
        </div>
      </div>

      <style>{`
        @keyframes parryFlash { from { opacity: 1; } to { opacity: 0; } }
        @keyframes daggerThrow {
          0% { opacity: 0; clip-path: inset(0 100% 0 0); }
          25% { opacity: 1; }
          100% { opacity: 0; clip-path: inset(0 0 0 0); }
        }
        @keyframes maceSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes maceCyclone {
          from { opacity: 0.85; transform: translate(-50%, -50%) rotate(0deg) scale(0.92); }
          to { opacity: 0.35; transform: translate(-50%, -50%) rotate(360deg) scale(1.12); }
        }
        @keyframes daggerRain {
          from { opacity: 0; transform: translateY(-40px) rotate(68deg); }
          15% { opacity: 1; }
          to { opacity: 0; transform: translateY(${ARENA_H + 80}px) rotate(68deg); }
        }
        @keyframes excaliburSwing {
          0% { transform: rotate(58deg) translateY(0); }
          45% { transform: rotate(-28deg) translateY(-4px); }
          100% { transform: rotate(28deg) translateY(0); }
        }
        @keyframes excaliburWave {
          from { opacity: 0; clip-path: inset(0 100% 0 0); filter: brightness(1.8); }
          25% { opacity: 1; }
          to { opacity: 0; clip-path: inset(0 0 0 0); filter: brightness(1); }
        }
        @keyframes weaponShieldPop {
          0% { opacity: 0; transform: translateY(-50%) scale(0.55); }
          35% { opacity: 1; transform: translateY(-50%) scale(1.1); }
          100% { opacity: 0.85; transform: translateY(-50%) scale(1); }
        }
        @keyframes impactFrames {
          0% { opacity: 1; filter: contrast(3); }
          70% { opacity: 0.9; filter: contrast(4); }
          100% { opacity: 0; filter: contrast(1); }
        }
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

function MobileActionButton({
  label,
  disabled = false,
  onPress,
  children,
}: {
  label: string;
  disabled?: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={(event) => {
        event.preventDefault();
        onPress();
      }}
      className="flex h-14 w-14 touch-none flex-col items-center justify-center gap-0.5 border-2 border-border bg-background/85 text-foreground shadow-[0_0_12px_rgba(0,0,0,0.35)] disabled:opacity-40"
      aria-label={label}
    >
      {children}
      <span className="sr-only">{label}</span>
    </button>
  );
}
