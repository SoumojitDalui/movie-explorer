import { NextResponse } from "next/server";
import { tmdbFetch } from "@/lib/tmdb";
import type { MovieSearchResult } from "@/lib/types";

type TmdbSearchResponse = {
  page: number;
  results: Array<{
    id: number;
    title: string;
    original_title?: string;
    overview: string;
    release_date?: string;
    poster_path?: string | null;
  }>;
  total_pages: number;
  total_results: number;
};

function normalizeForIncludes(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/["“”]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const pageParam = (searchParams.get("page") ?? "1").trim();
  const requestedPage = Number(pageParam);

  if (!q) {
    return NextResponse.json({ message: "Missing query param: q" }, { status: 400 });
  }

  if (!Number.isInteger(requestedPage) || requestedPage < 1 || requestedPage > 500) {
    return NextResponse.json({ message: "Invalid page param. Must be an integer between 1 and 500." }, { status: 400 });
  }

  try {
    const normalizedQ = normalizeForIncludes(q);
    // For 1–2 character queries, only allow exact title matches (case/diacritics-insensitive) and force page 1.
    const strict = normalizedQ.length > 0 && normalizedQ.length < 3;
    const page = strict ? 1 : requestedPage;

    const data = await tmdbFetch<TmdbSearchResponse>("search/movie", {
      query: q,
      include_adult: false,
      page
    });

    const mapped = (data.results ?? []).map((m) => ({
      id: m.id,
      title: m.title,
      originalTitle: m.original_title ?? "",
      overview: m.overview ?? "",
      releaseDate: m.release_date ?? null,
      posterPath: m.poster_path ?? null
    }));

    const filtered = strict
      ? mapped.filter((m) => {
          const title = normalizeForIncludes(m.title);
          const originalTitle = normalizeForIncludes(m.originalTitle);
          return title === normalizedQ || originalTitle === normalizedQ;
        })
      : mapped;

    const results: MovieSearchResult[] = filtered.map((m) => ({
      id: m.id,
      title: m.title,
      overview: m.overview,
      releaseDate: m.releaseDate,
      posterPath: m.posterPath
    }));

    return NextResponse.json(
      strict
        ? { page: 1, totalPages: 1, totalResults: results.length, results }
        : {
            page: data.page ?? page,
            totalPages: data.total_pages ?? 1,
            totalResults: data.total_results ?? results.length,
            results
          }
    );
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Search failed" },
      { status: 502 }
    );
  }
}
