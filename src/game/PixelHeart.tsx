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

// 10x10 sword pointing up-right — steel blade, gold guard, dark handle
export function PixelSword({ size = 36, color }: { size?: number; color?: string }) {
  const bladeMain: [number, number][] = [
    [7, 0], [8, 0],
    [6, 1], [7, 1], [8, 1],
    [5, 2], [6, 2], [7, 2],
    [4, 3], [5, 3], [6, 3],
    [3, 4], [4, 4], [5, 4],
    [2, 5], [3, 5], [4, 5],
  ];
  const bladeEdge: [number, number][] = [
    [8, 0],
    [8, 1],
    [7, 2],
    [6, 3],
    [5, 4],
  ];
  const guard: [number, number][] = [
    [1, 5], [5, 5],
    [0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6],
  ];
  const handle: [number, number][] = [
    [2, 7], [3, 7],
    [2, 8], [3, 8],
    [2, 9], [3, 9],
  ];
  const pommel: [number, number][] = [
    [1, 9], [4, 9],
  ];
  const bladeColor = color ?? "oklch(0.85 0.06 220)";
  const edgeColor = "oklch(0.95 0.02 220)";
  const guardColor = "oklch(0.72 0.14 80)";
  const handleColor = "oklch(0.35 0.10 45)";
  const p = size / 10;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges">
      {bladeMain.map(([x, y], i) => (
        <rect key={`bm${i}`} x={x * p} y={y * p} width={p} height={p} fill={bladeColor} />
      ))}
      {bladeEdge.map(([x, y], i) => (
        <rect key={`be${i}`} x={x * p} y={y * p} width={p} height={p} fill={edgeColor} />
      ))}
      {guard.map(([x, y], i) => (
        <rect key={`g${i}`} x={x * p} y={y * p} width={p} height={p} fill={guardColor} />
      ))}
      {handle.map(([x, y], i) => (
        <rect key={`h${i}`} x={x * p} y={y * p} width={p} height={p} fill={handleColor} />
      ))}
      {pommel.map(([x, y], i) => (
        <rect key={`p${i}`} x={x * p} y={y * p} width={p} height={p} fill={guardColor} />
      ))}
    </svg>
  );
}

// 10x10 heater shield — steel body, gold border, crimson cross
export function PixelShield({ size = 36, color }: { size?: number; color?: string }) {
  const outline: [number, number][] = [
    [3, 0], [4, 0], [5, 0], [6, 0],
    [2, 1], [7, 1],
    [1, 2], [8, 2],
    [0, 3], [9, 3],
    [0, 4], [9, 4],
    [0, 5], [9, 5],
    [1, 6], [8, 6],
    [2, 7], [7, 7],
    [3, 8], [4, 8], [5, 8], [6, 8],
  ];
  const fillDark: [number, number][] = [
    [3, 1], [4, 1], [5, 1], [6, 1],
    [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2],
    [1, 3], [2, 3], [3, 3], [6, 3], [7, 3], [8, 3],
    [1, 4], [2, 4], [3, 4], [6, 4], [7, 4], [8, 4],
    [1, 5], [2, 5], [3, 5], [6, 5], [7, 5], [8, 5],
    [2, 6], [3, 6], [4, 6], [5, 6], [6, 6], [7, 6],
    [3, 7], [4, 7], [5, 7], [6, 7],
  ];
  const fillLight: [number, number][] = [
    [4, 3], [5, 3],
    [4, 4], [5, 4],
    [4, 5], [5, 5],
  ];
  const cross: [number, number][] = [
    [4, 2], [5, 2],
    [3, 3], [4, 3], [5, 3], [6, 3],
    [3, 4], [4, 4], [5, 4], [6, 4],
    [4, 5], [5, 5],
    [4, 6], [5, 6],
  ];
  const borderColor = color ?? "oklch(0.68 0.12 80)";
  const darkColor = "oklch(0.35 0.08 250)";
  const lightColor = "oklch(0.50 0.06 250)";
  const crossColor = "oklch(0.60 0.20 25)";
  const p = size / 10;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges">
      {fillDark.map(([x, y], i) => (
        <rect key={`fd${i}`} x={x * p} y={y * p} width={p} height={p} fill={darkColor} />
      ))}
      {fillLight.map(([x, y], i) => (
        <rect key={`fl${i}`} x={x * p} y={y * p} width={p} height={p} fill={lightColor} />
      ))}
      {cross.map(([x, y], i) => (
        <rect key={`c${i}`} x={x * p} y={y * p} width={p} height={p} fill={crossColor} />
      ))}
      {outline.map(([x, y], i) => (
        <rect key={`o${i}`} x={x * p} y={y * p} width={p} height={p} fill={borderColor} />
      ))}
    </svg>
  );
}
