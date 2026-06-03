import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { DEFAULT_CHARACTER, enemyForLevel } from "./levels";
import { ParryGame, type FightResult } from "./ParryGame";
import { getCurrentUser } from "./AuthScreen";
import { addCredits, addGems } from "./Currency";
import { getBestWaveFor, recordInfiniteRun } from "./InfiniteLeaderboard";
import { getCloudLeaderboards, type WaveRow } from "@/lib/cloudSave.functions";

type Phase = "intro" | "fight" | "buff" | "gameover" | "leaderboard";

type Buffs = {
  hpMul: number;
  dmgMul: number;
  speedMul: number;
  cdBonusMs: number;
};

const BASE_ENEMIES = 1;
const COINS_PER_WAVE = 50;
const GEMS_PER_WAVE = 1;
function enemyCountForWave(wave: number) {
  return BASE_ENEMIES + Math.floor((wave - 1) / 5);
}

const INITIAL_BUFFS: Buffs = { hpMul: 1, dmgMul: 1, speedMul: 1, cdBonusMs: 0 };

interface Props {
  onExit: () => void;
}

export function InfiniteDungeon({ onExit }: Props) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [wave, setWave] = useState(1);
  const [buffs, setBuffs] = useState<Buffs>(INITIAL_BUFFS);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [gemsEarned, setGemsEarned] = useState(0);
  const [currentHp, setCurrentHp] = useState<number | null>(null);
  const me = getCurrentUser() ?? "";
  const best = getBestWaveFor(me);

  const startRun = () => {
    setWave(1);
    setBuffs(INITIAL_BUFFS);
    setCoinsEarned(0);
    setGemsEarned(0);
    setCurrentHp(null);
    setPhase("fight");
  };

  const onFightEnd = (res: FightResult) => {
    if (res.result === "defeat") {
      recordInfiniteRun(me, wave - 1);
      setPhase("gameover");
      return;
    }
    // Wave cleared — reward immediately.
    addCredits(COINS_PER_WAVE);
    addGems(GEMS_PER_WAVE);
    setCoinsEarned((c) => c + COINS_PER_WAVE);
    setGemsEarned((g) => g + GEMS_PER_WAVE);
    // Carry HP over to the next wave.
    setCurrentHp(res.playerHpRemaining);
    // Every 20 waves prompt a buff before next wave.
    if (wave % 20 === 0) {
      setPhase("buff");
    } else {
      setWave((w) => w + 1);
      setPhase("fight");
    }
  };


  const pickBuff = (kind: "hp" | "dmg" | "speed") => {
    setBuffs((b) => {
      if (kind === "hp") return { ...b, hpMul: b.hpMul * 1.2 };
      if (kind === "dmg") return { ...b, dmgMul: b.dmgMul * 1.2 };
      return { ...b, speedMul: b.speedMul * 1.05, cdBonusMs: b.cdBonusMs + 100 };
    });
    setWave((w) => w + 1);
    setPhase("fight");
  };

  if (phase === "fight") {
    const enemy = enemyForWave(wave);
    return (
      <ParryGame
        key={`inf-${wave}`}
        character={DEFAULT_CHARACTER}
        enemy={enemy}
        level={wave}
        onEnd={onFightEnd}
        enemyCountOverride={enemyCountForWave(wave)}
        hpMul={buffs.hpMul}
        dmgMul={buffs.dmgMul}
        speedMul={buffs.speedMul}
        cdBonusMs={buffs.cdBonusMs}
        startHpOverride={currentHp ?? undefined}
        hudLabel="Wave"
        hideAbandon
      />
    );
  }

  if (phase === "buff") {
    return (
      <CenterCard>
        <div className="text-2xl tracking-[0.3em] text-foreground">CHOOSE A BUFF</div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Wave {wave} cleared · permanent for this run
        </div>
        <div className="mt-2 flex w-full flex-col gap-2">
          <BuffOption
            title="Bulwark"
            desc="+20% Max HP"
            onClick={() => pickBuff("hp")}
          />
          <BuffOption
            title="Edge"
            desc="+20% Strike Damage"
            onClick={() => pickBuff("dmg")}
          />
          <BuffOption
            title="Swiftness"
            desc="+5% Move Speed · −0.1s Cooldowns"
            onClick={() => pickBuff("speed")}
          />
        </div>
        <BuffStats buffs={buffs} />
      </CenterCard>
    );
  }

  if (phase === "gameover") {
    const cleared = wave - 1;
    const newBest = getBestWaveFor(me);
    const isPB = cleared > 0 && cleared >= newBest;
    return (
      <CenterCard>
        <div className="text-3xl tracking-[0.3em] text-foreground">RUN OVER</div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Fell on wave {wave}
        </div>
        <div className="text-[12px] uppercase tracking-widest text-accent">
          {cleared} wave{cleared === 1 ? "" : "s"} cleared
        </div>
        <div className="text-[10px] uppercase tracking-widest text-foreground">
          Earned: {coinsEarned} ◈ · {gemsEarned} 💎
        </div>
        {isPB && cleared > 0 && (
          <div className="text-[9px] uppercase tracking-widest text-accent">★ New personal best</div>
        )}
        <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
          Best: {newBest}
        </div>
        <div className="mt-2 flex w-full gap-2">
          <button
            onClick={startRun}
            className="flex-1 border-2 border-border bg-foreground px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-background hover:bg-accent"
          >
            ▶ Run Again
          </button>
          <button
            onClick={() => setPhase("leaderboard")}
            className="flex-1 border-2 border-border bg-background px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-foreground hover:bg-foreground hover:text-background"
          >
            🏆 Board
          </button>
        </div>
        <button
          onClick={onExit}
          className="text-[9px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          ← Back to Menu
        </button>
      </CenterCard>
    );
  }

  if (phase === "leaderboard") {
    return <InfiniteLeaderboardView me={me} onBack={() => setPhase("gameover")} />;
  }

  // intro
  return (
    <CenterCard>
      <div className="text-3xl tracking-[0.3em] text-foreground">INFINITE DUNGEON</div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
        Endless waves · pick a buff every 20
      </div>
      <ul className="mt-2 flex w-full flex-col gap-1 border-2 border-border p-3 text-left text-[9px] uppercase tracking-widest text-muted-foreground">
        <li>· Wave 1 starts with {BASE_ENEMIES} enemy</li>
        <li>· +1 enemy every 5 waves</li>
        <li>· Boss every 10 waves</li>
        <li>· Choose a buff every 20 waves</li>
        <li>· Each wave clear: +{COINS_PER_WAVE} ◈ · +{GEMS_PER_WAVE} 💎</li>
        <li>· Next wave starts automatically</li>
        <li>· Press [Esc] to pause / abandon</li>
      </ul>
      <div className="text-[10px] uppercase tracking-widest text-accent">
        Your best: {best} wave{best === 1 ? "" : "s"}
      </div>
      <div className="mt-2 flex w-full gap-2">
        <button
          onClick={startRun}
          className="flex-1 border-2 border-border bg-foreground px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-background hover:bg-accent"
        >
          ▶ Start Run
        </button>
        <button
          onClick={() => setPhase("leaderboard")}
          className="flex-1 border-2 border-border bg-background px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-foreground hover:bg-foreground hover:text-background"
        >
          🏆 Board
        </button>
      </div>
      <button
        onClick={onExit}
        className="text-[9px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
      >
        ← Back to Menu
      </button>
    </CenterCard>
  );
}

