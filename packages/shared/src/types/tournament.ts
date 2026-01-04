// Tournament types
export const TOURNAMENT_TYPES = ["bullet", "blitz", "rapid", "classical"] as const;
export type TournamentType = (typeof TOURNAMENT_TYPES)[number];

// Time controls in milliseconds
export const TIME_CONTROLS: Record<
  TournamentType,
  { initial: number; increment: number; name: string }
> = {
  bullet: { initial: 60_000, increment: 0, name: "1 min" },
  blitz: { initial: 180_000, increment: 0, name: "3 min" },
  rapid: { initial: 300_000, increment: 0, name: "5 min" },
  classical: { initial: 600_000, increment: 0, name: "10 min" },
};
