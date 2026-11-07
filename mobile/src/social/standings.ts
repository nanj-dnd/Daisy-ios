export type Result = { user_id: string; game: string; score: number; label: string };
export type Ranked = { userId: string; name: string; label: string; rank: number };
export type Standing = { userId: string; name: string; wins: number; played: number; rank: number };

/** Best first. Equal scores share a rank, so a tie is a tie and not whoever posted first. */
export function rankGame(results: Result[], names: Record<string, string>, game: string): Ranked[] {
  const sorted = results.filter((result) => result.game === game).sort((a, b) => b.score - a.score);
  return sorted.map((result) => ({
    userId: result.user_id, name: names[result.user_id] ?? 'Friend', label: result.label,
    rank: sorted.findIndex((other) => other.score === result.score) + 1,
  }));
}

/** The day's table: a win is finishing top of a game that at least two people played. */
export function dailyTable(results: Result[], names: Record<string, string>): Standing[] {
  const table = new Map<string, Standing>();
  for (const id of Object.keys(names)) table.set(id, { userId: id, name: names[id], wins: 0, played: 0, rank: 1 });
  for (const game of new Set(results.map((result) => result.game))) {
    const ranked = rankGame(results, names, game);
    for (const entry of ranked) {
      const row = table.get(entry.userId);
      if (!row) continue;
      row.played += 1;
      if (entry.rank === 1 && ranked.length > 1) row.wins += 1;
    }
  }
  const rows = [...table.values()].sort((a, b) => b.wins - a.wins || b.played - a.played || a.name.localeCompare(b.name));
  return rows.map((row) => ({ ...row, rank: rows.findIndex((other) => other.wins === row.wins && other.played === row.played) + 1 }));
}
