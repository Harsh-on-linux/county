export type ScanRange = { from: string; to: string };
export function scanBounds(range: ScanRange) {
  const start = new Date(range.from + "T00:00:00"),
    end = new Date(range.to + "T00:00:00");
  if (
    ![range.from, range.to].every((s) => /^\d{4}-\d{2}-\d{2}$/.test(s)) ||
    !Number.isFinite(+start) ||
    !Number.isFinite(+end) ||
    start.toLocaleDateString("en-CA") !== range.from ||
    end.toLocaleDateString("en-CA") !== range.to ||
    start > end
  )
    throw new Error("Choose a valid start and end date.");
  end.setDate(end.getDate() + 1);
  return { since: +start, until: +end };
}
