import { useEffect, useState } from "react";
import { DEFAULT_CHARACTER, enemyForWave } from "./content";
import { ParryGame, type FightResult } from "./ParryGame";
import { PixelShield, PixelSword } from "./PixelHeart";
import { SettingsScreen, getSavedAccent, applyAccent } from "./SettingsScreen";
import { CurrencyHUD, addCredits, addGems, getCredits, getGems } from "./Currency";
import type { EnemyDef } from "./types";

type Screen = "menu" | "fight" | "gameover" | "settings";

export function GameShell() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [wave, setWave] = useState(1);
  const [enemy, setEnemy] = useState<EnemyDef>(() => enemyForWave(1));
  const [bestWave, setBestWave] = useState(1);
  const [credits, setCredits] = useState(0);
  const [gems, setGems] = useState(0);
  const [lastReward, setLastReward] = useState<{ credits: number; gems: number } | null>(null);

  // Load + apply saved accent + currencies on mount
  useEffect(() => {
    applyAccent(getSavedAccent());
    setCredits(getCredits());
    setGems(getGems());
  }, []);

  const startRun = () => {
    const first = enemyForWave(1);
    setWave(1);
    setEnemy(first);
    setLastReward(null);
    setScreen("fight");
  };

  const onFightEnd = (res: FightResult) => {
    if (res.result === "victory") {
      // Persist rewards
      if (res.credits > 0) setCredits(addCredits(res.credits));
      if (res.gems > 0) setGems(addGems(res.gems));
      setLastReward({ credits: res.credits, gems: res.gems });
      // Auto-continue: jump straight to the next wave.
      const next = wave + 1;
      setWave(next);
      setEnemy(enemyForWave(next));
      setScreen("fight");
    } else {
      setBestWave((b) => Math.max(b, wave));
      setScreen("gameover");
    }
  };

  if (screen === "fight") {
    return (
      <ParryGame
        key={`${wave}-${enemy.id}`}
        character={DEFAULT_CHARACTER}
        enemy={enemy}
        wave={wave}
        onEnd={onFightEnd}
      />
    );
  }

  if (screen === "settings") {
    return <SettingsScreen onBack={() => setScreen("menu")} />;
  }

  if (screen === "gameover") {
    return (
      <CenterCard>
        <div className="text-3xl tracking-[0.3em] text-foreground">GAME OVER</div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Fell on wave {wave} · {enemy.name}
        </div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Best wave reached: {bestWave}
        </div>
        <CurrencyHUD credits={credits} gems={gems} />
        <button
          onClick={startRun}
          className="mt-2 border-2 border-border bg-foreground px-5 py-2 text-[10px] uppercase tracking-[0.3em] text-background hover:bg-accent"
        >
          ▶ Try again
        </button>
        <button
          onClick={() => setScreen("menu")}
          className="text-[9px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          ← Menu
        </button>
      </CenterCard>
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-8 bg-background p-6 font-pixel text-foreground">
      <div className="flex items-center gap-4">
        <PixelShield size={44} />
        <h1 className="text-4xl tracking-[0.3em] sm:text-6xl">PARRY!</h1>
        <PixelSword size={44} />
      </div>
      <CurrencyHUD credits={credits} gems={gems} />
      <p className="max-w-md text-center text-[10px] uppercase leading-relaxed tracking-widest text-muted-foreground">
        Survive the waves. Regulars fall in one strike. Every 5th wave: a boss.
      </p>
      <div className="flex gap-3">
        <button
          onClick={startRun}
          className="border-2 border-border bg-foreground px-6 py-3 text-[11px] uppercase tracking-[0.3em] text-background transition-colors hover:bg-accent"
        >
          ▶ Begin Run
        </button>
        <button
          onClick={() => setScreen("settings")}
          className="border-2 border-border bg-background px-6 py-3 text-[11px] uppercase tracking-[0.3em] text-foreground transition-colors hover:bg-foreground hover:text-background"
        >
          ⚙ Settings
        </button>
      </div>
      <div className="border-2 border-border bg-background px-4 py-3 text-[9px] uppercase leading-relaxed tracking-widest text-muted-foreground">
        <div>[ Space ] — Parry &amp; Strike</div>
        <div className="mt-1">One mistake = death.</div>
        <div className="mt-1 text-foreground">Bosses take 5–10 parries to fall.</div>
        <div className="mt-1">Victory auto-continues — abandon via [ Esc ].</div>
        {bestWave > 1 && (
          <div className="mt-1 text-accent">Best wave: {bestWave}</div>
        )}
        {lastReward && (
          <div className="mt-1 text-accent">
            Last run reward: +{lastReward.credits} credits
            {lastReward.gems > 0 ? ` · +${lastReward.gems} gem` : ""}
          </div>
        )}
      </div>
      <div className="text-[8px] uppercase tracking-widest text-muted-foreground">
        v0.4 · credits &amp; gems
      </div>
    </div>
  );
}

function CenterCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background p-6 font-pixel text-foreground">
      <div className="flex w-full max-w-sm flex-col items-center gap-3 border-2 border-border bg-background p-6 text-center">
        {children}
      </div>
    </div>
  );
}
