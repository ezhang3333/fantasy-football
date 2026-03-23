import type { BatchInfo } from './types.ts';

function timeAgo(isoString: string): string {
  const then = new Date(isoString).getTime();
  if (Number.isNaN(then)) return "unknown";
  const seconds = Math.floor((Date.now() - then) / 1000);

  const units: [string, number][] = [
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
    ["second", 1],
  ];

  for (const [name, secs] of units) {
    if (seconds >= secs) {
      const value = Math.floor(seconds / secs);
      return `${value} ${name}${value !== 1 ? "s" : ""} ago`;
    }
  }
  return "just now";
}

interface HistoryListItemProps {
  batchData: BatchInfo;
  handleClick: (batchUuid: string) => void;
  isSelected: boolean;
}

export default function HistoryListItem({
  batchData,
  handleClick,
  isSelected,
}: HistoryListItemProps) {
  let positionsLabel = "Unknown";
  try {
    const positions = JSON.parse(batchData.positions ?? "[]") as unknown;
    if (Array.isArray(positions) && positions.length > 0) {
      positionsLabel = (positions as string[]).join(", ");
    }
  } catch {
    positionsLabel = "Unknown";
  }

  const label = `${positionsLabel} - ${timeAgo(batchData.created_at)}`;
  return (
    <div
      className="history-row"
      onClick={() => handleClick(batchData.batch_uuid)}
      data-selected={isSelected ? "true" : "false"}
    >
      <div className="history-label">{label}</div>
    </div>
  );
}
