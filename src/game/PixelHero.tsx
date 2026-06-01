// Tiny pixel "kid with a sword" sprite for PARRY!
// Big head, small body, idle bob + strike + hit poses.

type Pose = "idle" | "strike" | "hit";

const SKIN = "oklch(0.82 0.09 55)";
const HAIR = "oklch(0.35 0.06 60)";
const SHIRT = "oklch(0.55 0.20 25)";        // red shirt
const PANTS = "oklch(0.45 0.08 260)";       // blue pants
const SHOE  = "oklch(0.25 0.04 60)";
const BLADE = "oklch(0.97 0.01 280)";
const HILT  = "oklch(0.45 0.14 285)";

type Cell = [number, number, string];

// 12x12 grid. Kid is centered around x=4..7.
const IDLE: Cell[] = [
  // hair
  [4, 1, HAIR], [5, 1, HAIR], [6, 1, HAIR], [7, 1, HAIR],
  [3, 2, HAIR], [4, 2, HAIR], [5, 2, HAIR], [6, 2, HAIR], [7, 2, HAIR], [8, 2, HAIR],
  // face
  [3, 3, SKIN], [4, 3, SKIN], [5, 3, SKIN], [6, 3, SKIN], [7, 3, SKIN], [8, 3, SKIN],
  [3, 4, SKIN], [4, 4, HAIR], [5, 4, SKIN], [6, 4, SKIN], [7, 4, HAIR], [8, 4, SKIN],
  [3, 5, SKIN], [4, 5, SKIN], [5, 5, SKIN], [6, 5, SKIN], [7, 5, SKIN], [8, 5, SKIN],
  // neck
  [5, 6, SKIN], [6, 6, SKIN],
  // shirt + arms
  [3, 7, SHIRT], [4, 7, SHIRT], [5, 7, SHIRT], [6, 7, SHIRT], [7, 7, SHIRT], [8, 7, SHIRT],
  [3, 8, SKIN],  [4, 8, SHIRT], [5, 8, SHIRT], [6, 8, SHIRT], [7, 8, SHIRT], [8, 8, SKIN],
  // pants
  [4, 9, PANTS], [5, 9, PANTS], [6, 9, PANTS], [7, 9, PANTS],
  [4, 10, PANTS], [5, 10, PANTS], [6, 10, PANTS], [7, 10, PANTS],
  // shoes
  [4, 11, SHOE], [5, 11, SHOE], [6, 11, SHOE], [7, 11, SHOE],
  // sword resting at right side (down)
  [9, 7, HILT],
  [9, 8, BLADE],
  [9, 9, BLADE],
  [9, 10, BLADE],
];

// Strike: sword raised up-right, body slightly leaning
const STRIKE: Cell[] = [
  // hair
  [4, 1, HAIR], [5, 1, HAIR], [6, 1, HAIR], [7, 1, HAIR],
  [3, 2, HAIR], [4, 2, HAIR], [5, 2, HAIR], [6, 2, HAIR], [7, 2, HAIR], [8, 2, HAIR],
  // face (mouth open, focused)
  [3, 3, SKIN], [4, 3, SKIN], [5, 3, SKIN], [6, 3, SKIN], [7, 3, SKIN], [8, 3, SKIN],
  [3, 4, SKIN], [4, 4, HAIR], [5, 4, SKIN], [6, 4, SKIN], [7, 4, HAIR], [8, 4, SKIN],
  [3, 5, SKIN], [4, 5, SKIN], [5, 5, HAIR], [6, 5, HAIR], [7, 5, SKIN], [8, 5, SKIN],
  // neck
  [5, 6, SKIN], [6, 6, SKIN],
  // shirt
  [3, 7, SHIRT], [4, 7, SHIRT], [5, 7, SHIRT], [6, 7, SHIRT], [7, 7, SHIRT],
  [4, 8, SHIRT], [5, 8, SHIRT], [6, 8, SHIRT], [7, 8, SHIRT], [8, 8, SKIN],
  // pants (one leg forward)
  [4, 9, PANTS], [5, 9, PANTS], [6, 9, PANTS], [7, 9, PANTS],
  [3, 10, PANTS], [4, 10, PANTS], [6, 10, PANTS], [7, 10, PANTS],
  // shoes
  [3, 11, SHOE], [4, 11, SHOE], [6, 11, SHOE], [7, 11, SHOE],
  // sword raised diagonally up-right
  [8, 7, HILT],
  [9, 6, BLADE],
  [10, 5, BLADE],
  [11, 4, BLADE],
  [11, 3, BLADE],
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
            ? "heroStrike 260ms ease-out"
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
          40% { transform: translateY(-5px) rotate(-6deg); }
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
