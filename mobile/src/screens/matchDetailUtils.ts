export function parseMatchId(value: string): number | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  const id = Number.parseInt(value, 10);
  if (id <= 0) {
    return null;
  }

  return id;
}
