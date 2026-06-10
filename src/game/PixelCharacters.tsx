// Original pixel sprites for the three playable characters.
// 12x12 grid, same format as PixelHero.

type Pose = "idle" | "walk" | "strike" | "hit";
type Cell = [number, number, string];

interface Variant {
  idle: Cell[];
  strike: Cell[];
}

// ---------- THE KID (default + fallen skin) ----------

const SKIN = "oklch(0.82 0.09 55)";
const HAIR = "oklch(0.35 0.06 60)";
const SHIRT_RED = "oklch(0.55 0.20 25)";
const SHIRT_STRIPE = "oklch(0.85 0.05 60)"; // pale stripe for fallen skin
const PANTS = "oklch(0.45 0.08 260)";
const SHOE  = "oklch(0.25 0.04 60)";
const BLADE = "oklch(0.97 0.01 280)";
const BLADE_RED = "oklch(0.65 0.25 25)";
const HILT  = "oklch(0.45 0.14 285)";

function kidIdle(shirtA: string, shirtB: string, blade: string): Cell[] {
  return [
    [4,1,HAIR],[5,1,HAIR],[6,1,HAIR],[7,1,HAIR],
    [3,2,HAIR],[4,2,HAIR],[5,2,HAIR],[6,2,HAIR],[7,2,HAIR],[8,2,HAIR],
    [3,3,SKIN],[4,3,SKIN],[5,3,SKIN],[6,3,SKIN],[7,3,SKIN],[8,3,SKIN],
    [3,4,SKIN],[4,4,HAIR],[5,4,SKIN],[6,4,SKIN],[7,4,HAIR],[8,4,SKIN],
    [3,5,SKIN],[4,5,SKIN],[5,5,SKIN],[6,5,SKIN],[7,5,SKIN],[8,5,SKIN],
    [5,6,SKIN],[6,6,SKIN],
    [3,7,shirtA],[4,7,shirtB],[5,7,shirtA],[6,7,shirtB],[7,7,shirtA],[8,7,shirtB],
    [3,8,SKIN],[4,8,shirtA],[5,8,shirtB],[6,8,shirtA],[7,8,shirtB],[8,8,SKIN],
    [4,9,PANTS],[5,9,PANTS],[6,9,PANTS],[7,9,PANTS],
    [4,10,PANTS],[5,10,PANTS],[6,10,PANTS],[7,10,PANTS],
    [4,11,SHOE],[5,11,SHOE],[6,11,SHOE],[7,11,SHOE],
    [9,7,HILT],[9,8,blade],[9,9,blade],[9,10,blade],
  ];
}
function kidStrike(shirtA: string, shirtB: string, blade: string): Cell[] {
  return [
    [4,1,HAIR],[5,1,HAIR],[6,1,HAIR],[7,1,HAIR],
    [3,2,HAIR],[4,2,HAIR],[5,2,HAIR],[6,2,HAIR],[7,2,HAIR],[8,2,HAIR],
    [3,3,SKIN],[4,3,SKIN],[5,3,SKIN],[6,3,SKIN],[7,3,SKIN],[8,3,SKIN],
    [3,4,SKIN],[4,4,HAIR],[5,4,SKIN],[6,4,SKIN],[7,4,HAIR],[8,4,SKIN],
    [3,5,SKIN],[4,5,SKIN],[5,5,HAIR],[6,5,HAIR],[7,5,SKIN],[8,5,SKIN],
    [5,6,SKIN],[6,6,SKIN],
    [3,7,shirtA],[4,7,shirtB],[5,7,shirtA],[6,7,shirtB],[7,7,shirtA],
    [4,8,shirtB],[5,8,shirtA],[6,8,shirtB],[7,8,shirtA],[8,8,SKIN],
    [4,9,PANTS],[5,9,PANTS],[6,9,PANTS],[7,9,PANTS],
    [3,10,PANTS],[4,10,PANTS],[6,10,PANTS],[7,10,PANTS],
    [3,11,SHOE],[4,11,SHOE],[6,11,SHOE],[7,11,SHOE],
    [8,7,HILT],[9,6,blade],[10,5,blade],[11,4,blade],[11,3,blade],
  ];
}

// ---------- HOLLOW (small cloaked vessel with a long needle) ----------

const CLOAK = "oklch(0.20 0.02 280)";
const CLOAK_EDGE = "oklch(0.35 0.04 280)";
const MASK = "oklch(0.92 0.02 80)";
const MASK_DARK = "oklch(0.25 0.02 280)";
const HORN = "oklch(0.92 0.02 80)";
const NEEDLE = "oklch(0.80 0.04 220)";
const NEEDLE_DARK = "oklch(0.55 0.04 220)";

