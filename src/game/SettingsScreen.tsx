import { useEffect, useState } from "react";

const STORAGE_KEY = "parry-accent-rgb";
const DEFAULT_RGB: [number, number, number] = [178, 132, 240];

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
  root.setProperty("--background", `rgb(${r}, ${g}, ${b})`);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const isLight = luminance > 0.55;
  const fg = isLight ? "rgb(20, 20, 24)" : "rgb(240, 240, 245)";
  const muted = isLight ? "rgba(20, 20, 24, 0.6)" : "rgba(240, 240, 245, 0.6)";
  const border = isLight ? "rgba(20, 20, 24, 0.25)" : "rgba(240, 240, 245, 0.25)";
  root.setProperty("--foreground", fg);
  root.setProperty("--muted-foreground", muted);
  root.setProperty("--border", border);
}

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const [rgb, setRgb] = useState<[number, number, number]>(() => getSavedAccent());

  useEffect(() => {
    applyAccent(rgb);
  }, [rgb]);

  const setChannel = (idx: 0 | 1 | 2, v: number) => {
    const next = [...rgb] as [number, number, number];
    next[idx] = Math.max(0, Math.min(255, v | 0));
    setRgb(next);
  };

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rgb));
    onBack();
  };
  const reset = () => setRgb(DEFAULT_RGB);

  const CHANNELS: { label: string; key: "R" | "G" | "B"; idx: 0 | 1 | 2 }[] = [
    { label: "Red",   key: "R", idx: 0 },
    { label: "Green", key: "G", idx: 1 },
    { label: "Blue",  key: "B", idx: 2 },
  ];

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

        <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
          Type a value (0–255) for each channel
        </div>

        {/* RGB inputs */}
        <div className="flex w-full flex-col gap-3">
          {CHANNELS.map(({ label, key, idx }) => (
            <label
              key={key}
              className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground"
            >
              <span className="w-16 text-foreground">{label}</span>
              <input
                type="number"
                min={0}
                max={255}
                value={rgb[idx]}
                onChange={(e) => setChannel(idx, Number(e.target.value))}
                className="w-24 border-2 border-border bg-background px-2 py-2 text-[14px] text-foreground"
              />
              <input
                type="range"
                min={0}
                max={255}
                value={rgb[idx]}
                onChange={(e) => setChannel(idx, Number(e.target.value))}
                className="flex-1 accent-foreground"
              />
            </label>
          ))}
        </div>

        {/* Preview swatch */}
        <div className="flex w-full items-center gap-3">
          <div
            className="h-10 flex-1 border-2 border-border"
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
