export interface OranitPlayer {
  playerId: string;
  name: string;
  goals: number;
  caps: number;
  yellowCards: number;
  redCards: number;
  minutesPlayed: number;
  wins?: number;
  draws?: number;
  losses?: number;
  seasons: string[];
}

export interface ManagerSeasonDetail {
  seasonId: number;
  seasonLabel: string;
  matches: number;
  wins?: number;
  draws?: number;
  losses?: number;
}

export interface OranitManager {
  managerId: string;
  name: string;
  totalMatches: number;
  wins?: number;
  draws?: number;
  losses?: number;
  points?: number;
  seasons: string[];
  seasonDetails?: ManagerSeasonDetail[];
}

export interface OranitDataset {
  teamId: number;
  teamName: string;
  source: string;
  scrapedAt: string;
  players: OranitPlayer[];
  managers?: OranitManager[];
}

export interface PlayerMetrics extends OranitPlayer {
  totalCards: number;
  goalsPer90: number;
  cardsPerMatch: number;
  minutesPerCard: number | null;
}
