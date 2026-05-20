import { CardDisciplineLeaderboard } from "@/components/CardDisciplineLeaderboard";
import type { OranitPlayer } from "@/types/oranit";

interface DisciplinePortalProps {
  topYellow: OranitPlayer[];
  topRed: OranitPlayer[];
}

export function DisciplinePortal({ topYellow, topRed }: DisciplinePortalProps) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950 p-5 sm:p-6">
      <header className="mb-6 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-slate-500">
          Discipline Analytics
        </p>
        <h2 className="mt-2 font-display text-2xl font-bold text-slate-100 sm:text-3xl">
          פורטל משמעת
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-slate-400">
          לוחות מובילים נפרדים לכרטיסים צהובים ואדומים — ממוינים לפי נתוני IFA
          המצטברים
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <CardDisciplineLeaderboard variant="yellow" players={topYellow} />
        <CardDisciplineLeaderboard variant="red" players={topRed} />
      </div>
    </section>
  );
}
