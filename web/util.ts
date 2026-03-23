import type { PlayerPrediction } from './types.ts';

export function formatOneDecimal(value: number | string | null | undefined): string {
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(1) : "N/A";
}

export function getRowKey(row: PlayerPrediction, index: number): string {
  if (row.gsis_id) {
    return `${row.gsis_id}-${row.season ?? "s"}-${row.week ?? "w"}`;
  }
  return `${row.full_name ?? "player"}-${row.team ?? "team"}-${index}`;
}
