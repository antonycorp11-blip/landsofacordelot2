/** Formatação do tempo do mundo. Viagens longas são contadas em dias. */
export function formatDuration(hours: number): string {
  if (hours < 24) return `${hours.toFixed(1)}h`;
  const days = Math.floor(hours / 24);
  const rest = Math.round(hours % 24);
  return rest ? `${days}d ${rest}h` : `${days}d`;
}
