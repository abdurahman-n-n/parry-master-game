import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "parry-accent-rgb";
const DEFAULT_RGB: [number, number, number] = [178, 132, 240]; // matches the original violet accent

export function getSavedAccent(): [number, number, number] {
  if (typeof window === "undefined") return DEFAULT_RGB;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_RGB;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length === 3) {
      return parsed.map((n) => Math.max(0, Math.min(255, Number(n) | 0))) as [
        number,
        number,
        number,
      ];
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_RGB;
}

export function applyAccent(rgb: [number, number, number]) {
  const [r, g, b] = rgb;
  const root = document.documentElement.style;
  // Background follows the picked color across lobby + arena (both use bg-background).
  root.setProperty("--background", `rgb(${r}, ${g}, ${b})`);
  // Pick a contrasting foreground so text stays readable.
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const isLight = luminance > 0.55;
  const fg = isLight ? "rgb(20, 20, 24)" : "rgb(240, 240, 245)";
  const muted = isLight ? "rgba(20, 20, 24, 0.6)" : "rgba(240, 240, 245, 0.6)";
  const border = isLight ? "rgba(20, 20, 24, 0.25)" : "rgba(240, 240, 245, 0.25)";
  root.setProperty("--foreground", fg);
  root.setProperty("--muted-foreground", muted);
  root.setProperty("--border", border);
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const hp = (h % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, bl = 0;
  if (hp >= 0 && hp < 1) [r, g, bl] = [c, x, 0];
  else if (hp < 2) [r, g, bl] = [x, c, 0];
  else if (hp < 3) [r, g, bl] = [0, c, x];
  else if (hp < 4) [r, g, bl] = [0, x, c];
  else if (hp < 5) [r, g, bl] = [x, 0, c];
  else [r, g, bl] = [c, 0, x];
  const m = v - c;
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((bl + m) * 255),
  ];
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return [h, s, max];
}

