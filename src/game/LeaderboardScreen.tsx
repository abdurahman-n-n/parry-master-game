import { getLeaderboard } from "./Leaderboard";
import { GemIcon } from "./Currency";
import { getCurrentUser } from "./AuthScreen";

export function LeaderboardScreen({ onBack }: { onBack: () => void }) {
  const entries = getLeaderboard();
  const me = getCurrentUser();

  return (
    <div className="flex h-full w-full flex-col items-center gap-4 overflow-auto bg-background p-6 font-pixel text-foreground">
      <div className="flex w-full max-w-xl items-center justify-between">
        <button
          onClick={onBack}
          className="border-2 border-border bg-background px-3 py-1 text-[10px] uppercase tracking-widest hover:bg-foreground hover:text-background"
        >
          ← Back
        </button>
        <div className="text-2xl tracking-[0.3em]">LEADERBOARD</div>
        <div className="w-[60px]" />
      </div>

      <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
        Ranked by gems · earlier earners win ties
      </div>

      {entries.length === 0 ? (
        <div className="mt-8 text-[10px] uppercase tracking-widest text-muted-foreground">
          No gems earned yet
        </div>
      ) : (
        <div className="flex w-full max-w-xl flex-col gap-1">
          <div className="grid grid-cols-[40px_1fr_80px_120px] gap-2 border-b-2 border-border px-3 py-2 text-[9px] uppercase tracking-widest text-muted-foreground">
            <div>#</div>
            <div>Player</div>
            <div className="text-right">Gems</div>
            <div className="text-right">First Gem</div>
          </div>
          {entries.map((e, i) => {
            const isMe =
              me && e.nickname.toLowerCase() === me.toLowerCase();
            const date = e.firstGemAt
              ? new Date(e.firstGemAt).toLocaleDateString(undefined, {
                  year: "2-digit",
                  month: "short",
                  day: "numeric",
                })
              : "—";
            return (
              <div
                key={e.nickname}
                className={`grid grid-cols-[40px_1fr_80px_120px] items-center gap-2 border-2 px-3 py-2 text-[10px] uppercase tracking-widest ${
                  isMe
                    ? "border-accent bg-foreground text-background"
                    : "border-border bg-background text-foreground"
                }`}
              >
                <div className="text-lg">{i + 1}</div>
                <div className="truncate">{e.nickname}</div>
                <div className="flex items-center justify-end gap-1">
                  <GemIcon size={12} />
                  <span>{e.gems}</span>
                </div>
                <div className="text-right text-[9px]">{date}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
