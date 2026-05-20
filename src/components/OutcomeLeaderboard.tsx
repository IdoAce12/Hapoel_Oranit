import type { OranitPlayer } from "@/types/oranit";
import { playerLosses, playerWins } from "@/utils/outcomeMetrics";

export type OutcomeLeaderboardVariant = "winners" | "losers";

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
    subtitle: "טופ 10 — ניצחונות מצטברים ממשחקי ליגה (פרוטוקול)",
    badge: "Winnable",
    badgeClass:
      "border-emerald-400/40 bg-emerald-500/15 text-emerald-200 shadow-[0_0_20px_rgba(52,211,153,0.25)]",
    valueLabel: "ניצחונות",
    barClass: "from-emerald-500 via-green-500 to-teal-500",
    valueClass: "text-emerald-300",
  },
  losers: {
    title: "מלכי ההפסדים",
    subtitle: "טופ 10 — הפסדים מצטברים ממשחקי ליגה (פרוטוקול)",
    badge: "Heavy Hearts",
    badgeClass: "border-slate-600/50 bg-slate-800/80 text-slate-400",
    valueLabel: "הפסדים",
    barClass: "from-slate-600 via-slate-700 to-slate-800",
    valueClass: "text-slate-400",
  },
};

function metricValue(player: OranitPlayer, variant: OutcomeLeaderboardVariant): number {
  return variant === "winners" ? playerWins(player) : playerLosses(player);
}

export function OutcomeLeaderboard({ variant, players }: OutcomeLeaderboardProps) {
  const config = VARIANT_CONFIG[variant];
  const max = Math.max(metricValue(players[0], variant), 1);

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
            const width = Math.max(8, Math.round((value / max) * 100));

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
                        {value}
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
                    <p className="mt-1 text-xs text-slate-500">
                      {player.caps} הופעות · {playerWins(player)}נ׳{" "}
                      {playerLosses(player)}ה׳
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
