import { useEffect, useState } from "react";
import { DEFAULT_CHARACTER, enemyForWave } from "./content";
import { ParryGame, type FightResult } from "./ParryGame";
import { PixelShield, PixelSword } from "./PixelHeart";
import { SettingsScreen, getSavedAccent, applyAccent } from "./SettingsScreen";
import { ShopScreen } from "./ShopScreen";
import {
  CurrencyHUD, addCredits, addGems, addCrowns,
  getCredits, getGems, getCrowns,
} from "./Currency";
import { findCharacter, getEquipped } from "./characters";
import { DIFFICULTIES, getDifficulty, setDifficulty, type Difficulty } from "./difficulty";
import type { EnemyDef } from "./types";

type Screen = "menu" | "fight" | "gameover" | "settings" | "shop";

const CROWN_WAVE = 20;

export function GameShell() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [wave, setWave] = useState(1);
  const [enemy, setEnemy] = useState<EnemyDef>(() => enemyForWave(1));
  const [bestWave, setBestWave] = useState(1);
  const [credits, setCredits] = useState(0);
  const [gems, setGems] = useState(0);
  const [crowns, setCrowns] = useState(0);
  const [lastReward, setLastReward] = useState<{ credits: number; gems: number } | null>(null);
  const [difficulty, setDiffState] = useState<Difficulty>(() => getDifficulty());

  useEffect(() => {
    applyAccent(getSavedAccent());
    setCredits(getCredits());
    setGems(getGems());
    setCrowns(getCrowns());
  }, [screen]);

  const startRun = () => {
    const first = enemyForWave(1);
    setWave(1);
    setEnemy(first);
    setLastReward(null);
    setScreen("fight");
  };

  const onFightEnd = (res: FightResult) => {
    if (res.result === "victory") {
      if (res.credits > 0) setCredits(addCredits(res.credits));
      if (res.gems > 0) setGems(addGems(res.gems));
      setLastReward({ credits: res.credits, gems: res.gems });
      // Crown for completing wave 20
      if (wave >= CROWN_WAVE && wave % CROWN_WAVE === 0) {
        setCrowns(addCrowns(1));
      }
      const next = wave + 1;
      setWave(next);
      setEnemy(enemyForWave(next));
      setScreen("fight");
    } else {
      setBestWave((b) => Math.max(b, wave));
      setScreen("gameover");
    }
  };

  // Use the equipped character's name as the player label
  const equipped = getEquipped();
  const equippedName = findCharacter(equipped.characterId)?.name ?? DEFAULT_CHARACTER.name;
  const playerCharacter = { ...DEFAULT_CHARACTER, name: equippedName };

  if (screen === "fight") {
    return (
      <ParryGame
        key={`${wave}-${enemy.id}-${equipped.skinId}`}
        character={playerCharacter}
        enemy={enemy}
        wave={wave}
        onEnd={onFightEnd}
      />
    );
  }

  if (screen === "settings") return <SettingsScreen onBack={() => setScreen("menu")} />;
  if (screen === "shop")     return <ShopScreen onBack={() => setScreen("menu")} />;

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
        <CurrencyHUD credits={credits} gems={gems} crowns={crowns} />
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
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 bg-background p-6 font-pixel text-foreground">
      <div className="flex items-center gap-4">
        <PixelShield size={44} />
        <h1 className="text-4xl tracking-[0.3em] sm:text-6xl">PARRY!</h1>
        <PixelSword size={44} />
      </div>
      <CurrencyHUD credits={credits} gems={gems} crowns={crowns} />
      <p className="max-w-md text-center text-[10px] uppercase leading-relaxed tracking-widest text-muted-foreground">
        Move with WASD. Stand outside the red zone to dodge. Inside? Click to block, then strike back within 1.5s.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={startRun}
          className="border-2 border-border bg-foreground px-6 py-3 text-[11px] uppercase tracking-[0.3em] text-background transition-colors hover:bg-accent"
        >
          ▶ Begin Run
        </button>
        <button
          onClick={() => setScreen("shop")}
          className="border-2 border-border bg-background px-6 py-3 text-[11px] uppercase tracking-[0.3em] text-foreground transition-colors hover:bg-foreground hover:text-background"
        >
          🛒 Shop
        </button>
        <button
          onClick={() => setScreen("settings")}
          className="border-2 border-border bg-background px-6 py-3 text-[11px] uppercase tracking-[0.3em] text-foreground transition-colors hover:bg-foreground hover:text-background"
        >
          ⚙ Settings
        </button>
      </div>
      <div className="border-2 border-border bg-background px-4 py-3 text-[9px] uppercase leading-relaxed tracking-widest text-muted-foreground">
        <div>[ WASD ] Move &amp; dodge</div>
        <div>[ Space / Click ] Block → Riposte (1.5s)</div>
        <div className="mt-1 text-foreground">Clear wave 20 to earn a 👑 crown.</div>
        {bestWave > 1 && <div className="mt-1 text-accent">Best wave: {bestWave}</div>}
        {lastReward && (
          <div className="mt-1 text-accent">
            Last run reward: +{lastReward.credits} credits
            {lastReward.gems > 0 ? ` · +${lastReward.gems} gem` : ""}
          </div>
        )}
      </div>
      <div className="text-[8px] uppercase tracking-widest text-muted-foreground">
        v0.5 · roster &amp; arena
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
