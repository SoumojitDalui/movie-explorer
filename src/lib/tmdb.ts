type TmdbAuth =
  | { kind: "bearer"; token: string }
  | { kind: "apiKey"; apiKey: string }
  | { kind: "none" };

function getTmdbAuth(): TmdbAuth {
  const token = process.env.TMDB_READ_ACCESS_TOKEN?.trim();
  if (token) return { kind: "bearer", token };

  const apiKey = process.env.TMDB_API_KEY?.trim();
  if (apiKey) return { kind: "apiKey", apiKey };

  return { kind: "none" };
}

export async function tmdbFetch<T>(path: string, params: Record<string, string | number | boolean | undefined> = {}) {
  const auth = getTmdbAuth();
  if (auth.kind === "none") {
    throw new Error("Missing TMDB credentials. Set TMDB_READ_ACCESS_TOKEN or TMDB_API_KEY in .env.local.");
  }

  const url = new URL(`https://api.themoviedb.org/3/${path.replace(/^\//, "")}`);
  url.searchParams.set("language", "en-US");

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    url.searchParams.set(key, String(value));
  }

  if (auth.kind === "apiKey") {
    url.searchParams.set("api_key", auth.apiKey);
  }

  const res = await fetch(url, {
    headers: auth.kind === "bearer" ? { Authorization: `Bearer ${auth.token}` } : undefined,
    cache: "no-store"
  });

  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore parse errors
  }

  if (!res.ok) {
    const message =
      typeof (json as any)?.status_message === "string"
        ? (json as any).status_message
        : `TMDB request failed (${res.status})`;
    throw new Error(message);
  }

  return json as T;
}
