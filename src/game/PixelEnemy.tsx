// Pixel-art enemies: a proper Knight + unique boss designs.
// 16x16 grid. Colors are tinted with each enemy's accent color.

type Cell = [number, number, string];

// ---- shared palette tokens ----
const STEEL_D = "oklch(0.30 0.02 270)"; // dark armor
const STEEL = "oklch(0.55 0.03 270)"; // mid armor
const STEEL_L = "oklch(0.78 0.02 270)"; // bright armor edges
const BLADE = "oklch(0.95 0.01 270)";
const HILT = "oklch(0.45 0.10 60)";
const GOLD = "oklch(0.78 0.16 85)";
const SHADOW = "oklch(0.18 0.02 270)";
const BLOOD = "oklch(0.50 0.20 25)";
const BONE = "oklch(0.92 0.03 90)";
const ROBE = "oklch(0.30 0.10 300)";
const FLESH = "oklch(0.70 0.10 50)";

// Regular KNIGHT — helmet, breastplate, sword + shield (16x16)
const KNIGHT: Cell[] = [
  // helmet crown
  [6,1,STEEL_D],[7,1,STEEL_D],[8,1,STEEL_D],[9,1,STEEL_D],
  [5,2,STEEL_D],[6,2,STEEL],[7,2,STEEL_L],[8,2,STEEL_L],[9,2,STEEL],[10,2,STEEL_D],
  [5,3,STEEL_D],[6,3,STEEL],[7,3,STEEL],[8,3,STEEL],[9,3,STEEL],[10,3,STEEL_D],
  // visor slit
  [5,4,STEEL_D],[6,4,SHADOW],[7,4,SHADOW],[8,4,SHADOW],[9,4,SHADOW],[10,4,STEEL_D],
  [5,5,STEEL_D],[6,5,STEEL],[7,5,STEEL],[8,5,STEEL],[9,5,STEEL],[10,5,STEEL_D],
  // gorget
  [6,6,STEEL_D],[7,6,STEEL],[8,6,STEEL],[9,6,STEEL_D],
  // breastplate
  [4,7,STEEL_D],[5,7,STEEL],[6,7,STEEL_L],[7,7,STEEL],[8,7,STEEL],[9,7,STEEL_L],[10,7,STEEL],[11,7,STEEL_D],
  [4,8,STEEL_D],[5,8,STEEL],[6,8,STEEL],[7,8,GOLD],[8,8,GOLD],[9,8,STEEL],[10,8,STEEL],[11,8,STEEL_D],
  [4,9,STEEL_D],[5,9,STEEL],[6,9,STEEL],[7,9,STEEL],[8,9,STEEL],[9,9,STEEL],[10,9,STEEL],[11,9,STEEL_D],
  // belt
  [5,10,HILT],[6,10,HILT],[7,10,GOLD],[8,10,GOLD],[9,10,HILT],[10,10,HILT],
  // legs
  [5,11,STEEL_D],[6,11,STEEL],[7,11,STEEL],[8,11,STEEL],[9,11,STEEL],[10,11,STEEL_D],
  [5,12,STEEL_D],[6,12,STEEL_D],[9,12,STEEL_D],[10,12,STEEL_D],
  [5,13,SHADOW],[6,13,SHADOW],[9,13,SHADOW],[10,13,SHADOW],
  // sword (right hand)
  [12,5,BLADE],[12,6,BLADE],[12,7,BLADE],[12,8,BLADE],[12,9,BLADE],
  [11,10,GOLD],[12,10,HILT],[13,10,GOLD],
  [12,11,HILT],
  // shield (left)
  [2,6,STEEL_D],[3,6,STEEL_D],
  [1,7,STEEL_D],[2,7,STEEL_L],[3,7,STEEL_L],
  [1,8,STEEL_D],[2,8,GOLD],[3,8,STEEL_L],
  [1,9,STEEL_D],[2,9,STEEL_L],[3,9,STEEL_L],
  [2,10,STEEL_D],[3,10,STEEL_D],
];

