// Tiny pixel heart, Undertale-style soul.
export function PixelHeart({ size = 24, color = "oklch(0.65 0.25 25)" }: { size?: number; color?: string }) {
  const p = size / 8;
  const cells: [number, number][] = [
    [1, 1], [2, 1], [5, 1], [6, 1],
    [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2],
    [0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3],
    [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4],
    [2, 5], [3, 5], [4, 5], [5, 5],
    [3, 6], [4, 6],
  ];
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges">
      {cells.map(([x, y], i) => (
        <rect key={i} x={x * p} y={y * p} width={p} height={p} fill={color} />
      ))}
    </svg>
  );
}