function enemyForWave(wave: number) {
  // Reuse level templates: every 10th wave = boss, scaling via tier.
  return enemyForLevel(wave);
}

function BuffOption({ title, desc, onClick }: { title: string; desc: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full border-2 border-border bg-background px-3 py-2 text-left text-[10px] uppercase tracking-widest text-foreground hover:bg-foreground hover:text-background"
    >
      <div className="flex items-center justify-between">
        <span>{title}</span>
        <span className="text-[9px] text-muted-foreground">{desc}</span>
      </div>
    </button>
  );
}

function BuffStats({ buffs }: { buffs: Buffs }) {
  const pct = (m: number) => `${Math.round((m - 1) * 100)}%`;
  return (
    <div className="mt-2 grid w-full grid-cols-3 gap-2 border border-border p-2 text-[8px] uppercase tracking-widest text-muted-foreground">
      <div>HP +{pct(buffs.hpMul)}</div>
      <div>DMG +{pct(buffs.dmgMul)}</div>
      <div>SPD +{pct(buffs.speedMul)} · −{(buffs.cdBonusMs / 1000).toFixed(1)}s</div>
    </div>
  );
}

function InfiniteLeaderboardView({ me, onBack }: { me: string; onBack: () => void }) {
  const fetchLb = useServerFn(getCloudLeaderboards);
  const [entries, setEntries] = useState<WaveRow[]>([]);
  useEffect(() => {
    let alive = true;
    const load = () => {
      fetchLb()
        .then((r) => { if (alive) setEntries(r.waves); })
        .catch(() => {});
    };
    load();
    const id = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(id); };
  }, [fetchLb]);
  return (
    <div className="flex h-full w-full flex-col items-center gap-4 overflow-auto bg-background p-6 font-pixel text-foreground">
      <div className="flex w-full max-w-xl items-center justify-between">
        <button
          onClick={onBack}
          className="border-2 border-border bg-background px-3 py-1 text-[10px] uppercase tracking-widest hover:bg-foreground hover:text-background"
        >
          ← Back
        </button>
        <div className="text-xl tracking-[0.3em]">INFINITE BOARD</div>
        <div className="w-[60px]" />
      </div>
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
        Ranked by deepest wave cleared
      </div>
      {entries.length === 0 ? (
        <div className="mt-8 text-[10px] uppercase tracking-widest text-muted-foreground">
          No runs recorded yet
        </div>
      ) : (
        <div className="flex w-full max-w-xl flex-col gap-1">
          <div className="grid grid-cols-[40px_1fr_100px] gap-2 border-b-2 border-border px-3 py-2 text-[9px] uppercase tracking-widest text-muted-foreground">
            <div>#</div>
            <div>Player</div>
            <div className="text-right">Best Wave</div>
          </div>
          {entries.map((e: WaveRow, i: number) => {
            const isMe = me && e.nickname.toLowerCase() === me.toLowerCase();
            return (
              <div
                key={e.nickname}
                className={`grid grid-cols-[40px_1fr_100px] items-center gap-2 border-2 px-3 py-2 text-[10px] uppercase tracking-widest ${
                  isMe
                    ? "border-accent bg-foreground text-background"
                    : "border-border bg-background text-foreground"
                }`}
              >
                <div className="text-lg">{i + 1}</div>
                <div className="truncate">{e.nickname}</div>
                <div className="text-right">{e.bestWave}</div>
              </div>
            );
          })}
        </div>
      )}
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