// COLOSSUS — wave 5, hulking horned brute with greataxe
const COLOSSUS: Cell[] = [
  // horns
  [3,1,SHADOW],[12,1,SHADOW],
  [3,2,SHADOW],[4,2,SHADOW],[11,2,SHADOW],[12,2,SHADOW],
  // helm
  [5,2,STEEL_D],[6,2,STEEL_D],[7,2,STEEL_D],[8,2,STEEL_D],[9,2,STEEL_D],[10,2,STEEL_D],
  [4,3,STEEL_D],[5,3,STEEL],[6,3,STEEL],[7,3,STEEL_L],[8,3,STEEL_L],[9,3,STEEL],[10,3,STEEL],[11,3,STEEL_D],
  [4,4,STEEL_D],[5,4,SHADOW],[6,4,BLOOD],[7,4,SHADOW],[8,4,SHADOW],[9,4,BLOOD],[10,4,SHADOW],[11,4,STEEL_D],
  [4,5,STEEL_D],[5,5,STEEL],[6,5,STEEL],[7,5,STEEL],[8,5,STEEL],[9,5,STEEL],[10,5,STEEL],[11,5,STEEL_D],
  // massive shoulders
  [2,6,STEEL_D],[3,6,STEEL_D],[4,6,STEEL],[5,6,STEEL],[10,6,STEEL],[11,6,STEEL],[12,6,STEEL_D],[13,6,STEEL_D],
  [2,7,STEEL_D],[3,7,STEEL],[4,7,STEEL],[5,7,STEEL_L],[6,7,STEEL],[7,7,GOLD],[8,7,GOLD],[9,7,STEEL],[10,7,STEEL_L],[11,7,STEEL],[12,7,STEEL],[13,7,STEEL_D],
  // chest
  [3,8,STEEL],[4,8,STEEL],[5,8,STEEL_L],[6,8,STEEL],[7,8,BLOOD],[8,8,BLOOD],[9,8,STEEL],[10,8,STEEL_L],[11,8,STEEL],[12,8,STEEL],
  [3,9,STEEL_D],[4,9,STEEL],[5,9,STEEL],[6,9,STEEL],[7,9,STEEL],[8,9,STEEL],[9,9,STEEL],[10,9,STEEL],[11,9,STEEL],[12,9,STEEL_D],
  // belt + legs
  [4,10,HILT],[5,10,HILT],[6,10,GOLD],[7,10,HILT],[8,10,HILT],[9,10,GOLD],[10,10,HILT],[11,10,HILT],
  [4,11,STEEL_D],[5,11,STEEL],[6,11,STEEL],[9,11,STEEL],[10,11,STEEL],[11,11,STEEL_D],
  [4,12,STEEL_D],[5,12,STEEL_D],[10,12,STEEL_D],[11,12,STEEL_D],
  [4,13,SHADOW],[5,13,SHADOW],[10,13,SHADOW],[11,13,SHADOW],
  // greataxe (right) — long shaft + huge blade
  [14,2,BLADE],[15,3,BLADE],[14,3,BLADE],[13,3,BLADE],
  [15,4,BLADE],[14,4,BLADE],[13,4,BLADE],
  [14,5,BLADE],[13,5,BLADE],
  [13,6,HILT],
  [13,7,HILT],[13,8,HILT],[13,9,HILT],[13,10,HILT],[13,11,HILT],[13,12,HILT],
];

