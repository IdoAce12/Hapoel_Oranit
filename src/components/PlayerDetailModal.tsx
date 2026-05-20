import type { PlayerMetrics } from "@/types/oranit";
import {
  formatCardsPerMatch,
  formatGoalsPer90,
  formatMinutesPerCard,
} from "@/utils/playerMetrics";

interface PlayerDetailModalProps {
  player: PlayerMetrics | null;
  onClose: () => void;
}

export function PlayerDetailModal({ player, onClose }: PlayerDetailModalProps) {
  if (!player) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="player-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        aria-label="סגור"
        onClick={onClose}
      />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-violet-500/30 bg-gradient-to-b from-oranit-navy to-slate-950 p-6 shadow-glow">
        <button
          type="button"
          onClick={onClose}
          className="absolute left-4 top-4 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-slate-400 hover:text-slate-200"
        >
          ✕
        </button>

        <header className="mb-6 border-b border-violet-500/20 pb-4 pt-2 text-center">
          <p className="text-xs uppercase tracking-widest text-violet-300/70">
            פרופיל שחקן
          </p>
          <h2
            id="player-modal-title"
            className="mt-2 font-display text-2xl font-bold text-slate-100"
          >
            {player.name}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {player.seasons.length} עונות פעילות
          </p>
        </header>

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCell label="הופעות" value={player.caps} accent="cyan" />
          <StatCell label="שערים" value={player.goals} accent="violet" />
          <StatCell
            label="דקות"
            value={player.minutesPlayed.toLocaleString("he-IL")}
            accent="blue"
          />
          <StatCell label="צהובים" value={player.yellowCards} accent="amber" />
          <StatCell label="אדומים" value={player.redCards} accent="rose" />
          <StatCell
            label="שערים ל-90׳"
            value={formatGoalsPer90(player.goalsPer90)}
            accent="purple"
          />
          <StatCell
            label="כרטיס/משחק"
            value={formatCardsPerMatch(player.cardsPerMatch)}
            accent="slate"
          />
          <StatCell
            label="דק׳/כרטיס"
            value={formatMinutesPerCard(player.minutesPerCard)}
            accent="slate"
          />
        </dl>

        <div className="mt-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            עונות
          </h3>
          <p className="text-sm leading-relaxed text-slate-400">
            {player.seasons.join(" · ")}
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: "cyan" | "violet" | "blue" | "amber" | "rose" | "purple" | "slate";
}) {
  const colors = {
    cyan: "text-cyan-300 border-cyan-500/20 bg-cyan-950/30",
    violet: "text-violet-300 border-violet-500/20 bg-violet-950/30",
    blue: "text-blue-300 border-blue-500/20 bg-blue-950/30",
    amber: "text-amber-300 border-amber-500/20 bg-amber-950/30",
    rose: "text-rose-300 border-rose-500/20 bg-rose-950/30",
    purple: "text-purple-300 border-purple-500/20 bg-purple-950/30",
    slate: "text-slate-300 border-slate-600/30 bg-slate-900/50",
  };

  return (
    <div className={`rounded-xl border px-3 py-3 text-center ${colors[accent]}`}>
      <dt className="text-[10px] uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 font-display text-xl font-bold">{value}</dd>
    </div>
  );
}
