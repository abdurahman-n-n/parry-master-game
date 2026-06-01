// Pixel sprites for PARRY! UI.

const cellsToSvg = (
  cells: [number, number][],
  size: number,
  color: string,
  grid = 8,
) => {
  const p = size / grid;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges">
      {cells.map(([x, y], i) => (
        <rect key={i} x={x * p} y={y * p} width={p} height={p} fill={color} />
      ))}
    </svg>
  );
};

export function PixelHeart({ size = 24, color = "oklch(0.65 0.25 25)" }: { size?: number; color?: string }) {
  const cells: [number, number][] = [
    [1, 1], [2, 1], [5, 1], [6, 1],
    [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2],
    [0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3],
    [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4],
    [2, 5], [3, 5], [4, 5], [5, 5],
    [3, 6], [4, 6],
  ];
  return cellsToSvg(cells, size, color);
}

// 10x10 sword pointing up-right
export function PixelSword({ size = 36, color = "oklch(0.97 0.01 280)" }: { size?: number; color?: string }) {
  const blade: [number, number][] = [
    [7, 1], [8, 1],
    [6, 2], [7, 2],
    [5, 3], [6, 3],
    [4, 4], [5, 4],
    [3, 5], [4, 5],
    [2, 6], [3, 6],
  ];
  const guard: [number, number][] = [
    [1, 6], [4, 6],
    [1, 7], [2, 7], [3, 7], [4, 7],
    [1, 8], [4, 8],
  ];
  const handle: [number, number][] = [
    [2, 8], [3, 8],
    [2, 9], [3, 9],
  ];
  const guardColor = "oklch(0.70 0.18 285)";
  const handleColor = "oklch(0.45 0.14 285)";
  const p = size / 10;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges">
      {blade.map(([x, y], i) => (
        <rect key={`b${i}`} x={x * p} y={y * p} width={p} height={p} fill={color} />
      ))}
      {guard.map(([x, y], i) => (
        <rect key={`g${i}`} x={x * p} y={y * p} width={p} height={p} fill={guardColor} />
      ))}
      {handle.map(([x, y], i) => (
        <rect key={`h${i}`} x={x * p} y={y * p} width={p} height={p} fill={handleColor} />
      ))}
    </svg>
  );
}

// 10x10 kite shield
export function PixelShield({ size = 36, color = "oklch(0.70 0.18 285)" }: { size?: number; color?: string }) {
  const outline: [number, number][] = [
    [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1],
    [1, 2], [8, 2],
    [1, 3], [8, 3],
    [1, 4], [8, 4],
    [1, 5], [8, 5],
    [2, 6], [7, 6],
    [3, 7], [6, 7],
    [4, 8], [5, 8],
  ];
  const fill: [number, number][] = [
    [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2],
    [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3],
    [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4],
    [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5],
    [3, 6], [4, 6], [5, 6], [6, 6],
    [4, 7], [5, 7],
  ];
  const cross: [number, number][] = [
    [4, 3], [5, 3],
    [4, 4], [5, 4],
    [4, 5], [5, 5],
    [3, 4], [6, 4],
  ];
  const fillColor = "oklch(0.97 0.01 280)";
  const crossColor = color;
  const p = size / 10;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges">
      {fill.map(([x, y], i) => (
        <rect key={`f${i}`} x={x * p} y={y * p} width={p} height={p} fill={fillColor} />
      ))}
      {outline.map(([x, y], i) => (
        <rect key={`o${i}`} x={x * p} y={y * p} width={p} height={p} fill={color} />
      ))}
      {cross.map(([x, y], i) => (
        <rect key={`c${i}`} x={x * p} y={y * p} width={p} height={p} fill={crossColor} />
      ))}
    </svg>
  );
}
