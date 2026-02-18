export function getPosterUrl(
  path: string | null | undefined,
  size: "w92" | "w154" | "w342" | "w500" = "w342"
) {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

