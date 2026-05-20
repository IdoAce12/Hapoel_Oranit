import type { OranitPlayer } from "@/types/oranit";

export function normalizeSearchQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ");
}

export function playerMatchesQuery(player: OranitPlayer, query: string): boolean {
  const q = normalizeSearchQuery(query);
  if (!q) return false;

  const name = player.name;
  if (name.includes(q)) return true;

  const parts = name.split(/\s+/);
  return parts.some((part) => part.startsWith(q) || part.includes(q));
}

export function searchPlayers(
  players: OranitPlayer[],
  query: string,
  limit = 12,
): OranitPlayer[] {
  const q = normalizeSearchQuery(query);
  if (!q) return [];

  return [...players]
    .filter((p) => playerMatchesQuery(p, q))
    .sort((a, b) => b.caps - a.caps || b.goals - a.goals)
    .slice(0, limit);
}