const HOLLOW_IDLE: Cell[] = [
  // horns
  [3,1,HORN],[8,1,HORN],
  [3,2,HORN],[8,2,HORN],
  // mask
  [4,2,MASK],[5,2,MASK],[6,2,MASK],[7,2,MASK],
  [3,3,MASK],[4,3,MASK_DARK],[5,3,MASK],[6,3,MASK],[7,3,MASK_DARK],[8,3,MASK],
  [3,4,MASK],[4,4,MASK],[5,4,MASK],[6,4,MASK],[7,4,MASK],[8,4,MASK],
  // cloak shoulders
  [2,5,CLOAK_EDGE],[3,5,CLOAK],[4,5,CLOAK],[5,5,CLOAK],[6,5,CLOAK],[7,5,CLOAK],[8,5,CLOAK],[9,5,CLOAK_EDGE],
  [2,6,CLOAK],[3,6,CLOAK],[4,6,CLOAK],[5,6,CLOAK],[6,6,CLOAK],[7,6,CLOAK],[8,6,CLOAK],[9,6,CLOAK],
  [3,7,CLOAK],[4,7,CLOAK],[5,7,CLOAK],[6,7,CLOAK],[7,7,CLOAK],[8,7,CLOAK],
  [3,8,CLOAK],[4,8,CLOAK],[5,8,CLOAK],[6,8,CLOAK],[7,8,CLOAK],[8,8,CLOAK],
  [3,9,CLOAK_EDGE],[4,9,CLOAK],[5,9,CLOAK],[6,9,CLOAK],[7,9,CLOAK],[8,9,CLOAK_EDGE],
  [4,10,CLOAK_EDGE],[5,10,CLOAK_EDGE],[6,10,CLOAK_EDGE],[7,10,CLOAK_EDGE],
  [5,11,CLOAK_EDGE],[6,11,CLOAK_EDGE],
  // needle resting at right
  [10,5,NEEDLE_DARK],
  [10,6,NEEDLE],[10,7,NEEDLE],[10,8,NEEDLE],[10,9,NEEDLE],[10,10,NEEDLE],[10,11,NEEDLE],
];

const HOLLOW_STRIKE: Cell[] = [
  [3,1,HORN],[8,1,HORN],
  [3,2,HORN],[8,2,HORN],
  [4,2,MASK],[5,2,MASK],[6,2,MASK],[7,2,MASK],
  [3,3,MASK],[4,3,MASK_DARK],[5,3,MASK],[6,3,MASK],[7,3,MASK_DARK],[8,3,MASK],
  [3,4,MASK],[4,4,MASK],[5,4,MASK],[6,4,MASK],[7,4,MASK],[8,4,MASK],
  [2,5,CLOAK_EDGE],[3,5,CLOAK],[4,5,CLOAK],[5,5,CLOAK],[6,5,CLOAK],[7,5,CLOAK],[8,5,CLOAK],[9,5,CLOAK_EDGE],
  [2,6,CLOAK],[3,6,CLOAK],[4,6,CLOAK],[5,6,CLOAK],[6,6,CLOAK],[7,6,CLOAK],[8,6,CLOAK],[9,6,CLOAK],
  [3,7,CLOAK],[4,7,CLOAK],[5,7,CLOAK],[6,7,CLOAK],[7,7,CLOAK],[8,7,CLOAK],
  [4,8,CLOAK],[5,8,CLOAK],[6,8,CLOAK],[7,8,CLOAK],
  [4,9,CLOAK_EDGE],[5,9,CLOAK],[6,9,CLOAK],[7,9,CLOAK_EDGE],
  [5,10,CLOAK_EDGE],[6,10,CLOAK_EDGE],
  // needle thrust forward-right
  [9,4,NEEDLE_DARK],[10,3,NEEDLE],[11,2,NEEDLE],
];

// ---------- BJORN (viking with shield + heavy sword) ----------

const BEARD = "oklch(0.78 0.10 70)";   // blond beard
const HAIR_B = "oklch(0.62 0.10 60)";
const HELM = "oklch(0.50 0.02 260)";
const TUNIC = "oklch(0.35 0.10 40)";   // rust tunic
const FUR = "oklch(0.55 0.05 60)";
const SHIELD_WOOD = "oklch(0.50 0.10 50)";
const SHIELD_BAND = "oklch(0.35 0.04 60)";
const SHIELD_BOSS = "oklch(0.75 0.02 60)";
const SWORD = "oklch(0.85 0.02 260)";
const SWORD_HILT = "oklch(0.55 0.10 60)";

