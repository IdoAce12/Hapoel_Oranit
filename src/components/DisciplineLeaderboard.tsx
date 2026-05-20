import type { PlayerMetrics } from "@/types/oranit";
import {
  formatCardsPerMatch,
  formatMinutesPerCard,
} from "@/utils/playerMetrics";

interface DisciplineLeaderboardProps {
  variant: "disciplined" | "aggressive";
  players: PlayerMetrics[];
}

export function DisciplineLeaderboard({
  variant,
  players,
}: DisciplineLeaderboardProps) {
  const isDisciplined = variant === "disciplined";
  const maxCards = Math.max(...players.map((p) => p.cardsPerMatch), 0.01);

  return (
    <section
      className={`rounded-2xl border p-5 ${
        isDisciplined
          ? "border-emerald-500/20 bg-gradient-to-b from-oranit-navy/90 to-emerald-950/20"
          : "border-red-500/25 bg-gradient-to-b from-oranit-navy/90 to-red-950/25 shadow-[0_0_28px_rgba(220,38,38,0.12)]"
      }`}
    >
      <header className="mb-4 border-b border-white/5 pb-3">
        <h2
          className={`font-display text-xl font-bold ${
            isDisciplined ? "text-emerald-200" : "text-red-300"
          }`}
        >
          {isDisciplined ? "הכי ממושמעים" : "הכי אגרסיביים"}
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          {isDisciplined
            ? "פחות כרטיסים למשחק · יותר דקות לכל כרטיס"
            : "הכי הרבה צהובים/אדומים למשחק"}
        </p>
      </header>

      {players.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">אין נתונים</p>
      ) : (
        <ol className="space-y-2">
          {players.map((player, index) => {
            const barPct = isDisciplined
              ? Math.max(
                  8,
                  100 -
                    Math.round((player.cardsPerMatch / maxCards) * 100),
                )
              : Math.max(
                  12,
                  Math.round((player.cardsPerMatch / maxCards) * 100),
                );

            return (
              <li
                key={player.playerId}
                className="rounded-xl border border-white/5 bg-oranit-midnight/50 px-3 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      isDisciplined
                        ? "bg-emerald-900/80 text-emerald-200"
                        : "bg-red-900/80 text-red-200 shadow-[0_0_12px_rgba(239,68,68,0.45)]"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-medium text-slate-100">
                        {player.name}
                      </span>
                      <span className="shrink-0 text-sm font-semibold text-slate-300">
                        {formatCardsPerMatch(player.cardsPerMatch)}
                        <span className="mr-1 text-xs text-slate-500">
                          כרטיס/משחק
                        </span>
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-900">
                      <div
                        className={`h-full rounded-full ${
                          isDisciplined
                            ? "bg-gradient-to-l from-emerald-600 to-teal-500"
                            : "bg-gradient-to-l from-amber-500 via-orange-500 to-red-600 shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                        }`}
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs">
                      <span
                        className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.25)]"
                        title="כרטיסים צהובים"
                      >
                        <span
                          className="h-2 w-2 rounded-sm bg-amber-400"
                          aria-hidden
                        />
                        {player.yellowCards}
                      </span>
                      <span
                        className="inline-flex items-center gap-1 rounded-md bg-red-600/20 px-2 py-0.5 text-red-300 shadow-[0_0_12px_rgba(220,38,38,0.35)]"
                        title="כרטיסים אדומים"
                      >
                        <span
                          className="h-2 w-2 rounded-sm bg-red-500"
                          aria-hidden
                        />
                        {player.redCards}
                      </span>
                      <span className="text-slate-500">
                        {formatMinutesPerCard(player.minutesPerCard)} דק׳/כרטיס
                      </span>
                    </div>
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
