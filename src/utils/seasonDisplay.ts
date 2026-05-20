/** Extract start year from IFA label e.g. "2023/2024" -> 2023 */
function seasonStartYear(label: string): number | null {
  const match = label.match(/^(\d{4})/);
  return match ? parseInt(match[1], 10) : null;
}

/** Compact range for mobile: "2011 – 2026" */
export function formatYearsActive(seasons: string[]): string {
  if (seasons.length === 0) return "—";

  const years = seasons
    .map(seasonStartYear)
    .filter((y): y is number => y !== null);

  if (years.length === 0) return seasons[0];

  const min = Math.min(...years);
  const max = Math.max(...years);
  return min === max ? String(min) : `${min} – ${max}`;
}