// WARDEN — wave 10, caped knight w/ spear and crown
const WARDEN: Cell[] = [
  // crown
  [6,0,GOLD],[8,0,GOLD],[10,0,GOLD],
  [6,1,GOLD],[7,1,GOLD],[8,1,GOLD],[9,1,GOLD],[10,1,GOLD],
  // helm
  [5,2,STEEL_D],[6,2,STEEL],[7,2,STEEL_L],[8,2,STEEL_L],[9,2,STEEL],[10,2,STEEL_D],
  [5,3,STEEL_D],[6,3,SHADOW],[7,3,BLOOD],[8,3,BLOOD],[9,3,SHADOW],[10,3,STEEL_D],
  [5,4,STEEL_D],[6,4,STEEL],[7,4,STEEL],[8,4,STEEL],[9,4,STEEL],[10,4,STEEL_D],
  // cape behind shoulders
  [2,5,ROBE],[3,5,ROBE],[12,5,ROBE],[13,5,ROBE],
  // shoulders + chest
  [3,6,ROBE],[4,6,STEEL_D],[5,6,STEEL],[6,6,STEEL_L],[7,6,STEEL],[8,6,STEEL],[9,6,STEEL_L],[10,6,STEEL],[11,6,STEEL_D],[12,6,ROBE],
  [3,7,ROBE],[4,7,STEEL],[5,7,STEEL],[6,7,STEEL],[7,7,GOLD],[8,7,GOLD],[9,7,STEEL],[10,7,STEEL],[11,7,STEEL],[12,7,ROBE],
  [3,8,ROBE],[4,8,STEEL_D],[5,8,STEEL],[6,8,STEEL],[7,8,STEEL],[8,8,STEEL],[9,8,STEEL],[10,8,STEEL],[11,8,STEEL_D],[12,8,ROBE],
  // cape skirt
  [3,9,ROBE],[4,9,ROBE],[5,9,STEEL_D],[6,9,STEEL],[7,9,STEEL],[8,9,STEEL],[9,9,STEEL],[10,9,STEEL_D],[11,9,ROBE],[12,9,ROBE],
  [4,10,ROBE],[5,10,HILT],[6,10,GOLD],[7,10,HILT],[8,10,HILT],[9,10,GOLD],[10,10,HILT],[11,10,ROBE],
  [4,11,ROBE],[5,11,STEEL],[6,11,STEEL],[9,11,STEEL],[10,11,STEEL],[11,11,ROBE],
  [5,12,STEEL_D],[6,12,STEEL_D],[9,12,STEEL_D],[10,12,STEEL_D],
  [5,13,SHADOW],[6,13,SHADOW],[9,13,SHADOW],[10,13,SHADOW],
  // long spear
  [13,1,BLADE],[14,2,BLADE],[13,2,BLADE],
  [13,3,HILT],[13,4,HILT],[13,5,HILT],[13,6,HILT],[13,7,HILT],[13,8,HILT],[13,9,HILT],[13,10,HILT],[13,11,HILT],[13,12,HILT],
];

// VOID QUEEN — wave 15, robed sorceress with crown and staff
const VOID_QUEEN: Cell[] = [
  // tiara
  [6,1,GOLD],[8,1,GOLD],[10,1,GOLD],
  [5,2,GOLD],[6,2,GOLD],[7,2,GOLD],[8,2,GOLD],[9,2,GOLD],[10,2,GOLD],[11,2,GOLD],
  // hood/hair
  [4,3,SHADOW],[5,3,SHADOW],[6,3,FLESH],[7,3,FLESH],[8,3,FLESH],[9,3,FLESH],[10,3,SHADOW],[11,3,SHADOW],
  [4,4,SHADOW],[5,4,FLESH],[6,4,SHADOW],[7,4,FLESH],[8,4,FLESH],[9,4,SHADOW],[10,4,FLESH],[11,4,SHADOW],
  [4,5,SHADOW],[5,5,FLESH],[6,5,FLESH],[7,5,FLESH],[8,5,FLESH],[9,5,FLESH],[10,5,FLESH],[11,5,SHADOW],
  // neck
  [7,6,FLESH],[8,6,FLESH],
  // robe shoulders
  [3,6,ROBE],[4,6,ROBE],[5,6,ROBE],[6,6,ROBE],[9,6,ROBE],[10,6,ROBE],[11,6,ROBE],[12,6,ROBE],
  [3,7,ROBE],[4,7,ROBE],[5,7,SHADOW],[6,7,ROBE],[7,7,GOLD],[8,7,GOLD],[9,7,ROBE],[10,7,SHADOW],[11,7,ROBE],[12,7,ROBE],
  [3,8,ROBE],[4,8,ROBE],[5,8,ROBE],[6,8,ROBE],[7,8,ROBE],[8,8,ROBE],[9,8,ROBE],[10,8,ROBE],[11,8,ROBE],[12,8,ROBE],
  [3,9,ROBE],[4,9,SHADOW],[5,9,ROBE],[6,9,ROBE],[7,9,ROBE],[8,9,ROBE],[9,9,ROBE],[10,9,ROBE],[11,9,SHADOW],[12,9,ROBE],
  [3,10,SHADOW],[4,10,ROBE],[5,10,ROBE],[6,10,ROBE],[7,10,ROBE],[8,10,ROBE],[9,10,ROBE],[10,10,ROBE],[11,10,ROBE],[12,10,SHADOW],
  [4,11,SHADOW],[5,11,ROBE],[6,11,ROBE],[7,11,ROBE],[8,11,ROBE],[9,11,ROBE],[10,11,ROBE],[11,11,SHADOW],
  [4,12,SHADOW],[5,12,SHADOW],[10,12,SHADOW],[11,12,SHADOW],
  [4,13,SHADOW],[11,13,SHADOW],
  // staff with orb
  [14,1,GOLD],[13,1,GOLD],[15,1,GOLD],
  [14,2,BLOOD],
  [14,3,HILT],[14,4,HILT],[14,5,HILT],[14,6,HILT],[14,7,HILT],[14,8,HILT],[14,9,HILT],[14,10,HILT],[14,11,HILT],[14,12,HILT],
];

