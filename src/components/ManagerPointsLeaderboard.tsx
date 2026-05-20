import { ManagerRecordStats } from "@/components/ManagerRecordStats";
import type { OranitManager } from "@/types/oranit";
import { formatYearsActive } from "@/utils/seasonDisplay";
import {
  formatSuccessRate,
  managerPoints,
  managerSuccessRate,
} from "@/utils/outcomeMetrics";

interface ManagerPointsLeaderboardProps {
  managers: OranitManager[];
}

export function ManagerPointsLeaderboard({
  managers,
}: ManagerPointsLeaderboardProps) {
  const top = managers.slice(0, 10);
  const maxPoints = managerPoints(
    top[0] ?? { managerId: "", name: "", totalMatches: 0, seasons: [] },
  );

  return (
    <section className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-indigo-950/90 via-purple-950/60 to-blue-950/50 p-5 shadow-glow">
      <header className="mb-5 border-b border-violet-500/20 pb-4 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-violet-300/70">
          נקודות ליגה למאמן
        </p>
        <h2 className="mt-2 font-display text-2xl font-bold text-transparent bg-gradient-to-l from-amber-200 via-violet-200 to-cyan-200 bg-clip-text">
          טבלת נקודות מאמנים
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          נקודות = (ניצחונות × 3) + (תיקו × 1) · אחוזי הצלחה = נקודות ÷ (משחקים ×
          3)
        </p>
      </header>

      {top.length === 0 ? (
        <p className="rounded-xl border border-dashed border-violet-500/30 py-10 text-center text-sm text-slate-500">
          אין נתוני מאמנים — הרץ את הסקרייפר
        </p>
      ) : (
        <>
          <div
            className="mb-2 hidden gap-3 px-4 text-xs font-medium uppercase tracking-wider text-slate-500 sm:grid sm:grid-cols-[2.5rem_1fr_auto_auto_auto]"
            aria-hidden
          >
            <span>#</span>
            <span>מאמן</span>
            <span className="text-center">רשומה</span>
            <span className="text-center">נק׳</span>
            <span className="text-center text-indigo-400/90">אחוזי הצלחה</span>
          </div>
          <ol className="space-y-3">
            {top.map((manager, index) => {
              const points = managerPoints(manager);
              const successRate = managerSuccessRate(manager);
              const width = Math.max(
                12,
                Math.round((points / maxPoints) * 100),
              );

              return (
                <li
                  key={manager.managerId}
                  className="rounded-2xl border border-violet-500/20 bg-slate-950/70 p-4"
                >
                  <div className="flex flex-col gap-3 sm:grid sm:grid-cols-[2.5rem_1fr_auto_auto_auto] sm:items-center sm:gap-4">
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-display text-lg font-bold sm:h-10 sm:w-10 ${
                        index === 0
                          ? "bg-gradient-to-br from-amber-500 via-violet-600 to-blue-600 text-white shadow-[0_0_24px_rgba(167,139,250,0.45)]"
                          : "bg-oranit-midnight text-violet-200"
                      }`}
                    >
                      {index + 1}
                    </span>

                    <div className="min-w-0 sm:col-span-1">
                      <h3 className="font-display text-lg font-semibold text-slate-100">
                        {manager.name}
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {manager.totalMatches} משחקי ליגה
                      </p>
                      <p className="mt-1 text-xs text-slate-500 sm:hidden">
                        {formatYearsActive(manager.seasons)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-violet-500/10 pt-2 sm:flex-col sm:border-0 sm:pt-0">
                      <span className="text-xs text-slate-500 sm:hidden">
                        רשומה
                      </span>
                      <ManagerRecordStats manager={manager} />
                    </div>

                    <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-center">
                      <span className="text-xs text-slate-500 sm:hidden">
                        נקודות
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 font-display text-xl font-bold text-amber-200 shadow-[0_0_18px_rgba(251,191,36,0.2)]">
                        {points}
                        <span className="text-xs font-normal text-amber-200/70">
                          נק׳
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-center">
                      <span className="text-xs text-slate-500 sm:hidden">
                        אחוזי הצלחה
                      </span>
                      <span
                        className="font-display text-lg font-bold tracking-tight text-indigo-400 drop-shadow-[0_0_12px_rgba(129,140,248,0.35)]"
                        title="נקודות ÷ (משחקים × 3) × 100"
                      >
                        {formatSuccessRate(successRate)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-900 sm:col-span-full">
                    <div
                      className="h-full rounded-full bg-gradient-to-l from-amber-500 via-violet-500 to-blue-500"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </section>
  );
}
