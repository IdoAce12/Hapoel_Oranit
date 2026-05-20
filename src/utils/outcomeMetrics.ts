import type { OranitManager, OranitPlayer } from "@/types/oranit";

export function playerWins(p: OranitPlayer): number {
  return p.wins ?? 0;
}

export function playerDraws(p: OranitPlayer): number {
  return p.draws ?? 0;
}

export function playerLosses(p: OranitPlayer): number {
  return p.losses ?? 0;
}

export function managerPoints(m: OranitManager): number {
  if (m.points != null) return m.points;
  const w = m.wins ?? 0;
  const d = m.draws ?? 0;
  return w * 3 + d;
}

export function managerRecord(m: OranitManager): string {
  return `${m.wins ?? 0}/${m.draws ?? 0}/${m.losses ?? 0}`;
}

/** (Total Points / (Total Matches × 3)) × 100 */
export function managerSuccessRate(m: OranitManager): number | null {
  if (m.totalMatches <= 0) return null;
  const points = managerPoints(m);
  return (points / (m.totalMatches * 3)) * 100;
}

export function formatSuccessRate(rate: number | null): string {
  if (rate == null || Number.isNaN(rate)) return "—";
  return `${rate.toFixed(1)}%`;
}