// ABYSS LORD — wave 20+, winged dark lord w/ greatsword
const ABYSS_LORD: Cell[] = [
  // wings
  [0,3,SHADOW],[1,3,SHADOW],[14,3,SHADOW],[15,3,SHADOW],
  [0,4,SHADOW],[1,4,SHADOW],[2,4,SHADOW],[13,4,SHADOW],[14,4,SHADOW],[15,4,SHADOW],
  [1,5,SHADOW],[2,5,SHADOW],[3,5,SHADOW],[12,5,SHADOW],[13,5,SHADOW],[14,5,SHADOW],
  [2,6,SHADOW],[3,6,SHADOW],[12,6,SHADOW],[13,6,SHADOW],
  // crown horns
  [5,0,SHADOW],[7,0,SHADOW],[8,0,SHADOW],[10,0,SHADOW],
  [5,1,SHADOW],[6,1,SHADOW],[7,1,STEEL_D],[8,1,STEEL_D],[9,1,SHADOW],[10,1,SHADOW],
  // helm
  [5,2,STEEL_D],[6,2,STEEL_D],[7,2,STEEL_D],[8,2,STEEL_D],[9,2,STEEL_D],[10,2,STEEL_D],
  [5,3,STEEL_D],[6,3,BLOOD],[7,3,SHADOW],[8,3,SHADOW],[9,3,BLOOD],[10,3,STEEL_D],
  [5,4,STEEL_D],[6,4,STEEL_D],[7,4,STEEL_D],[8,4,STEEL_D],[9,4,STEEL_D],[10,4,STEEL_D],
  // gorget
  [6,5,STEEL_D],[7,5,GOLD],[8,5,GOLD],[9,5,STEEL_D],
  // chest
  [4,6,STEEL_D],[5,6,STEEL_D],[6,6,SHADOW],[7,6,STEEL_D],[8,6,STEEL_D],[9,6,SHADOW],[10,6,STEEL_D],[11,6,STEEL_D],
  [4,7,STEEL_D],[5,7,SHADOW],[6,7,STEEL_D],[7,7,BLOOD],[8,7,BLOOD],[9,7,STEEL_D],[10,7,SHADOW],[11,7,STEEL_D],
  [4,8,STEEL_D],[5,8,STEEL_D],[6,8,STEEL_D],[7,8,STEEL_D],[8,8,STEEL_D],[9,8,STEEL_D],[10,8,STEEL_D],[11,8,STEEL_D],
  // belt
  [5,9,GOLD],[6,9,HILT],[7,9,GOLD],[8,9,GOLD],[9,9,HILT],[10,9,GOLD],
  // legs/robe
  [5,10,SHADOW],[6,10,STEEL_D],[7,10,STEEL_D],[8,10,STEEL_D],[9,10,STEEL_D],[10,10,SHADOW],
  [5,11,SHADOW],[6,11,STEEL_D],[9,11,STEEL_D],[10,11,SHADOW],
  [5,12,SHADOW],[6,12,SHADOW],[9,12,SHADOW],[10,12,SHADOW],
  [5,13,SHADOW],[10,13,SHADOW],
  // greatsword (right side)
  [13,8,BLADE],[13,9,BLADE],[13,10,BLADE],[13,11,BLADE],[13,12,BLADE],
  [12,7,BLADE],[13,7,BLADE],[14,7,BLADE],
  [12,13,GOLD],[13,13,HILT],[14,13,GOLD],
];

const SHADE: Cell[] = KNIGHT.map(([x, y, c]) => [
  x,
  y,
  c === STEEL_L ? "oklch(0.65 0.12 295)" : c === STEEL ? "oklch(0.38 0.12 295)" : c === GOLD ? "oklch(0.72 0.18 300)" : c,
]);

