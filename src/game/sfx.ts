type SoundKind =
  | "button"
  | "strike"
  | "hit"
  | "parry"
  | "kill"
  | "dash"
  | "unlock"
  | "blackflash";

let ctx: AudioContext | null = null;

function audio() {
  if (typeof window === "undefined") return null;
  ctx ??= new AudioContext();
  return ctx;
}

function tone(freq: number, start: number, length: number, gain = 0.05, type: OscillatorType = "square") {
  const c = audio();
  if (!c) return;
  const osc = c.createOscillator();
  const vol = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime + start);
  vol.gain.setValueAtTime(0.0001, c.currentTime + start);
  vol.gain.exponentialRampToValueAtTime(gain, c.currentTime + start + 0.01);
  vol.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + length);
  osc.connect(vol);
  vol.connect(c.destination);
  osc.start(c.currentTime + start);
  osc.stop(c.currentTime + start + length + 0.02);
}

export function playSfx(kind: SoundKind) {
  const c = audio();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  if (kind === "button") {
    tone(520, 0, 0.045, 0.035);
    tone(760, 0.025, 0.045, 0.025);
  } else if (kind === "strike") {
    tone(360, 0, 0.055, 0.045, "sawtooth");
    tone(180, 0.035, 0.065, 0.04, "square");
  } else if (kind === "hit") {
    tone(110, 0, 0.12, 0.075, "sawtooth");
  } else if (kind === "parry") {
    tone(940, 0, 0.08, 0.06, "triangle");
    tone(1320, 0.035, 0.09, 0.04, "triangle");
  } else if (kind === "kill") {
    tone(180, 0, 0.09, 0.07, "sawtooth");
    tone(90, 0.06, 0.18, 0.07, "square");
  } else if (kind === "dash") {
    tone(700, 0, 0.08, 0.04, "triangle");
    tone(420, 0.045, 0.08, 0.035, "triangle");
  } else if (kind === "unlock") {
    tone(523, 0, 0.09, 0.04, "triangle");
    tone(659, 0.09, 0.09, 0.04, "triangle");
    tone(784, 0.18, 0.16, 0.055, "triangle");
  } else if (kind === "blackflash") {
    [196, 247, 294, 392, 494, 587, 784].forEach((f, i) => {
      tone(f, i * 0.075, 0.18, 0.055, "triangle");
    });
    tone(55, 0.05, 0.65, 0.09, "sawtooth");
  }
}

export function installButtonSfx() {
  if (typeof window === "undefined") return () => {};
  const handler = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest("button")) playSfx("button");
  };
  window.addEventListener("click", handler, true);
  return () => window.removeEventListener("click", handler, true);
}
