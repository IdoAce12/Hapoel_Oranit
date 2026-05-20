import type { OranitPlayer } from "@/types/oranit";

interface LegendsGridProps {
  players: OranitPlayer[];
  highlightPlayerId?: string | null;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2);
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`;
}

export function LegendsGrid({ players, highlightPlayerId }: LegendsGridProps) {
  return (
    <section className="rounded-2xl border border-blue-500/20 bg-gradient-to-b from-oranit-navy/90 to-oranit-midnight/95 p-5">
      <header className="mb-5">
        <h2 className="bg-gradient-to-l from-cyan-300 via-violet-300 to-blue-400 bg-clip-text font-display text-2xl font-bold text-transparent">
          אגדות המועדון
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          שחקני מפתח — שערים, הופעות, דקות וכרטיסים מצטברים
        </p>
      </header>

      {players.length === 0 ? (
        <div className="grid place-items-center rounded-xl border border-dashed border-violet-500/30 py-16 text-slate-400">
          הרץ את הסקרייפר כדי לטעון אגדות אמיתיות מההתאחדות
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {players.map((player, index) => (
            <article
              id={`player-card-${player.playerId}`}
              key={player.playerId}
              className={`relative overflow-hidden rounded-2xl border bg-oranit-midnight/70 p-4 transition hover:-translate-y-0.5 hover:shadow-glow ${
                highlightPlayerId === player.playerId
                  ? "border-cyan-400/70 shadow-glow ring-2 ring-cyan-400/40"
                  : "border-violet-500/30 hover:border-cyan-400/40"
              }`}
            >
              <div
                className="pointer-events-none absolute -left-8 -top-8 h-24 w-24 rounded-full bg-violet-600/20 blur-2xl"
                aria-hidden
              />
              <div className="flex items-start justify-between gap-2">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-800 to-purple-900 font-display text-lg font-bold text-cyan-100"
                  aria-hidden
                >
                  {initials(player.name)}
                </div>
                <span className="rounded-full bg-violet-600/30 px-2 py-0.5 text-xs font-medium text-violet-200">
                  #{index + 1}
                </span>
              </div>
              <h3 className="mt-3 font-display text-base font-semibold leading-snug text-slate-100">
                {player.name}
              </h3>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-lg bg-blue-950/50 py-2">
                  <dt className="text-[10px] uppercase tracking-wide text-slate-500">
                    הופעות
                  </dt>
                  <dd className="font-display text-xl font-bold text-cyan-300">
                    {player.caps}
                  </dd>
                </div>
                <div className="rounded-lg bg-purple-950/50 py-2">
                  <dt className="text-[10px] uppercase tracking-wide text-slate-500">
                    שערים
                  </dt>
                  <dd className="font-display text-xl font-bold text-violet-300">
                    {player.goals}
                  </dd>
                </div>
                <div className="rounded-lg bg-indigo-950/40 py-2">
                  <dt className="text-[10px] uppercase tracking-wide text-slate-500">
                    דקות
                  </dt>
                  <dd className="font-display text-sm font-bold text-blue-200">
                    {player.minutesPlayed.toLocaleString("he-IL")}
                  </dd>
                </div>
                <div className="rounded-lg bg-amber-950/30 py-2">
                  <dt className="text-[10px] uppercase tracking-wide text-slate-500">
                    כרטיסים
                  </dt>
                  <dd className="font-display text-sm font-bold">
                    <span className="text-amber-400">{player.yellowCards}</span>
                    <span className="text-slate-600"> / </span>
                    <span className="text-red-400">{player.redCards}</span>
                  </dd>
                </div>
              </dl>
              <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-500">
                {player.seasons.length > 0 ? player.seasons.join(" · ") : "—"}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
