"use client";

import type { MovieSearchResult } from "@/lib/types";
import { getYear } from "@/lib/format";
import { getPosterUrl } from "@/lib/poster";

export function MovieCard({ movie, onClick }: { movie: MovieSearchResult; onClick: () => void }) {
  const year = getYear(movie.releaseDate);
  const poster = getPosterUrl(movie.posterPath, "w154");

  return (
    <div className="card" role="listitem" tabIndex={0} onClick={onClick} onKeyDown={(e) => e.key === "Enter" && onClick()}>
      <div className="poster">
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt={`${movie.title} poster`} width={84} height={112} />
        ) : (
          <span>No poster</span>
        )}
      </div>
      <div className="cardContent">
        <p className="cardTitle">{movie.title}</p>
        <p className="cardMeta">{year ?? "Unknown year"}</p>
        <p className="cardOverview">{movie.overview || "No description available."}</p>
      </div>
    </div>
  );
}
