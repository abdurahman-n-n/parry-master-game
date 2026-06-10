import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getAiDuelOpponent } from "@/lib/gemini.functions";
import { DEFAULT_CHARACTER } from "./levels";
import { ParryGame, type FightResult } from "./ParryGame";
import type { EnemyDef } from "./types";
import { getCurrentUser } from "./AuthScreen";
import { getBestWaveFor } from "./InfiniteLeaderboard";
import { getEquippedAbility, isOwned } from "./inventory";
import { ABILITIES } from "./abilities";

type DuelInfo = {
  enemy: EnemyDef;
  intro: string;
  taunt: string;
  tactic: string;
  source: "gemini" | "fallback";
};

type Phase = "loading" | "ready" | "fight" | "victory" | "defeat";

export function AiDuel({ onExit }: { onExit: () => void }) {
  const generateOpponent = useServerFn(getAiDuelOpponent);
  const [phase, setPhase] = useState<Phase>("loading");
  const [duel, setDuel] = useState<DuelInfo | null>(null);
  const [error, setError] = useState("");
  const [seed, setSeed] = useState("");
  const [lastResult, setLastResult] = useState<FightResult | null>(null);
  const bestWave = getBestWaveFor(getCurrentUser() ?? "");
  const unlocked = bestWave >= 75;
  const equippedAbility = getEquippedAbility();
  const activeAbility = equippedAbility && isOwned(equippedAbility) ? equippedAbility : null;
  const activeAbilityDef = ABILITIES.find((ability) => ability.id === activeAbility);

  const loadOpponent = useCallback(async (nextSeed = seed) => {
    setPhase("loading");
    setError("");
    try {
      const next = await generateOpponent({ data: { seed: nextSeed.trim() || undefined } });
      setDuel(next);
      setLastResult(null);
      setPhase("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create AI opponent");
      setPhase("ready");
    }
  }, [generateOpponent, seed]);

  useEffect(() => {
    loadOpponent("");
  }, []);

  const finishFight = (result: FightResult) => {
    setLastResult(result);
    setPhase(result.result);
  };

  if (phase === "fight" && duel) {
    return (
      <ParryGame
        key={`ai-${duel.enemy.name}-${duel.enemy.maxHp}`}
        character={DEFAULT_CHARACTER}
        enemy={duel.enemy}
        level={1}
        enemyCountOverride={1}
        hudLabel="Duel"
        abilityOverride={activeAbility}
        onEnd={finishFight}
      />
    );
  }

  const won = phase === "victory";
  const lost = phase === "defeat";

  return (
    <div className="flex h-full w-full items-center justify-center overflow-auto bg-background p-6 font-pixel text-foreground">
      <div className="flex w-full max-w-xl flex-col gap-4 border-2 border-border bg-background p-6">
        <div className="flex items-center justify-between">
          <button
            onClick={onExit}
            className="border-2 border-border bg-background px-3 py-2 text-[10px] uppercase tracking-widest hover:bg-foreground hover:text-background"
          >
            Back
          </button>
          <div className="text-center text-xl uppercase tracking-[0.3em]">Duel</div>
          <div className="w-[72px]" />
        </div>

        {phase === "loading" ? (
          <div className="border-2 border-border p-6 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Forging opponent...
          </div>
        ) : !unlocked ? (
          <div className="flex flex-col gap-4 border-2 border-border p-6 text-center">
            <div className="text-2xl uppercase tracking-[0.3em]">Locked</div>
            <div className="text-[10px] uppercase leading-relaxed tracking-widest text-muted-foreground">
              Clear wave 75 in Infinite Dungeon to enter Duel.
            </div>
            <div className="text-[10px] uppercase tracking-widest text-accent">
              Best wave: {bestWave}
            </div>
          </div>
        ) : (
          <>
            {duel && (
              <div className="flex flex-col gap-3 border-2 border-border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-2xl uppercase tracking-[0.25em]">{duel.enemy.name}</div>
                    <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                      {duel.enemy.title}
                    </div>
                  </div>
                  <div
                    className="h-12 w-12 shrink-0 border-2 border-border"
                    style={{ background: duel.enemy.color }}
                  />
                </div>
                <div className="text-[10px] uppercase leading-relaxed tracking-widest text-muted-foreground">
                  {duel.intro}
                </div>
                <div className="border border-border px-3 py-2 text-[10px] uppercase leading-relaxed tracking-widest text-foreground">
                  "{duel.taunt}"
                </div>
                <div className="grid grid-cols-2 gap-2 text-[9px] uppercase tracking-widest text-muted-foreground">
                  <div>HP {duel.enemy.maxHp}</div>
                  <div>{duel.enemy.attacks.length} attack styles</div>
                  <div>Cadence {duel.enemy.cadenceMs[0]}-{duel.enemy.cadenceMs[1]}ms</div>
                  <div>{duel.enemy.attacks.map((a) => a.kind).join(" / ")}</div>
                </div>
                <div className="text-[9px] uppercase tracking-widest text-accent">
                  Ability: {activeAbilityDef ? `${activeAbilityDef.name} [${activeAbilityDef.hotkey}]` : "none equipped"}
                </div>
                <div className="text-[9px] uppercase leading-relaxed tracking-widest text-muted-foreground">
                  Tactic: {duel.tactic}
                </div>
              </div>
            )}

            {(won || lost) && (
              <div className="border-2 border-border p-4 text-center">
                <div className="text-2xl uppercase tracking-[0.3em]">
                  {won ? "Victory" : "Defeat"}
                </div>
                {lastResult && (
                  <div className="mt-2 text-[9px] uppercase tracking-widest text-muted-foreground">
                    Fight time {Math.round(lastResult.fightMs / 1000)}s
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="border-2 border-danger p-3 text-[10px] uppercase tracking-widest text-danger">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-[9px] uppercase tracking-widest text-muted-foreground">
                Opponent Theme
              </label>
              <div className="flex gap-2">
                <input
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  placeholder="VOID SAMURAI, ICE KNIGHT..."
                  maxLength={80}
                  className="min-w-0 flex-1 border-2 border-border bg-background px-3 py-2 text-[10px] uppercase tracking-widest text-foreground outline-none focus:border-accent"
                />
                <button
                  onClick={() => loadOpponent(seed)}
                  className="border-2 border-border bg-background px-3 py-2 text-[10px] uppercase tracking-widest hover:bg-foreground hover:text-background"
                >
                  Roll
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                disabled={!duel}
                onClick={() => setPhase("fight")}
                className="flex-1 border-2 border-border bg-foreground px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-background hover:bg-accent disabled:opacity-50"
              >
                Start 1v1
              </button>
              <button
                onClick={() => loadOpponent(seed)}
                className="border-2 border-border bg-background px-4 py-3 text-[10px] uppercase tracking-[0.3em] hover:bg-foreground hover:text-background"
              >
                New AI
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