const BJORN_IDLE: Cell[] = [
  // helm
  [3,1,HELM],[4,1,HELM],[5,1,HELM],[6,1,HELM],[7,1,HELM],[8,1,HELM],
  [3,2,HELM],[4,2,HELM],[5,2,HELM],[6,2,HELM],[7,2,HELM],[8,2,HELM],
  // hair sides
  [2,3,HAIR_B],[9,3,HAIR_B],
  // face
  [3,3,SKIN],[4,3,SKIN],[5,3,SKIN],[6,3,SKIN],[7,3,SKIN],[8,3,SKIN],
  [3,4,SKIN],[4,4,HELM],[5,4,SKIN],[6,4,SKIN],[7,4,HELM],[8,4,SKIN],
  // beard
  [3,5,BEARD],[4,5,BEARD],[5,5,BEARD],[6,5,BEARD],[7,5,BEARD],[8,5,BEARD],
  [4,6,BEARD],[5,6,BEARD],[6,6,BEARD],[7,6,BEARD],
  // fur shoulders
  [2,6,FUR],[9,6,FUR],
  [2,7,FUR],[9,7,FUR],
  // tunic
  [3,7,TUNIC],[4,7,TUNIC],[5,7,TUNIC],[6,7,TUNIC],[7,7,TUNIC],[8,7,TUNIC],
  [3,8,TUNIC],[4,8,TUNIC],[5,8,TUNIC],[6,8,TUNIC],[7,8,TUNIC],[8,8,TUNIC],
  // legs
  [4,9,PANTS],[5,9,PANTS],[6,9,PANTS],[7,9,PANTS],
  [4,10,PANTS],[5,10,PANTS],[6,10,PANTS],[7,10,PANTS],
  [4,11,SHOE],[5,11,SHOE],[6,11,SHOE],[7,11,SHOE],
  // round shield on left
  [0,6,SHIELD_BAND],[1,5,SHIELD_WOOD],[1,6,SHIELD_WOOD],[1,7,SHIELD_WOOD],[1,8,SHIELD_WOOD],
  [0,7,SHIELD_BOSS],[0,8,SHIELD_BAND],
  // heavy sword on right (down)
  [10,6,SWORD_HILT],
  [10,7,SWORD],[10,8,SWORD],[10,9,SWORD],[10,10,SWORD],[10,11,SWORD],
  [11,7,SWORD],
];

const BJORN_STRIKE: Cell[] = [
  [3,1,HELM],[4,1,HELM],[5,1,HELM],[6,1,HELM],[7,1,HELM],[8,1,HELM],
  [3,2,HELM],[4,2,HELM],[5,2,HELM],[6,2,HELM],[7,2,HELM],[8,2,HELM],
  [2,3,HAIR_B],[9,3,HAIR_B],
  [3,3,SKIN],[4,3,SKIN],[5,3,SKIN],[6,3,SKIN],[7,3,SKIN],[8,3,SKIN],
  [3,4,SKIN],[4,4,HELM],[5,4,SKIN],[6,4,SKIN],[7,4,HELM],[8,4,SKIN],
  [3,5,BEARD],[4,5,BEARD],[5,5,BEARD],[6,5,BEARD],[7,5,BEARD],[8,5,BEARD],
  [4,6,BEARD],[5,6,BEARD],[6,6,BEARD],[7,6,BEARD],
  [2,6,FUR],[9,6,FUR],
  [3,7,TUNIC],[4,7,TUNIC],[5,7,TUNIC],[6,7,TUNIC],[7,7,TUNIC],[8,7,TUNIC],
  [3,8,TUNIC],[4,8,TUNIC],[5,8,TUNIC],[6,8,TUNIC],[7,8,TUNIC],[8,8,TUNIC],
  [4,9,PANTS],[5,9,PANTS],[6,9,PANTS],[7,9,PANTS],
  [4,10,PANTS],[5,10,PANTS],[6,10,PANTS],[7,10,PANTS],
  [4,11,SHOE],[5,11,SHOE],[6,11,SHOE],[7,11,SHOE],
  // shield raised
  [1,4,SHIELD_WOOD],[1,5,SHIELD_WOOD],[0,5,SHIELD_BAND],[0,6,SHIELD_BAND],[1,6,SHIELD_BOSS],
  // sword swung up-right
  [9,5,SWORD_HILT],[10,4,SWORD],[11,3,SWORD],[11,2,SWORD],[10,3,SWORD],
];