const WHEEL_SIZE = 240;

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const [rgb, setRgb] = useState<[number, number, number]>(() => getSavedAccent());
  const [value, setValue] = useState(() => rgbToHsv(...getSavedAccent())[2]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const draggingRef = useRef(false);

  // Render the HSV wheel whenever V changes
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const r = WHEEL_SIZE / 2;
    const img = ctx.createImageData(WHEEL_SIZE, WHEEL_SIZE);
    for (let y = 0; y < WHEEL_SIZE; y++) {
      for (let x = 0; x < WHEEL_SIZE; x++) {
        const dx = x - r, dy = y - r;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const i = (y * WHEEL_SIZE + x) * 4;
        if (dist > r) {
          img.data[i + 3] = 0;
          continue;
        }
        let h = (Math.atan2(dy, dx) * 180) / Math.PI;
        if (h < 0) h += 360;
        const s = Math.min(1, dist / r);
        const [R, G, B] = hsvToRgb(h, s, value);
        img.data[i] = R;
        img.data[i + 1] = G;
        img.data[i + 2] = B;
        // soft alpha at edge for nicer anti-alias
        img.data[i + 3] = dist > r - 1 ? Math.max(0, 255 * (r - dist)) : 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [value]);

  // Apply preview immediately as user changes color
  useEffect(() => {
    applyAccent(rgb);
  }, [rgb]);

  const pickFromEvent = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * WHEEL_SIZE;
    const y = ((e.clientY - rect.top) / rect.height) * WHEEL_SIZE;
    const r = WHEEL_SIZE / 2;
    const dx = x - r, dy = y - r;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > r) return;
    let h = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (h < 0) h += 360;
    const s = Math.min(1, dist / r);
    setRgb(hsvToRgb(h, s, value));
  };

  const [hue, sat] = rgbToHsv(...rgb);
  const cursorR = sat * (WHEEL_SIZE / 2);
  const cursorX = WHEEL_SIZE / 2 + Math.cos((hue * Math.PI) / 180) * cursorR;
  const cursorY = WHEEL_SIZE / 2 + Math.sin((hue * Math.PI) / 180) * cursorR;

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rgb));
    onBack();
  };
  const reset = () => {
    setRgb(DEFAULT_RGB);
    setValue(rgbToHsv(...DEFAULT_RGB)[2]);
  };

  const setChannel = (idx: 0 | 1 | 2, v: number) => {
    const next = [...rgb] as [number, number, number];
    next[idx] = Math.max(0, Math.min(255, v | 0));
    setRgb(next);
  };

  return (
    <div className="flex h-full w-full items-center justify-center bg-background p-6 font-pixel text-foreground">
      <div className="flex w-full max-w-md flex-col items-center gap-4 border-2 border-border bg-background p-6">
        <div className="flex w-full items-center justify-between">
          <button
            onClick={onBack}
            className="border border-border bg-background px-2 py-1 text-[10px] uppercase tracking-widest hover:bg-foreground hover:text-background"
          >
            ← Back
          </button>
          <div className="text-[10px] uppercase tracking-[0.3em]">Settings</div>
          <div className="w-[60px]" />
        </div>

        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Background Color
        </div>

        <div className="relative" style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}>
          <canvas
            ref={canvasRef}
            width={WHEEL_SIZE}
            height={WHEEL_SIZE}
            className="cursor-crosshair"
            style={{ width: WHEEL_SIZE, height: WHEEL_SIZE, borderRadius: "50%" }}
            onMouseDown={(e) => {
              draggingRef.current = true;
              pickFromEvent(e);
            }}
            onMouseMove={(e) => {
              if (draggingRef.current) pickFromEvent(e);
            }}
            onMouseUp={() => (draggingRef.current = false)}
            onMouseLeave={() => (draggingRef.current = false)}
          />
          <div
            className="pointer-events-none absolute border-2 border-foreground"
            style={{
              left: cursorX - 6,
              top: cursorY - 6,
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`,
              boxShadow: "0 0 0 2px rgba(0,0,0,0.5)",
            }}
          />
        </div>

        {/* Brightness (V) slider */}
        <div className="flex w-full items-center gap-3">
          <span className="w-6 text-[9px] uppercase tracking-widest text-muted-foreground">V</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(value * 100)}
            onChange={(e) => {
              const v = Number(e.target.value) / 100;
              setValue(v);
              // re-derive RGB at new V keeping H/S
              const [h, s] = rgbToHsv(...rgb);
              setRgb(hsvToRgb(h, s, v));
            }}
            className="flex-1 accent-foreground"
          />
        </div>

        {/* RGB inputs */}
        <div className="grid w-full grid-cols-3 gap-2">
          {(["R", "G", "B"] as const).map((label, i) => (
            <label key={label} className="flex flex-col gap-1 text-[9px] uppercase tracking-widest text-muted-foreground">
              {label}
              <input
                type="number"
                min={0}
                max={255}
                value={rgb[i]}
                onChange={(e) => setChannel(i as 0 | 1 | 2, Number(e.target.value))}
                className="border-2 border-border bg-background px-2 py-1 text-[11px] text-foreground"
              />
            </label>
          ))}
        </div>

        {/* Preview swatch */}
        <div className="flex w-full items-center gap-3">
          <div
            className="h-8 flex-1 border-2 border-border"
            style={{ background: `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})` }}
          />
          <span className="text-[10px] uppercase tracking-widest text-foreground">
            #{rgb.map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase()}
          </span>
        </div>

        <div className="flex w-full gap-2">
          <button
            onClick={reset}
            className="flex-1 border-2 border-border bg-background px-3 py-2 text-[10px] uppercase tracking-widest hover:bg-foreground hover:text-background"
          >
            Reset
          </button>
          <button
            onClick={save}
            className="flex-1 border-2 border-border bg-foreground px-3 py-2 text-[10px] uppercase tracking-widest text-background hover:bg-accent"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
