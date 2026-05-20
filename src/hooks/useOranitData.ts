import { useMemo, useState } from "react";
import rawData from "@/data/oranitData.json";
import type { OranitDataset, OranitPlayer, PlayerMetrics } from "@/types/oranit";
import {
  enrichAll,
  filterForDiscipline,
  filterForEfficiency,
} from "@/utils/playerMetrics";
import { managerPoints, playerLosses, playerWins } from "@/utils/outcomeMetrics";

const dataset = rawData as OranitDataset;

export type AppTab =
  | "legacy"
  | "efficiency"
  | "discipline"
  | "managers"
  | "outcomes";

export function useOranitData() {
  const [activeTab, setActiveTab] = useState<AppTab>("legacy");

  const players = dataset.players;
  const managers = dataset.managers ?? [];
  const metrics = useMemo(() => enrichAll(players), [players]);

  const topManagers = useMemo(
    () =>
      [...managers]
        .sort(
          (a, b) =>
            b.totalMatches - a.totalMatches ||
            b.seasons.length - a.seasons.length,
        )
        .slice(0, 5),
    [managers],
  );

  const topByGoals = useMemo(
    () =>
      [...players]
        .sort((a, b) => b.goals - a.goals || b.caps - a.caps)
        .slice(0, 10),
    [players],
  );

  const topByCaps = useMemo(
    () =>
      [...players]
        .sort((a, b) => b.caps - a.caps || b.goals - a.goals)
        .slice(0, 10),
    [players],
  );

  const legends = useMemo(() => {
    const scored = players.filter((p) => p.goals > 0 || p.caps >= 15);
    return [...scored]
      .sort((a, b) => b.goals * 1000 + b.caps - (a.goals * 1000 + a.caps))
      .slice(0, 10);
  }, [players]);

  const topEfficientScorers = useMemo(() => {
    return [...filterForEfficiency(metrics)]
      .sort((a, b) => b.goalsPer90 - a.goalsPer90 || b.goals - a.goals)
      .slice(0, 10);
  }, [metrics]);

  const mostDisciplined = useMemo(() => {
    return [...filterForDiscipline(metrics)]
      .filter((p) => p.totalCards >= 0)
      .sort(
        (a, b) =>
          a.cardsPerMatch - b.cardsPerMatch ||
          (b.minutesPerCard ?? 0) - (a.minutesPerCard ?? 0),
      )
      .slice(0, 10);
  }, [metrics]);

  const mostAggressive = useMemo(() => {
    return [...filterForDiscipline(metrics)]
      .filter((p) => p.totalCards > 0)
      .sort(
        (a, b) =>
          b.cardsPerMatch - a.cardsPerMatch ||
          b.totalCards - a.totalCards,
      )
      .slice(0, 10);
  }, [metrics]);

  const topByYellowCards = useMemo(
    () =>
      [...players]
        .filter((p) => p.yellowCards > 0)
        .sort(
          (a, b) =>
            b.yellowCards - a.yellowCards ||
            b.redCards - a.redCards ||
            b.caps - a.caps,
        )
        .slice(0, 10),
    [players],
  );

  const topWinners = useMemo(
    () =>
      [...players]
        .filter((p) => playerWins(p) > 0)
        .sort(
          (a, b) =>
            playerWins(b) - playerWins(a) ||
            b.caps - a.caps ||
            playerLosses(a) - playerLosses(b),
        )
        .slice(0, 10),
    [players],
  );

  const topLosers = useMemo(
    () =>
      [...players]
        .filter((p) => playerLosses(p) > 0)
        .sort(
          (a, b) =>
            playerLosses(b) - playerLosses(a) ||
            b.caps - a.caps ||
            playerWins(a) - playerWins(b),
        )
        .slice(0, 10),
    [players],
  );

  const managersByPoints = useMemo(
    () =>
      [...managers].sort(
        (a, b) =>
          managerPoints(b) - managerPoints(a) ||
          (b.wins ?? 0) - (a.wins ?? 0) ||
          b.totalMatches - a.totalMatches,
      ),
    [managers],
  );

  const topByRedCards = useMemo(
    () =>
      [...players]
        .filter((p) => p.redCards > 0)
        .sort(
          (a, b) =>
            b.redCards - a.redCards ||
            b.yellowCards - a.yellowCards ||
            b.caps - a.caps,
        )
        .slice(0, 10),
    [players],
  );

  return {
    activeTab,
    setActiveTab,
    meta: {
      teamId: dataset.teamId,
      teamName: dataset.teamName,
      scrapedAt: dataset.scrapedAt,
      playerCount: players.length,
    },
    players,
    metrics,
    topByGoals,
    topByCaps,
    legends,
    topEfficientScorers,
    mostDisciplined,
    mostAggressive,
    topByYellowCards,
    topByRedCards,
    managers,
    topManagers,
    topWinners,
    topLosers,
    managersByPoints,
  };
}

export type { OranitPlayer, PlayerMetrics };
