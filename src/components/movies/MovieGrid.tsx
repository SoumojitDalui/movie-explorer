"use client";

import type { MovieSearchResult } from "@/lib/types";
import { MovieCard } from "./MovieCard";

export function MovieGrid({
  results,
  onSelect
}: {
  results: MovieSearchResult[];
  onSelect: (movie: MovieSearchResult) => void;
}) {
  return (
    <div className="grid" role="list">
      {results.map((m) => (
        <MovieCard key={m.id} movie={m} onClick={() => onSelect(m)} />
      ))}
    </div>
  );
}