const PHANTOM: Cell[] = KNIGHT
  .filter(([x, y]) => !(y >= 11 && (x === 5 || x === 10)))
  .map(([x, y, c]) => [
    x,
    y,
    c === STEEL_L ? "oklch(0.88 0.12 200)" : c === STEEL ? "oklch(0.55 0.14 210)" : c === STEEL_D ? "oklch(0.22 0.08 230)" : c,
  ]);

const DUELIST: Cell[] = [
  [6,1,SHADOW],[7,1,SHADOW],[8,1,SHADOW],[9,1,SHADOW],
  [5,2,SHADOW],[6,2,FLESH],[7,2,FLESH],[8,2,FLESH],[9,2,FLESH],[10,2,SHADOW],
  [5,3,FLESH],[6,3,SHADOW],[7,3,FLESH],[8,3,FLESH],[9,3,SHADOW],[10,3,FLESH],
  [6,4,FLESH],[7,4,FLESH],[8,4,FLESH],[9,4,FLESH],
  [7,5,ROBE],[8,5,ROBE],
  [4,6,ROBE],[5,6,ROBE],[6,6,STEEL_D],[7,6,STEEL],[8,6,STEEL],[9,6,STEEL_D],[10,6,ROBE],[11,6,ROBE],
  [4,7,ROBE],[5,7,STEEL_D],[6,7,STEEL],[7,7,GOLD],[8,7,GOLD],[9,7,STEEL],[10,7,STEEL_D],[11,7,ROBE],
  [5,8,ROBE],[6,8,STEEL],[7,8,STEEL],[8,8,STEEL],[9,8,STEEL],[10,8,ROBE],
  [5,9,HILT],[6,9,HILT],[7,9,GOLD],[8,9,GOLD],[9,9,HILT],[10,9,HILT],
  [5,10,ROBE],[6,10,ROBE],[7,10,ROBE],[8,10,ROBE],[9,10,ROBE],[10,10,ROBE],
  [5,11,STEEL_D],[6,11,STEEL_D],[9,11,STEEL_D],[10,11,STEEL_D],
  [5,12,SHADOW],[6,12,SHADOW],[9,12,SHADOW],[10,12,SHADOW],
  [12,4,BLADE],[12,5,BLADE],[12,6,BLADE],[12,7,BLADE],[12,8,BLADE],[12,9,BLADE],
  [11,10,GOLD],[12,10,HILT],[13,10,GOLD],
];

const RONIN: Cell[] = [
  [4,1,SHADOW],[5,1,SHADOW],[6,1,SHADOW],[7,1,SHADOW],[8,1,SHADOW],[9,1,SHADOW],[10,1,SHADOW],[11,1,SHADOW],
  [5,2,SHADOW],[6,2,FLESH],[7,2,FLESH],[8,2,FLESH],[9,2,FLESH],[10,2,SHADOW],
  [5,3,FLESH],[6,3,SHADOW],[7,3,FLESH],[8,3,FLESH],[9,3,SHADOW],[10,3,FLESH],
  [6,4,FLESH],[7,4,FLESH],[8,4,FLESH],[9,4,FLESH],
  [3,5,ROBE],[4,5,ROBE],[5,5,ROBE],[10,5,ROBE],[11,5,ROBE],[12,5,ROBE],
  [3,6,ROBE],[4,6,ROBE],[5,6,ROBE],[6,6,HILT],[7,6,HILT],[8,6,HILT],[9,6,ROBE],[10,6,ROBE],[11,6,ROBE],[12,6,ROBE],
  [4,7,ROBE],[5,7,ROBE],[6,7,ROBE],[7,7,GOLD],[8,7,GOLD],[9,7,ROBE],[10,7,ROBE],[11,7,ROBE],
  [4,8,ROBE],[5,8,SHADOW],[6,8,ROBE],[7,8,ROBE],[8,8,ROBE],[9,8,ROBE],[10,8,SHADOW],[11,8,ROBE],
  [5,9,HILT],[6,9,HILT],[7,9,HILT],[8,9,HILT],[9,9,HILT],[10,9,HILT],
  [5,10,ROBE],[6,10,ROBE],[9,10,ROBE],[10,10,ROBE],
  [5,11,STEEL_D],[6,11,STEEL_D],[9,11,STEEL_D],[10,11,STEEL_D],
  [14,2,BLADE],[13,3,BLADE],[12,4,BLADE],[11,5,BLADE],[10,6,BLADE],
  [9,7,HILT],
];

