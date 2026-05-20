import { useCallback, useState } from "react";
import { CollapsibleLegends } from "@/components/CollapsibleLegends";
import { DisciplineLeaderboard } from "@/components/DisciplineLeaderboard";
import { DisciplinePortal } from "@/components/DisciplinePortal";
import { EfficiencyLeaderboard } from "@/components/EfficiencyLeaderboard";
import { ManagersLeaderboard } from "@/components/ManagersLeaderboard";
import { OutcomesDashboard } from "@/components/OutcomesDashboard";
import { PlayerDetailModal } from "@/components/PlayerDetailModal";
import { PlayerSearch } from "@/components/PlayerSearch";
import { StatsLeaderboard } from "@/components/StatsLeaderboard";
import { useOranitData, type AppTab } from "@/hooks/useOranitData";
import type { OranitPlayer } from "@/types/oranit";
import { enrichPlayer } from "@/utils/playerMetrics";

function formatScrapedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("he-IL", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

const TABS: { id: AppTab; label: string }[] = [
  { id: "legacy", label: "היכל התהילה" },
  { id: "managers", label: "מאמנים על הקווים" },
  { id: "discipline", label: "פורטל משמעת" },
  { id: "efficiency", label: "יעילות" },
  { id: "outcomes", label: "תוצאות וטקטיקה" },
];

export default function App() {
  const {
    activeTab,
    setActiveTab,
    meta,
    players,
    topByGoals,
    topByCaps,
    legends,
    topEfficientScorers,
    mostDisciplined,
    mostAggressive,
    topByYellowCards,
    topByRedCards,
    topManagers,
    topWinners,
    topLosers,
    managersByPoints,
  } = useOranitData();

  const [selectedPlayer, setSelectedPlayer] = useState<OranitPlayer | null>(null);
  const [highlightPlayerId, setHighlightPlayerId] = useState<string | null>(null);

  const handleSelectPlayer = useCallback(
    (player: OranitPlayer) => {
      setSelectedPlayer(player);
      setHighlightPlayerId(player.playerId);

      const inLegends = legends.some((l) => l.playerId === player.playerId);
      if (inLegends) {
        setActiveTab("legacy");
        window.setTimeout(() => {
          document
            .getElementById(`player-card-${player.playerId}`)
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 150);
      }

      window.setTimeout(() => setHighlightPlayerId(null), 4000);
    },
    [legends, setActiveTab],
  );

  const selectedMetrics = selectedPlayer
    ? enrichPlayer(selectedPlayer)
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-oranit-midnight font-display text-slate-200">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(91,45,138,0.25),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(37,99,235,0.18),_transparent_50%)]" />

      <div className="relative mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-violet-300/80">
            Team ID {meta.teamId} · IFA Match Analytics · PWA
          </p>
          <h1 className="mt-2 bg-gradient-to-l from-cyan-200 via-violet-200 to-blue-300 bg-clip-text text-4xl font-bold text-transparent sm:text-5xl">
            {meta.teamName}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-slate-400">
            היכל התהילה — חיפוש שחקנים חכם, נתונים היסטוריים מלאים, ומשמעת
            ויעילות בזמן אמת.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {meta.playerCount} שחקנים · עודכן {formatScrapedAt(meta.scrapedAt)}
          </p>

          <div className="mt-8">
            <PlayerSearch players={players} onSelectPlayer={handleSelectPlayer} />
          </div>
        </header>

        <nav
          className="mb-8 flex flex-wrap justify-center gap-2"
          role="tablist"
          aria-label="ניווט עמודים"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? "bg-gradient-to-l from-violet-600 to-blue-600 text-white shadow-glow"
                  : "border border-violet-500/30 bg-oranit-navy/60 text-slate-400 hover:border-violet-400/50 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {activeTab === "legacy" && (
          <>
            <div className="mb-10 flex flex-col gap-6">
              <StatsLeaderboard
                title="מלכי ההופעות"
                subtitle="טופ 10 — הופעות רשמיות"
                metric="caps"
                players={topByCaps}
              />
              <StatsLeaderboard
                title="מלכי השערים"
                subtitle="טופ 10 — שערים מצטברים"
                metric="goals"
                players={topByGoals}
              />
            </div>
            <CollapsibleLegends
              players={legends}
              highlightPlayerId={highlightPlayerId}
            />
          </>
        )}

        {activeTab === "managers" && (
          <ManagersLeaderboard managers={topManagers} />
        )}

        {activeTab === "discipline" && (
          <DisciplinePortal
            topYellow={topByYellowCards}
            topRed={topByRedCards}
          />
        )}

        {activeTab === "efficiency" && (
          <div className="space-y-8">
            <EfficiencyLeaderboard players={topEfficientScorers} />
            <div className="grid gap-6 lg:grid-cols-2">
              <DisciplineLeaderboard
                variant="disciplined"
                players={mostDisciplined}
              />
              <DisciplineLeaderboard
                variant="aggressive"
                players={mostAggressive}
              />
            </div>
          </div>
        )}

        {activeTab === "outcomes" && (
          <OutcomesDashboard
            topWinners={topWinners}
            topLosers={topLosers}
            managersByPoints={managersByPoints}
          />
        )}

      </div>

      <footer className="relative mt-auto border-t border-violet-500/15 py-8 text-center">
        <p className="text-sm text-zinc-500">{"נוצר ע\"י IdoAce12"}</p>
      </footer>

      <PlayerDetailModal
        player={selectedMetrics}
        onClose={() => setSelectedPlayer(null)}
      />
    </div>
  );
}
