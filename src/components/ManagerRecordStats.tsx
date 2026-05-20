import type { OranitManager } from "@/types/oranit";

interface ManagerRecordStatsProps {
  manager: OranitManager;
  className?: string;
}

export function ManagerRecordStats({
  manager,
  className = "",
}: ManagerRecordStatsProps) {
  const wins = manager.wins ?? 0;
  const draws = manager.draws ?? 0;
  const losses = manager.losses ?? 0;

  return (
    <span
      className={`inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-mono text-sm ${className}`}
      dir="ltr"
    >
      <span>
        <span className="font-semibold text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.45)]">
          {wins}
        </span>
        <span className="mr-0.5 text-xs text-emerald-400/90">W</span>
        <span className="text-xs text-emerald-400/80">נצ׳</span>
      </span>
      <span className="text-slate-600">/</span>
      <span>
        <span className="font-semibold text-slate-400">{draws}</span>
        <span className="mr-0.5 text-xs text-slate-400">D</span>
        <span className="text-xs text-slate-500">תיקו</span>
      </span>
      <span className="text-slate-600">/</span>
      <span>
        <span className="font-semibold text-rose-400 drop-shadow-[0_0_10px_rgba(251,113,133,0.4)]">
          {losses}
        </span>
        <span className="mr-0.5 text-xs text-rose-400/90">L</span>
        <span className="text-xs text-rose-400/80">הפ׳</span>
      </span>
    </span>
  );
}
