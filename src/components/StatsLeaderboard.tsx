import type { OranitPlayer } from "@/types/oranit";

type LeaderboardMetric = "goals" | "caps";

interface StatsLeaderboardProps {
  title: string;
  subtitle: string;
  metric: LeaderboardMetric;
  players: OranitPlayer[];
}

function metricValue(player: OranitPlayer, metric: LeaderboardMetric): number {
  return metric === "goals" ? player.goals : player.caps;
}

function metricLabel(metric: LeaderboardMetric): string {
  return metric === "goals" ? "שערים" : "הופעות";
}

export function StatsLeaderboard({
  title,
  subtitle,
  metric,
  players,
}: StatsLeaderboardProps) {
  const label = metricLabel(metric);

  return (
    <section className="rounded-2xl border border-violet-500/25 bg-oranit-navy/80 p-5 shadow-glow backdrop-blur-sm">
      <header className="mb-4 border-b border-blue-500/20 pb-3">
        <h2 className="font-display text-xl font-bold text-cyan-100">{title}</h2>
        <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
      </header>

      {players.length === 0 ? (
        <p className="rounded-lg bg-oranit-midnight/60 px-4 py-6 text-center text-sm text-slate-400">
          אין נתונים — הרץ את הסקרייפר:{" "}
          <code className="text-cyan-300">python scripts/ifa_deep_scraper.py</code>
        </p>
      ) : (
        <ol className="space-y-2">
          {players.map((player, index) => {
            const value = metricValue(player, metric);
            const max = metricValue(players[0], metric) || 1;
            const width = Math.max(8, Math.round((value / max) * 100));

            return (
              <li
                key={player.playerId}
                className="group rounded-xl border border-transparent bg-gradient-to-l from-indigo-950/80 to-purple-950/40 px-3 py-2.5 transition hover:border-violet-400/40"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold ${
                      index === 0
                        ? "bg-gradient-to-br from-violet-500 to-blue-600 text-white shadow-glow"
                        : "bg-oranit-midnight text-cyan-200"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-medium text-slate-100">
                        {player.name}
                      </span>
                      <span className="shrink-0 font-display text-lg font-semibold text-cyan-300">
                        {value}
                        <span className="mr-1 text-xs font-normal text-slate-400">
                          {label}
                        </span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-oranit-midnight">
                      <div
                        className="h-full rounded-full bg-gradient-to-l from-blue-500 via-violet-500 to-purple-600 transition-all group-hover:from-cyan-400"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {player.seasons.join(" · ")}
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
