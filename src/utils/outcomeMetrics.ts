import type { OranitManager, OranitPlayer } from "@/types/oranit";

export const MIN_CAPS_FOR_LOSS_RATIO = 15;

export function playerWins(p: OranitPlayer): number {
  return p.wins ?? 0;
}

export function playerDraws(p: OranitPlayer): number {
  return p.draws ?? 0;
}

export function playerLosses(p: OranitPlayer): number {
  return p.losses ?? 0;
}

export function playerLossRatio(p: OranitPlayer): number {
  if (p.caps < MIN_CAPS_FOR_LOSS_RATIO) return -1;
  return playerLosses(p) / p.caps;
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

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
