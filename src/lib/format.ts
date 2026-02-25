export function getYear(releaseDate: string | null | undefined) {
  if (!releaseDate) return null;
  const year = releaseDate.slice(0, 4);
  return /^\d{4}$/.test(year) ? year : null;
}

export function cleanTitle(title: string) {
  return title.replaceAll("\"", "");
}

export function clampNote(input: string, maxLen = 500) {
  const trimmed = input.trimStart();
  return trimmed.length > maxLen ? trimmed.slice(0, maxLen) : trimmed;
}
