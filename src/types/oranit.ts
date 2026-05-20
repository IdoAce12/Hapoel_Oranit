export interface OranitPlayer {
  playerId: string;
  name: string;
  goals: number;
  caps: number;
  yellowCards: number;
  redCards: number;
  minutesPlayed: number;
  seasons: string[];
}

export interface OranitDataset {
  teamId: number;
  teamName: string;
  source: string;
  scrapedAt: string;
  players: OranitPlayer[];
}

export interface PlayerMetrics extends OranitPlayer {
  totalCards: number;
  goalsPer90: number;
  cardsPerMatch: number;
  minutesPerCard: number | null;
}
