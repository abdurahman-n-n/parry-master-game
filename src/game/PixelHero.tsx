// Tiny 12x12 pixel hero sprite for PARRY!
// Two poses (idle, strike) + brief flash tinting.

type Pose = "idle" | "strike" | "hit";

const SKIN = "oklch(0.85 0.08 60)";
const ARMOR = "oklch(0.78 0.05 285)";
const ARMOR_DARK = "oklch(0.55 0.10 285)";
const BLADE = "oklch(0.97 0.01 280)";
const HILT = "oklch(0.45 0.14 285)";
const CAPE = "oklch(0.55 0.20 25)";

type Cell = [number, number, string];

// 12x12 grid. (x, y, color)
const IDLE: Cell[] = [
  // helmet
  [5, 1, ARMOR_DARK], [6, 1, ARMOR_DARK],
  [4, 2, ARMOR], [5, 2, ARMOR], [6, 2, ARMOR], [7, 2, ARMOR],
  [4, 3, ARMOR], [5, 3, SKIN], [6, 3, SKIN], [7, 3, ARMOR],
  // shoulders / chest
  [3, 4, ARMOR_DARK], [4, 4, ARMOR], [5, 4, ARMOR], [6, 4, ARMOR], [7, 4, ARMOR], [8, 4, ARMOR_DARK],
  [4, 5, ARMOR], [5, 5, ARMOR], [6, 5, ARMOR], [7, 5, ARMOR],
  [4, 6, ARMOR_DARK], [5, 6, ARMOR], [6, 6, ARMOR], [7, 6, ARMOR_DARK],
  // belt
  [4, 7, HILT], [5, 7, HILT], [6, 7, HILT], [7, 7, HILT],
  // legs
  [4, 8, ARMOR], [5, 8, ARMOR], [6, 8, ARMOR], [7, 8, ARMOR],
  [4, 9, ARMOR_DARK], [5, 9, ARMOR_DARK], [6, 9, ARMOR_DARK], [7, 9, ARMOR_DARK],
  [3, 10, ARMOR_DARK], [4, 10, ARMOR_DARK], [7, 10, ARMOR_DARK], [8, 10, ARMOR_DARK],
  // shield (left)
  [2, 5, CAPE], [2, 6, CAPE], [2, 7, CAPE],
  // resting sword (right side, pointing down)
  [9, 5, HILT], [9, 6, BLADE], [9, 7, BLADE], [9, 8, BLADE], [9, 9, BLADE],
];

// Strike pose: sword raised up-right, shield forward
const STRIKE: Cell[] = [
  // helmet (slight tilt)
  [5, 1, ARMOR_DARK], [6, 1, ARMOR_DARK],
  [4, 2, ARMOR], [5, 2, ARMOR], [6, 2, ARMOR], [7, 2, ARMOR],
  [4, 3, ARMOR], [5, 3, SKIN], [6, 3, SKIN], [7, 3, ARMOR],
  // body
  [3, 4, ARMOR_DARK], [4, 4, ARMOR], [5, 4, ARMOR], [6, 4, ARMOR], [7, 4, ARMOR], [8, 4, ARMOR_DARK],
  [4, 5, ARMOR], [5, 5, ARMOR], [6, 5, ARMOR], [7, 5, ARMOR],
  [4, 6, ARMOR_DARK], [5, 6, ARMOR], [6, 6, ARMOR], [7, 6, ARMOR_DARK],
  [4, 7, HILT], [5, 7, HILT], [6, 7, HILT], [7, 7, HILT],
  [4, 8, ARMOR], [5, 8, ARMOR], [6, 8, ARMOR], [7, 8, ARMOR],
  [4, 9, ARMOR_DARK], [5, 9, ARMOR_DARK], [6, 9, ARMOR_DARK], [7, 9, ARMOR_DARK],
  [3, 10, ARMOR_DARK], [4, 10, ARMOR_DARK], [7, 10, ARMOR_DARK], [8, 10, ARMOR_DARK],
  // shield thrust forward (in front of body)
  [3, 5, CAPE], [3, 6, CAPE], [3, 7, CAPE],
  // sword raised diagonally up-right
  [8, 5, HILT],
  [9, 4, BLADE],
  [10, 3, BLADE],
  [11, 2, BLADE],
  [11, 1, BLADE],
];

const POSES: Record<Pose, Cell[]> = {
  idle: IDLE,
  strike: STRIKE,
  hit: IDLE,
};

export function PixelHero({
  size = 56,
  pose = "idle",
}: {
  size?: number;
  pose?: Pose;
}) {
  const cells = POSES[pose];
  const p = size / 12;
  const tint =
    pose === "hit"
      ? "oklch(0.65 0.25 25)"
      : pose === "strike"
      ? "oklch(0.97 0.01 280)"
      : null;
  return (
    <div
      className="relative inline-block"
      style={{
        width: size,
        height: size,
        animation:
          pose === "idle"
            ? "heroBob 1.6s ease-in-out infinite"
            : pose === "strike"
            ? "heroStrike 220ms ease-out"
            : "heroShake 240ms ease-out",
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges">
        {cells.map(([x, y, c], i) => (
          <rect key={i} x={x * p} y={y * p} width={p} height={p} fill={c} />
        ))}
      </svg>
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
        @keyframes heroBob {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        @keyframes heroStrike {
          0% { transform: translateY(0) rotate(0deg); }
          40% { transform: translateY(-4px) rotate(-4deg); }
          100% { transform: translateY(0) rotate(0deg); }
        }
        @keyframes heroShake {
          0%,100% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          75% { transform: translateX(3px); }
        }
        @keyframes heroFlash {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
