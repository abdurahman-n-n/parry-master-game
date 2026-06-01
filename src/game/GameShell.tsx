import { useState } from "react";
import { DEFAULT_CHARACTER, ENEMIES } from "./content";
import { ParryGame } from "./ParryGame";
import { PixelShield, PixelSword } from "./PixelHeart";
import type { EnemyDef } from "./types";

const SHAPE_CLIP: Record<string, string> = {
  pentagon: "polygon(50% 0,100% 35%,80% 100%,20% 100%,0 35%)",
  diamond: "polygon(50% 0,100% 50%,50% 100%,0 50%)",
  circle: "circle(50% at 50% 50%)",
  triangle: "polygon(50% 0,100% 100%,0 100%)",
  hex: "polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)",
  star:
    "polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)",
};

type Screen = "menu" | "select" | "fight";

export function GameShell() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [enemy, setEnemy] = useState<EnemyDef>(ENEMIES[0]);

  if (screen === "fight") {
    return (
      <ParryGame
        character={DEFAULT_CHARACTER}
        enemy={enemy}
        onExit={() => setScreen("select")}
      />
    );
  }

  if (screen === "select") {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-6 bg-background p-6 font-pixel text-foreground">
        <div className="flex w-full max-w-3xl items-center justify-between">
          <button
            onClick={() => setScreen("menu")}
            className="border border-border bg-background px-2 py-1 text-[10px] uppercase tracking-widest hover:bg-foreground hover:text-background"
          >
            ← Menu
          </button>
          <h2 className="text-xl tracking-[0.3em]">CHOOSE YOUR DUEL</h2>
          <span className="w-16" />
        </div>
        <div className="grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ENEMIES.map((e) => (
            <button
              key={e.id}
              onClick={() => {
                setEnemy(e);
                setScreen("fight");
              }}
              className="group flex flex-col items-center gap-3 border-2 border-border bg-background p-4 text-left transition-colors hover:bg-muted"
              style={{
                boxShadow: `inset 0 0 0 0 ${e.color}`,
              }}
            >
              <div
                className="flex h-16 w-16 items-center justify-center border-2"
                style={{
                  borderColor: e.color,
                  background: `color-mix(in oklab, ${e.color} 15%, transparent)`,
                }}
              >
                <div
                  className="h-9 w-9"
                  style={{
                    background: e.color,
                    clipPath: SHAPE_CLIP[e.shape] ?? SHAPE_CLIP.pentagon,
                  }}
                />
              </div>
              <div className="w-full">
                <div className="text-[11px] uppercase tracking-widest text-foreground">
                  {e.name}
                </div>
                <div className="mt-1 text-[8px] uppercase tracking-widest text-muted-foreground">
                  {e.title}
                </div>
              </div>
            </button>
          ))}
        </div>
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
          One mistake is death.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-8 bg-background p-6 font-pixel text-foreground">
      <div className="flex items-center gap-4">
        <PixelShield size={44} />
        <h1 className="text-4xl tracking-[0.3em] sm:text-6xl">PARRY!</h1>
        <PixelSword size={44} />
      </div>
      <p className="max-w-md text-center text-[10px] uppercase leading-relaxed tracking-widest text-muted-foreground">
        A determined soul. One button. Read the attack, strike back at the perfect moment.
      </p>
      <button
        onClick={() => setScreen("select")}
        className="border-2 border-border bg-foreground px-6 py-3 text-[11px] uppercase tracking-[0.3em] text-background transition-colors hover:bg-accent"
      >
        ▶ Begin
      </button>
      <div className="border-2 border-border bg-background px-4 py-3 text-[9px] uppercase leading-relaxed tracking-widest text-muted-foreground">
        <div>[ Space ] — Parry &amp; Strike</div>
        <div className="mt-1">Time it inside the violet window.</div>
        <div className="mt-1 text-foreground">One mistake = death. For both.</div>
      </div>
      <div className="text-[8px] uppercase tracking-widest text-muted-foreground">
        v0.2 · sudden death build
      </div>
    </div>
  );
}
