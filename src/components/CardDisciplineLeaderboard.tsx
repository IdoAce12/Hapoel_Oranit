import type { OranitPlayer } from "@/types/oranit";

type CardMetric = "yellow" | "red";

interface CardDisciplineLeaderboardProps {
  variant: CardMetric;
  players: OranitPlayer[];
}

const CONFIG = {
  yellow: {
    title: "מלכי הצהובים",
    subtitle: "טופ 10 — הכי הרבה כרטיסים צהובים",
    label: "צהובים",
    value: (p: OranitPlayer) => p.yellowCards,
    sectionBorder: "border-amber-500/25",
    sectionBg: "bg-slate-950/90",
    headerAccent: "text-amber-300",
    rankFirst: "bg-gradient-to-br from-amber-500 to-amber-700 text-amber-950 shadow-[0_0_16px_rgba(245,158,11,0.45)]",
    rankDefault: "bg-slate-900 text-amber-200",
    bar: "bg-gradient-to-l from-amber-600 via-amber-500 to-yellow-400 shadow-[0_0_8px_rgba(251,191,36,0.4)]",
    badge:
      "border border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.2)]",
    valueColor: "text-amber-400",
    rowHover: "hover:border-amber-500/30",
  },
  red: {
    title: "מלכי האדומים",
    subtitle: "טופ 10 — הכי הרבה כרטיסים אדומים",
    label: "אדומים",
    value: (p: OranitPlayer) => p.redCards,
    sectionBorder: "border-rose-500/25",
    sectionBg: "bg-slate-950/90",
    headerAccent: "text-rose-300",
    rankFirst:
      "bg-gradient-to-br from-rose-600 to-red-700 text-white shadow-[0_0_16px_rgba(244,63,94,0.5)]",
    rankDefault: "bg-slate-900 text-rose-200",
    bar: "bg-gradient-to-l from-rose-600 via-red-500 to-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.45)]",
    badge:
      "border border-rose-500/30 bg-rose-500/10 text-rose-400 shadow-[0_0_14px_rgba(244,63,94,0.25)]",
    valueColor: "text-rose-400",
    rowHover: "hover:border-rose-500/30",
  },
} as const;

export function CardDisciplineLeaderboard({
  variant,
  players,
}: CardDisciplineLeaderboardProps) {
  const cfg = CONFIG[variant];
  const max = players.length > 0 ? cfg.value(players[0]) : 1;

  return (
    <section
      className={`rounded-2xl border p-5 backdrop-blur-sm ${cfg.sectionBorder} ${cfg.sectionBg}`}
    >
      <header className="mb-4 border-b border-slate-800 pb-3">
        <h2 className={`font-display text-xl font-bold ${cfg.headerAccent}`}>
          {cfg.title}
        </h2>
        <p className="mt-1 text-sm text-slate-400">{cfg.subtitle}</p>
      </header>

      {players.length === 0 ? (
        <p className="rounded-lg bg-slate-900/60 px-4 py-6 text-center text-sm text-slate-500">
          אין שחקנים עם כרטיסי {cfg.label} רשומים
        </p>
      ) : (
        <ol className="space-y-2">
          {players.map((player, index) => {
            const value = cfg.value(player);
            const width = Math.max(8, Math.round((value / max) * 100));

            return (
              <li
                key={player.playerId}
                className={`group rounded-xl border border-slate-800/80 bg-slate-900/50 px-3 py-2.5 transition ${cfg.rowHover}`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold ${
                      index === 0 ? cfg.rankFirst : cfg.rankDefault
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium text-slate-100">
                        {player.name}
                      </span>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 font-display text-lg font-bold ${cfg.badge} ${cfg.valueColor}`}
                      >
                        {value}
                        <span className="text-xs font-normal opacity-80">
                          {cfg.label}
                        </span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-950">
                      <div
                        className={`h-full rounded-full ${cfg.bar}`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {player.caps} הופעות
                      {variant === "yellow" && player.redCards > 0 && (
                        <span className="mr-2 text-rose-400/70">
                          · {player.redCards} אדומים
                        </span>
                      )}
                      {variant === "red" && player.yellowCards > 0 && (
                        <span className="mr-2 text-amber-400/70">
                          · {player.yellowCards} צהובים
                        </span>
                      )}
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
