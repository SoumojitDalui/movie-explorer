"use client";

import { useEffect, useMemo, useState } from "react";
import { getYear } from "@/lib/format";
import { getPosterUrl } from "@/lib/poster";
import type { MovieDetails, MovieSearchResult } from "@/lib/types";
import { useFavorites } from "@/components/favorites/FavoritesProvider";

export function MovieDetailsModal({
  movie,
  onClose
}: {
  movie: MovieSearchResult | null;
  onClose: () => void;
}) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const [details, setDetails] = useState<MovieDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = Boolean(movie);
  const fav = movie ? isFavorite(movie.id) : false;

  const year = useMemo(() => getYear(details?.releaseDate ?? movie?.releaseDate), [details?.releaseDate, movie?.releaseDate]);
  const poster = useMemo(() => getPosterUrl(details?.posterPath ?? movie?.posterPath, "w500"), [details?.posterPath, movie?.posterPath]);

  useEffect(() => {
    if (!movie) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetails(null);

    fetch(`/api/tmdb/movie/${movie.id}`)
      .then(async (r) => {
        const data = (await r.json()) as { movie?: MovieDetails; message?: string };
        if (!r.ok) throw new Error(data.message ?? "Failed to load details");
        return data.movie ?? null;
      })
      .then((m) => {
        if (cancelled) return;
        setDetails(m);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load details");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [movie?.id]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!movie) return null;

  const title = details?.title ?? movie.title;
  const overview = details?.overview ?? movie.overview;
  const runtime = details?.runtimeMinutes ?? null;

  return (
    <div className="modalOverlay" role="dialog" aria-modal="true" aria-label="Movie details" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <h3>{title}</h3>
          <div style={{ display: "flex", gap: 10 }}>
            <button className={`btn ${fav ? "secondary" : ""}`} onClick={() => toggleFavorite(details ?? movie)}>
              {fav ? "Remove Favorite" : "Add Favorite"}
            </button>
            <button className="btn secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div className="modalBody">
          <div className="modalPoster">
            {poster ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={poster} alt={`${title} poster`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div className="poster" style={{ width: "100%", height: "100%" }}>
                No poster
              </div>
            )}
          </div>

          <div>
            <div className="pillRow">
              <span className="pill">Year: {year ?? "—"}</span>
              <span className="pill">Runtime: {runtime ? `${runtime} min` : "—"}</span>
            </div>

            {loading ? <p className="muted">Loading details…</p> : null}
            {error ? (
              <div className="error" role="alert" style={{ marginBottom: 12 }}>
                {error}
              </div>
            ) : null}
            <p className="modalOverview">{overview || "No overview available."}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

