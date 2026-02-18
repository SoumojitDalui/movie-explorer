"use client";

import { getYear } from "@/lib/format";
import { getPosterUrl } from "@/lib/poster";
import { useFavorites } from "./FavoritesProvider";

export function FavoritesPanel() {
  const { favorites, loaded, updateFavorite, removeFavorite } = useFavorites();

  return (
    <div className="panel">
      <h2>Favorites</h2>
      {!loaded ? <p className="muted">Loading favorites…</p> : null}
      {loaded && favorites.length === 0 ? <p className="muted">No favorites yet. Add one from the results.</p> : null}

      <div className="favoritesList">
        {favorites.map((f) => {
          const poster = getPosterUrl(f.posterPath, "w92");
          const year = getYear(f.releaseDate);

          return (
            <div className="favItem" key={f.id}>
              <div className="favTop">
                <div className="favPoster">
                  {poster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={poster} alt={`${f.title} poster`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : null}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p className="favTitle">{f.title}</p>
                  <p className="favMeta">{year ?? "Unknown year"}</p>
                </div>
                <button className="btn danger" onClick={() => removeFavorite(f.id)} aria-label={`Remove ${f.title} from favorites`}>
                  Remove
                </button>
              </div>

              <div className="fieldRow">
                <label>
                  Rating
                  <select
                    value={f.rating}
                    onChange={(e) => updateFavorite(f.id, { rating: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 })}
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                    <option value={5}>5</option>
                  </select>
                </label>

                <label>
                  Note (optional)
                  <textarea
                    value={f.note}
                    onChange={(e) => updateFavorite(f.id, { note: e.target.value })}
                    placeholder="What did you think?"
                    maxLength={500}
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

