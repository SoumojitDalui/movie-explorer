"use client";

import type { MovieSearchResult } from "@/lib/types";
import { cleanTitle, getYear } from "@/lib/format";
import { getPosterUrl } from "@/lib/poster";
import { useFavorites } from "@/components/favorites/FavoritesProvider";

export function MovieCard({ movie, onClick }: { movie: MovieSearchResult; onClick: () => void }) {
  const year = getYear(movie.releaseDate);
  const poster = getPosterUrl(movie.posterPath, "w154");
  const { isFavorite, toggleFavorite } = useFavorites();
  const fav = isFavorite(movie.id);
  const title = cleanTitle(movie.title);

  return (
    <div className="card" role="listitem" tabIndex={0} onClick={onClick} onKeyDown={(e) => e.key === "Enter" && onClick()}>
      <button
        type="button"
        className={`heartBtn ${fav ? "active" : ""}`}
        aria-label={fav ? `Remove ${title} from favorites` : `Add ${title} to favorites`}
        onClick={(e) => {
          e.stopPropagation();
          toggleFavorite(movie);
          if (fav && e.detail > 0) {
            (e.currentTarget as HTMLButtonElement).blur();
          }
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
        }}
      >
        {fav ? "♥" : "♡"}
      </button>
      <div className="poster">
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt={`${title} poster`} width={104} height={156} />
        ) : (
          <span>No poster</span>
        )}
      </div>
      <div className="cardContent">
        <p className="cardTitle">{title}</p>
        <p className="cardMeta">{year ?? "-"}</p>
        <p className="cardOverview">{movie.overview || "No description available."}</p>
      </div>
    </div>
  );
}