const CHAMPION: Cell[] = [
  [6,0,GOLD],[8,0,GOLD],[10,0,GOLD],
  [5,1,GOLD],[6,1,GOLD],[7,1,GOLD],[8,1,GOLD],[9,1,GOLD],[10,1,GOLD],[11,1,GOLD],
  [5,2,STEEL_D],[6,2,FLESH],[7,2,FLESH],[8,2,FLESH],[9,2,FLESH],[10,2,STEEL_D],
  [5,3,FLESH],[6,3,SHADOW],[7,3,FLESH],[8,3,FLESH],[9,3,SHADOW],[10,3,FLESH],
  [6,4,FLESH],[7,4,FLESH],[8,4,FLESH],[9,4,FLESH],
  [2,5,ROBE],[3,5,ROBE],[12,5,ROBE],[13,5,ROBE],
  [3,6,ROBE],[4,6,STEEL_D],[5,6,STEEL],[6,6,STEEL_L],[7,6,GOLD],[8,6,GOLD],[9,6,STEEL_L],[10,6,STEEL],[11,6,STEEL_D],[12,6,ROBE],
  [3,7,ROBE],[4,7,STEEL],[5,7,STEEL],[6,7,GOLD],[7,7,STEEL],[8,7,STEEL],[9,7,GOLD],[10,7,STEEL],[11,7,STEEL],[12,7,ROBE],
  [4,8,STEEL_D],[5,8,STEEL],[6,8,STEEL],[7,8,STEEL],[8,8,STEEL],[9,8,STEEL],[10,8,STEEL],[11,8,STEEL_D],
  [5,9,HILT],[6,9,HILT],[7,9,GOLD],[8,9,GOLD],[9,9,HILT],[10,9,HILT],
  [5,10,STEEL_D],[6,10,STEEL],[9,10,STEEL],[10,10,STEEL_D],
  [5,11,STEEL_D],[6,11,STEEL_D],[9,11,STEEL_D],[10,11,STEEL_D],
  [12,3,BLADE],[12,4,BLADE],[12,5,BLADE],[12,6,BLADE],[12,7,BLADE],[12,8,BLADE],[12,9,BLADE],[12,10,BLADE],
  [11,11,GOLD],[12,11,HILT],[13,11,GOLD],
];

const SPRITES: Record<string, Cell[]> = {
  knight: KNIGHT,
  shade: SHADE,
  phantom: PHANTOM,
  colossus: COLOSSUS,
  warden: WARDEN,
  "void-queen": VOID_QUEEN,
  "abyss-lord": ABYSS_LORD,
  duelist: DUELIST,
  ronin: RONIN,
  champion: CHAMPION,
};

export function PixelEnemy({
  id,
  isBoss,
  accent,
  size = 96,
  attacking = false,
  progress = 0,
}: {
  id: string;
  isBoss?: boolean;
  accent: string;
  size?: number;
  attacking?: boolean;
  progress?: number;
}) {
  const cells = SPRITES[id] ?? SPRITES.knight;
  const p = size / 16;
  // subtle accent tint overlay
  const wobble = attacking ? Math.sin(progress * 14) * 3 : 0;
  return (
    <div
      className="relative inline-block"
      style={{
        width: size,
        height: size,
        transform: `translateX(${wobble}px)`,
        filter: attacking
          ? `drop-shadow(0 0 ${6 + progress * 16}px ${accent})`
          : `drop-shadow(0 2px 0 ${SHADOW})`,
        animation: isBoss ? "bossFloat 2.4s ease-in-out infinite" : "knightIdle 2s ease-in-out infinite",
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges">
        {cells.map(([x, y, c], i) => (
          <rect key={i} x={x * p} y={y * p} width={p} height={p} fill={c} />
        ))}
        {/* accent wash on armor */}
        <rect
          x={0}
          y={0}
          width={size}
          height={size}
          fill={accent}
          opacity={0.12}
          style={{ mixBlendMode: "overlay" }}
        />
      </svg>
      <style>{`
        @keyframes knightIdle {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        @keyframes bossFloat {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
