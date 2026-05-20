import type { PlayerMetrics } from "@/types/oranit";
import { formatGoalsPer90 } from "@/utils/playerMetrics";

interface EfficiencyLeaderboardProps {
  players: PlayerMetrics[];
}

export function EfficiencyLeaderboard({ players }: EfficiencyLeaderboardProps) {
  const max = players[0]?.goalsPer90 ?? 1;

  return (
    <section className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-indigo-950/90 via-purple-950/50 to-blue-950/40 p-5 shadow-glow">
      <header className="mb-4 border-b border-violet-400/20 pb-3">
        <h2 className="bg-gradient-to-l from-violet-200 via-blue-200 to-cyan-200 bg-clip-text font-display text-xl font-bold text-transparent">
          מבקיעים יעילים
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          טופ 10 — שערים ל-90 דקות (Goals / (Minutes ÷ 90))
        </p>
      </header>

      {players.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">
          אין מספיק דקות משחק לחישוב יעילות
        </p>
      ) : (
        <ol className="space-y-2">
          {players.map((player, index) => {
            const width = Math.max(
              10,
              Math.round((player.goalsPer90 / max) * 100),
            );

            return (
              <li
                key={player.playerId}
                className="rounded-xl border border-violet-500/15 bg-oranit-midnight/60 px-3 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-blue-600 text-sm font-bold text-white">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium text-slate-100">
                        {player.name}
                      </span>
                      <span className="font-display text-xl font-bold text-transparent bg-gradient-to-l from-cyan-300 to-violet-300 bg-clip-text">
                        {formatGoalsPer90(player.goalsPer90)}
                        <span className="mr-1 text-xs font-normal text-slate-400">
                          ל-90׳
                        </span>
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-900">
                      <div
                        className="h-full rounded-full bg-gradient-to-l from-blue-500 via-violet-500 to-purple-500"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500">
                      {player.goals} שערים ·{" "}
                      {player.minutesPlayed.toLocaleString("he-IL")} דקות ·{" "}
                      {player.caps} הופעות
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
