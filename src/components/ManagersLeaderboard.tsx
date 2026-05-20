import type { OranitManager } from "@/types/oranit";
import { formatYearsActive } from "@/utils/seasonDisplay";

interface ManagersLeaderboardProps {
  managers: OranitManager[];
}

export function ManagersLeaderboard({ managers }: ManagersLeaderboardProps) {
  const top = managers.slice(0, 5);
  const max = top[0]?.totalMatches ?? 1;

  return (
    <section className="rounded-2xl border border-violet-500/30 bg-slate-950/90 p-5 shadow-glow">
      <header className="mb-5 border-b border-violet-500/20 pb-4 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-violet-300/70">
          היסטוריית מאמנים
        </p>
        <h2 className="mt-2 font-display text-2xl font-bold text-transparent bg-gradient-to-l from-cyan-200 via-violet-200 to-blue-300 bg-clip-text">
          מאמנים על הקווים
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          טופ 5 — הופעות מאמן (משחקי הקבוצה בעונות שאימן)
        </p>
      </header>

      {top.length === 0 ? (
        <p className="rounded-xl border border-dashed border-violet-500/30 py-12 text-center text-sm text-slate-500">
          הרץ את הסקרייפר לעדכון נתוני מאמנים:{" "}
          <code className="text-cyan-400">npm run scrape</code>
        </p>
      ) : (
        <ol className="space-y-4">
          {top.map((manager, index) => {
            const width = Math.max(
              12,
              Math.round((manager.totalMatches / max) * 100),
            );

            return (
              <li
                key={manager.managerId}
                className="rounded-2xl border border-slate-800 bg-gradient-to-l from-indigo-950/80 to-purple-950/30 p-4"
              >
                <div className="flex items-start gap-4">
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-display text-lg font-bold ${
                      index === 0
                        ? "bg-gradient-to-br from-violet-600 to-blue-600 text-white shadow-glow"
                        : "bg-slate-900 text-violet-200"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-display text-lg font-semibold text-slate-100">
                        {manager.name}
                      </h3>
                      <span className="font-display text-2xl font-bold text-cyan-300">
                        {manager.totalMatches}
                        <span className="mr-1 text-xs font-normal text-slate-400">
                          משחקים
                        </span>
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-900">
                      <div
                        className="h-full rounded-full bg-gradient-to-l from-blue-500 via-violet-500 to-purple-600"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-500 sm:hidden">
                      {formatYearsActive(manager.seasons)}
                    </p>
                    <div className="mt-2 hidden flex-wrap gap-1.5 sm:flex">
                      {manager.seasons.map((season) => (
                        <span
                          key={season}
                          className="rounded-md border border-violet-500/25 bg-violet-500/10 px-2 py-0.5 text-xs text-violet-200"
                        >
                          {season}
                        </span>
                      ))}
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
