"use client";

import { cleanTitle, getYear } from "@/lib/format";
import { getPosterUrl } from "@/lib/poster";
import { useFavorites } from "./FavoritesProvider";

export function FavoritesPanel() {
  const { favorites, loaded, openUpdate, requestRemoveFavorite } = useFavorites();

  return (
    <div className="panel">
      <h2>Favorites</h2>
      {!loaded ? <p className="muted">Loading favorites…</p> : null}
      {loaded && favorites.length === 0 ? <p className="muted">No favorites yet. Add one from the results.</p> : null}

      <div className="favoritesList">
        {favorites.map((f) => {
          const poster = getPosterUrl(f.posterPath, "w154");
          const year = getYear(f.releaseDate);
          const title = cleanTitle(f.title);
          const ratingText = f.rating ? String(f.rating) : "-";
          const note = (f.note ?? "").trim();
          const yearText = year ?? "-";

          return (
            <div className="favItem" key={f.id}>
              <div className="favTop">
                <div className="favPoster">
                  {poster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={poster} alt={`${title} poster`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : null}
                </div>
                <div className="favStack">
                  <div className="favTopText">
                    <p className="favTitle">{title}</p>
                    <p className="favMeta">{yearText}</p>
                    <p className="favMeta">Rating: {ratingText}</p>
                  </div>
                  {note ? <p className="favNoteRow">{note}</p> : null}
                  <div className="favActions">
                    <button
                      className="btn secondary"
                      onClick={() => openUpdate(f.id)}
                      aria-label={`Update ${title} favorite details`}
                    >
                      Update
                  </button>
                    <button
                      className="btn danger"
                      onClick={() => requestRemoveFavorite(f.id)}
                      aria-label={`Remove ${title} from favorites`}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
