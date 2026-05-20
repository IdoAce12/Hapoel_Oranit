import { ManagerPointsLeaderboard } from "@/components/ManagerPointsLeaderboard";
import { OutcomeLeaderboard } from "@/components/OutcomeLeaderboard";
import type { OranitManager, OranitPlayer } from "@/types/oranit";

interface OutcomesDashboardProps {
  topWinners: OranitPlayer[];
  topLosers: OranitPlayer[];
  managersByPoints: OranitManager[];
}

export function OutcomesDashboard({
  topWinners,
  topLosers,
  managersByPoints,
}: OutcomesDashboardProps) {
  return (
    <div className="space-y-8">
      <header className="rounded-2xl border border-violet-500/30 bg-gradient-to-l from-purple-950/60 to-blue-950/40 px-6 py-5 text-center">
        <h2 className="font-display text-2xl font-bold text-transparent bg-gradient-to-l from-emerald-200 via-violet-200 to-blue-200 bg-clip-text">
          תוצאות וטקטיקה
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          אנליטיקת תוצאות משחקי ליגה — ניצחונות, הפסדים ונקודות מאמנים
        </p>
      </header>

      <section>
        <h3 className="mb-4 font-display text-lg font-semibold text-violet-200">
          טבלת שחקנים
        </h3>
        <div className="grid gap-6 lg:grid-cols-2">
          <OutcomeLeaderboard variant="winners" players={topWinners} />
          <OutcomeLeaderboard variant="losers" players={topLosers} />
        </div>
      </section>

      <section>
        <h3 className="mb-4 font-display text-lg font-semibold text-violet-200">
          טבלת מאמנים
        </h3>
        <ManagerPointsLeaderboard managers={managersByPoints} />
      </section>
    </div>
  );
}
