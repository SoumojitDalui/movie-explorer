import { NextResponse } from "next/server";
import { tmdbFetch } from "@/lib/tmdb";
import type { MovieSearchResult } from "@/lib/types";

type TmdbSearchResponse = {
  results: Array<{
    id: number;
    title: string;
    overview: string;
    release_date?: string;
    poster_path?: string | null;
  }>;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (!q) {
    return NextResponse.json({ message: "Missing query param: q" }, { status: 400 });
  }

  if (q.length < 2) {
    return NextResponse.json({ message: "Search query must be at least 2 characters." }, { status: 400 });
  }

  try {
    const data = await tmdbFetch<TmdbSearchResponse>("search/movie", {
      query: q,
      include_adult: false,
      page: 1
    });

    const results: MovieSearchResult[] = (data.results ?? []).map((m) => ({
      id: m.id,
      title: m.title,
      overview: m.overview ?? "",
      releaseDate: m.release_date ?? null,
      posterPath: m.poster_path ?? null
    }));

    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Search failed" },
      { status: 502 }
    );
  }
}

