import { NextResponse } from "next/server";
import { tmdbFetch } from "@/lib/tmdb";
import type { MovieDetails } from "@/lib/types";

type TmdbMovieDetails = {
  id: number;
  title: string;
  overview: string;
  release_date?: string;
  runtime?: number | null;
  poster_path?: string | null;
};

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const rawId = ctx.params.id;
  const id = Number(rawId);

  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ message: "Invalid movie id." }, { status: 400 });
  }

  try {
    const m = await tmdbFetch<TmdbMovieDetails>(`movie/${id}`);
    const movie: MovieDetails = {
      id: m.id,
      title: m.title,
      overview: m.overview ?? "",
      releaseDate: m.release_date ?? null,
      posterPath: m.poster_path ?? null,
      runtimeMinutes: m.runtime ?? null
    };
    return NextResponse.json({ movie });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Failed to load movie details" },
      { status: 502 }
    );
  }
}