// ---------- assembled variants ----------

const VARIANTS: Record<string, Variant> = {
  "kid:default": { idle: kidIdle(SHIRT_RED, SHIRT_RED, BLADE), strike: kidStrike(SHIRT_RED, SHIRT_RED, BLADE) },
  "kid:fallen":  { idle: kidIdle(SHIRT_STRIPE, SHIRT_RED, BLADE_RED), strike: kidStrike(SHIRT_STRIPE, SHIRT_RED, BLADE_RED) },
  "hollow:default": { idle: HOLLOW_IDLE, strike: HOLLOW_STRIKE },
  "bjorn:default":  { idle: BJORN_IDLE, strike: BJORN_STRIKE },
};

export function PixelCharacter({
  skinId,
  size = 64,
  pose = "idle",
  dash = false,
  redEyeSpark = false,
  showBuiltInWeapon = true,
}: {
  skinId: string;
  size?: number;
  pose?: Pose;
  dash?: boolean;
  redEyeSpark?: boolean;
  showBuiltInWeapon?: boolean;
}) {
  const variant = VARIANTS[skinId] ?? VARIANTS["kid:default"];
  const weaponCells = pose === "strike"
    ? new Set(["8,7", "9,6", "10,5", "11,4", "11,3"])
    : new Set(["9,7", "9,8", "9,9", "9,10"]);
  const cells = (pose === "strike" ? variant.strike : variant.idle).filter(
    ([x, y]) => showBuiltInWeapon || !skinId.startsWith("kid:") || !weaponCells.has(`${x},${y}`),
  );
  const p = size / 12;
  const tint =
    pose === "hit"
      ? "oklch(0.65 0.25 25)"
      : pose === "strike"
      ? "oklch(0.97 0.01 280)"
      : null;
  const anim =
    pose === "walk"
      ? "heroWalk 0.55s ease-in-out infinite"
      : pose === "idle"
      ? "heroBob 1.6s ease-in-out infinite"
      : pose === "strike"
      ? "heroStrike 260ms ease-out"
      : "heroShake 240ms ease-out";
  return (
    <div
      className="relative inline-block"
      style={{ width: size, height: size, animation: anim }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges">
        {cells.map(([x, y, c], i) => (
          <rect key={i} x={x * p} y={y * p} width={p} height={p} fill={c} />
        ))}
      </svg>
      {pose === "walk" && (
        <>
          <div
            className="pointer-events-none absolute bottom-[4%] left-[20%] h-[8%] w-[24%]"
            style={{
              background: "color-mix(in oklab, var(--color-foreground) 35%, transparent)",
              animation: "heroFootA 0.44s ease-in-out infinite",
            }}
          />
          <div
            className="pointer-events-none absolute bottom-[4%] right-[20%] h-[8%] w-[24%]"
            style={{
              background: "color-mix(in oklab, var(--color-foreground) 28%, transparent)",
              animation: "heroFootB 0.44s ease-in-out infinite",
            }}
          />
          <div
            className="pointer-events-none absolute bottom-0 left-2 h-1 w-3"
            style={{
              background: "color-mix(in oklab, var(--color-foreground) 35%, transparent)",
              animation: "heroDustA 0.55s ease-out infinite",
            }}
          />
          <div
            className="pointer-events-none absolute bottom-1 right-2 h-1 w-2"
            style={{
              background: "color-mix(in oklab, var(--color-foreground) 25%, transparent)",
              animation: "heroDustB 0.55s ease-out infinite",
            }}
          />
        </>
      )}
      {dash && (
        <>
          <div
            className="pointer-events-none absolute inset-y-[14%] right-[58%] w-[110%]"
            style={{
              background: "linear-gradient(90deg, transparent, color-mix(in oklab, var(--color-accent) 75%, white), transparent)",
              filter: "blur(1px)",
              opacity: 0.75,
              animation: "heroDashTrail 360ms ease-out forwards",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              border: "2px solid var(--color-accent)",
              boxShadow: "0 0 18px var(--color-accent)",
              animation: "heroDashAfterimage 360ms ease-out forwards",
            }}
          />
        </>
      )}
      {redEyeSpark && (
        <div
          className="pointer-events-none absolute"
          style={{
            left: "58%",
            top: "28%",
            width: Math.max(8, size * 0.22),
            height: Math.max(8, size * 0.22),
            background: "var(--color-danger)",
            boxShadow: "0 0 14px var(--color-danger), 0 0 30px var(--color-danger), 0 0 46px var(--color-danger)",
            clipPath: "polygon(50% 0, 64% 35%, 100% 50%, 64% 65%, 50% 100%, 36% 65%, 0 50%, 36% 35%)",
            animation: "heroRedEyeSpark 520ms steps(3) forwards",
          }}
        />
      )}
      {pose === "strike" && showBuiltInWeapon && (
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-2 w-full -translate-x-1/2 -translate-y-1/2"
          style={{
            background: "linear-gradient(90deg, transparent, white, var(--color-accent), transparent)",
            boxShadow: "0 0 12px var(--color-accent)",
            transform: "translate(-50%, -50%) rotate(-28deg)",
            animation: "heroBladeGlint 260ms ease-out forwards",
          }}
        />
      )}
      {tint && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `color-mix(in oklab, ${tint} 35%, transparent)`,
            mixBlendMode: "screen",
            animation: "heroFlash 280ms ease-out forwards",
          }}
        />
      )}
      <style>{`
        @keyframes heroBob { 0%,100% { transform: translateY(0) scaleY(1);} 50% { transform: translateY(-3px) scaleY(1.025);} }
        @keyframes heroWalk { 0%,100% { transform: translateY(0) translateX(-1px) rotate(-2deg) scaleX(1.03) scaleY(0.98);} 25% { transform: translateY(-5px) translateX(1px) rotate(2deg) scaleX(0.98) scaleY(1.04);} 50% { transform: translateY(0) translateX(1px) rotate(2deg) scaleX(1.03) scaleY(0.98);} 75% { transform: translateY(-5px) translateX(-1px) rotate(-2deg) scaleX(0.98) scaleY(1.04);} }
        @keyframes heroStrike { 0%{transform:translateY(0) rotate(0) scale(1);} 35%{transform:translateY(-6px) rotate(-8deg) scale(1.08);} 100%{transform:translateY(0) rotate(0) scale(1);} }
        @keyframes heroShake { 0%,100%{transform:translateX(0);} 25%{transform:translateX(-3px);} 75%{transform:translateX(3px);} }
        @keyframes heroFlash { from{opacity:1;} to{opacity:0;} }
        @keyframes heroFootA { 0%,100%{opacity:0.8; transform:translate(0, 0) scaleX(1.1);} 45%{opacity:0.2; transform:translate(9px, -2px) scaleX(0.6);} 50%{opacity:0;} 55%{opacity:0.2; transform:translate(-8px, -1px) scaleX(0.5);} }
        @keyframes heroFootB { 0%,100%{opacity:0.2; transform:translate(8px, -1px) scaleX(0.5);} 45%{opacity:0.8; transform:translate(0, 0) scaleX(1.1);} 50%{opacity:0.8; transform:translate(0, 0) scaleX(1.1);} 95%{opacity:0.2; transform:translate(-9px, -2px) scaleX(0.6);} }
        @keyframes heroDustA { 0%{opacity:0; transform:translateX(0) scaleX(0.6);} 35%{opacity:0.65;} 100%{opacity:0; transform:translateX(-8px) scaleX(1.8);} }
        @keyframes heroDustB { 0%{opacity:0; transform:translateX(0) scaleX(0.5);} 45%{opacity:0.5;} 100%{opacity:0; transform:translateX(7px) scaleX(1.5);} }
        @keyframes heroBladeGlint { from{opacity:1; transform:translate(-50%, -50%) rotate(-28deg) scaleX(0.45);} to{opacity:0; transform:translate(-50%, -50%) rotate(-28deg) scaleX(1.35);} }
        @keyframes heroDashTrail { from{opacity:0.9; transform:translateX(0) scaleX(1);} to{opacity:0; transform:translateX(-34px) scaleX(0.25);} }
        @keyframes heroDashAfterimage { from{opacity:0.65; transform:translateX(-24px) scale(1.08);} to{opacity:0; transform:translateX(-54px) scale(0.92);} }
        @keyframes heroRedEyeSpark { 0%{opacity:0; transform:scale(0.6) rotate(0deg);} 20%{opacity:1; transform:scale(1.35) rotate(45deg);} 70%{opacity:1; transform:scale(0.95) rotate(90deg);} 100%{opacity:0; transform:scale(0.3) rotate(135deg);} }
      `}</style>
    </div>
  );
}
