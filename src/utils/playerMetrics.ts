import type { OranitPlayer, PlayerMetrics } from "@/types/oranit";

const MIN_CAPS_FOR_DISCIPLINE = 5;
const MIN_MINUTES_FOR_EFFICIENCY = 90;

export function enrichPlayer(player: OranitPlayer): PlayerMetrics {
  const totalCards = player.yellowCards + player.redCards;
  const goalsPer90 =
    player.minutesPlayed > 0
      ? (player.goals / player.minutesPlayed) * 90
      : 0;
  const cardsPerMatch =
    player.caps > 0 ? totalCards / player.caps : totalCards;
  const minutesPerCard =
    totalCards > 0 ? player.minutesPlayed / totalCards : null;

  return {
    ...player,
    totalCards,
    goalsPer90,
    cardsPerMatch,
    minutesPerCard,
  };
}

export function enrichAll(players: OranitPlayer[]): PlayerMetrics[] {
  return players.map(enrichPlayer);
}

export function filterForDiscipline(players: PlayerMetrics[]): PlayerMetrics[] {
  return players.filter((p) => p.caps >= MIN_CAPS_FOR_DISCIPLINE);
}

export function filterForEfficiency(players: PlayerMetrics[]): PlayerMetrics[] {
  return players.filter(
    (p) => p.minutesPlayed >= MIN_MINUTES_FOR_EFFICIENCY && p.goals > 0,
  );
}

export function formatGoalsPer90(value: number): string {
  return value.toFixed(2);
}

export function formatCardsPerMatch(value: number): string {
  return value.toFixed(2);
}

export function formatMinutesPerCard(value: number | null): string {
  if (value === null) return "—";
  return Math.round(value).toLocaleString("he-IL");
}
