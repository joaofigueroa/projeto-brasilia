export function periodLabel(years: number[]) {
  const sorted = [...new Set(years)].sort((a, b) => a - b);
  if (sorted.length === 1) return String(sorted[0]);
  return sorted.every((year, index) => !index || year === sorted[index - 1] + 1)
    ? `${sorted[0]}–${sorted[sorted.length - 1]}`
    : sorted.join(", ");
}
