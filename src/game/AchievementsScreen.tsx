import { ACHIEVEMENTS, getUnlockedAchievements } from "./achievements";

export function AchievementsScreen({ onBack }: { onBack: () => void }) {
  const unlocked = getUnlockedAchievements();
  return (
    <div className="flex h-full w-full flex-col items-center gap-4 overflow-auto bg-background p-6 font-pixel text-foreground">
      <div className="flex w-full max-w-xl items-center justify-between">
        <button
          onClick={onBack}
          className="border-2 border-border bg-background px-3 py-1 text-[10px] uppercase tracking-widest hover:bg-foreground hover:text-background"
        >
          Back
        </button>
        <div className="text-2xl tracking-[0.3em]">ACHIEVEMENTS</div>
        <div className="w-[60px]" />
      </div>
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
        Secrets unlock during play
      </div>
      <div className="grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
        {ACHIEVEMENTS.map((item) => {
          const isUnlocked = unlocked.has(item.id);
          return (
            <div
              key={item.id}
              className="flex min-h-28 flex-col justify-center gap-2 border-2 border-border bg-background p-4"
            >
              <div className="text-[12px] uppercase tracking-widest">
                {isUnlocked ? item.name : "???"}
              </div>
              <div className="text-[9px] uppercase leading-relaxed tracking-widest text-muted-foreground">
                {isUnlocked ? "Unlocked" : "Hidden"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
