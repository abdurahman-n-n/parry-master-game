import { useState } from "react";
import { DEFAULT_CHARACTER, DEFAULT_ENEMY } from "./content";
import { ParryGame } from "./ParryGame";
import { PixelHeart } from "./PixelHeart";

export function GameShell() {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <ParryGame
        character={DEFAULT_CHARACTER}
        enemy={DEFAULT_ENEMY}
        onExit={() => setPlaying(false)}
      />
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-8 bg-background p-6 font-pixel text-foreground">
      <div className="flex items-center gap-4">
        <PixelHeart size={36} />
        <h1 className="text-4xl tracking-[0.3em] sm:text-6xl">PARRY!</h1>
        <PixelHeart size={36} />
      </div>
      <p className="max-w-md text-center text-[10px] uppercase leading-relaxed tracking-widest text-muted-foreground">
        A determined soul. One button. Read the attack, strike back at the perfect moment.
      </p>
      <button
        onClick={() => setPlaying(true)}
        className="border-2 border-border bg-foreground px-6 py-3 text-[11px] uppercase tracking-[0.3em] text-background transition-colors hover:bg-accent"
      >
        ▶ Begin
      </button>
      <div className="border-2 border-border bg-background px-4 py-3 text-[9px] uppercase leading-relaxed tracking-widest text-muted-foreground">
        <div>[ Space ] — Parry &amp; Strike</div>
        <div className="mt-1">Time it inside the yellow window.</div>
        <div className="mt-1">Perfect timing = bonus damage.</div>
      </div>
      <div className="text-[8px] uppercase tracking-widest text-muted-foreground">
        v0.1 · foundation build
      </div>
    </div>
  );
}
