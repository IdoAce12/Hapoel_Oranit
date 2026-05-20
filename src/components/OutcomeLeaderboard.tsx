import type { OranitPlayer } from "@/types/oranit";
import {
  formatPercent,
  playerLosses,
  playerLossRatio,
  playerWins,
} from "@/utils/outcomeMetrics";

export type OutcomeLeaderboardVariant = "winners" | "losers" | "lossRatio";

interface OutcomeLeaderboardProps {
  variant: OutcomeLeaderboardVariant;
  players: OranitPlayer[];
}

const VARIANT_CONFIG: Record<
  OutcomeLeaderboardVariant,
  {
    title: string;
    subtitle: string;
    badge: string;
    badgeClass: string;
    valueLabel: string;
    barClass: string;
    valueClass: string;
  }
> = {
  winners: {
    title: "מלכי הניצחונות",
    subtitle: "טופ 10 — הכי הרבה ניצחונות בליגה",
    badge: "Winnable",
    badgeClass:
      "border-emerald-400/40 bg-emerald-500/15 text-emerald-200 shadow-[0_0_20px_rgba(52,211,153,0.25)]",
    valueLabel: "ניצחונות",
    barClass: "from-emerald-500 via-green-500 to-teal-500",
    valueClass: "text-emerald-300",
  },
  losers: {
    title: "מלכי ההפסדים",
    subtitle: "טופ 10 — הכי הרבה הפסדים בליגה",
    badge: "Heavy Hearts",
    badgeClass: "border-slate-600/50 bg-slate-800/80 text-slate-400",
    valueLabel: "הפסדים",
    barClass: "from-slate-600 via-slate-700 to-slate-800",
    valueClass: "text-slate-400",
  },
  lossRatio: {
    title: "יחס הפסדים גרוע",
    subtitle: `טופ 10 — הפסדים ÷ הופעות (מינימום ${15} משחקים)`,
    badge: "W/L Ratio",
    badgeClass: "border-rose-500/30 bg-rose-950/50 text-rose-300/90",
    valueLabel: "יחס הפסדים",
    barClass: "from-rose-700 via-red-900 to-slate-900",
    valueClass: "text-rose-300",
  },
};

function metricValue(player: OranitPlayer, variant: OutcomeLeaderboardVariant): number {
  if (variant === "winners") return playerWins(player);
  if (variant === "losers") return playerLosses(player);
  return playerLossRatio(player);
}

function formatValue(player: OranitPlayer, variant: OutcomeLeaderboardVariant): string {
  if (variant === "lossRatio") return formatPercent(playerLossRatio(player));
  return String(metricValue(player, variant));
}

export function OutcomeLeaderboard({ variant, players }: OutcomeLeaderboardProps) {
  const config = VARIANT_CONFIG[variant];
  const max = Math.max(metricValue(players[0], variant), 0.01);

  return (
    <section className="rounded-2xl border border-violet-500/25 bg-oranit-navy/80 p-5 shadow-glow backdrop-blur-sm">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-violet-500/20 pb-3">
        <div>
          <h2 className="font-display text-xl font-bold text-cyan-100">
            {config.title}
          </h2>
          <p className="mt-1 text-sm text-slate-400">{config.subtitle}</p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${config.badgeClass}`}
        >
          {config.badge}
        </span>
      </header>

      {players.length === 0 ? (
        <p className="rounded-lg border border-dashed border-violet-500/30 py-8 text-center text-sm text-slate-500">
          הרץ{" "}
          <code className="text-cyan-400">npm run scrape:outcomes</code> לעדכון
          נתוני תוצאות
        </p>
      ) : (
        <ol className="space-y-2">
          {players.map((player, index) => {
            const value = metricValue(player, variant);
            const width = Math.max(
              8,
              Math.round((value / max) * 100),
            );

            return (
              <li
                key={player.playerId}
                className="rounded-xl border border-transparent bg-gradient-to-l from-indigo-950/80 to-purple-950/40 px-3 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold ${
                      index === 0 && variant === "winners"
                        ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-[0_0_16px_rgba(52,211,153,0.4)]"
                        : index === 0 && variant === "losers"
                          ? "bg-slate-800 text-slate-300"
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
                      <span
                        className={`shrink-0 font-display text-lg font-semibold ${config.valueClass}`}
                      >
                        {formatValue(player, variant)}
                        <span className="mr-1 text-xs font-normal text-slate-500">
                          {config.valueLabel}
                        </span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-oranit-midnight">
                      <div
                        className={`h-full rounded-full bg-gradient-to-l ${config.barClass}`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    {variant === "lossRatio" && (
                      <p className="mt-1 text-xs text-slate-500">
                        {playerLosses(player)} הפסדים · {player.caps} הופעות
                      </p>
                    )}
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
