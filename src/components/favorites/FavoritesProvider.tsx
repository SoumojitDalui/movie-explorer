"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { FavoriteMovie, MovieSearchResult } from "@/lib/types";
import { clampNote } from "@/lib/format";

const STORAGE_KEY = "movie-explorer:favorites:v1";

type FavoritesContextValue = {
  favorites: FavoriteMovie[];
  loaded: boolean;
  isFavorite: (id: number) => boolean;
  toggleFavorite: (movie: MovieSearchResult) => void;
  openUpdate: (id: number) => void;
  requestRemoveFavorite: (id: number) => void;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function safeParseFavorites(raw: string | null): FavoriteMovie[] {
  if (!raw) return [];
  try {
    // LocalStorage data is user-controlled; normalize defensively.
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return v
      .filter((x) => x && typeof x === "object")
      .map((x) => x as FavoriteMovie)
      .filter((x) => typeof x.id === "number" && typeof x.title === "string")
      .map((x) => {
        const ratingNum = typeof (x as any).rating === "number" ? Number((x as any).rating) : null;
        const rating =
          ratingNum === 1 || ratingNum === 2 || ratingNum === 3 || ratingNum === 4 || ratingNum === 5 ? ratingNum : null;
        return {
          ...x,
          rating,
          note: typeof (x as any).note === "string" ? (x as any).note : "",
          addedAt: typeof (x as any).addedAt === "string" ? (x as any).addedAt : new Date().toISOString()
        } satisfies FavoriteMovie;
      });
  } catch {
    return [];
  }
}

type EditorState = {
  movie: MovieSearchResult;
  rating: FavoriteMovie["rating"];
  note: string;
  existingAddedAt?: string;
};

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteMovie[]>([]);
  const [loaded, setLoaded] = useState(false);
  const didInit = useRef(false);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [removeConfirm, setRemoveConfirm] = useState<{ id: number; title: string; releaseDate: string | null } | null>(
    null
  );

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    setFavorites(safeParseFavorites(localStorage.getItem(STORAGE_KEY)));
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites, loaded]);

  function upsertFavorite(movie: MovieSearchResult, rating: FavoriteMovie["rating"], note: string, existingAddedAt?: string) {
    setFavorites((prev) => {
      const next: FavoriteMovie = {
        id: movie.id,
        title: movie.title,
        overview: movie.overview ?? "",
        releaseDate: movie.releaseDate ?? null,
        posterPath: movie.posterPath ?? null,
        rating,
        note: clampNote(note),
        addedAt: existingAddedAt ?? new Date().toISOString()
      };

      const without = prev.filter((f) => f.id !== movie.id);
      return [next, ...without];
    });
  }

  const value = useMemo<FavoritesContextValue>(() => {
    return {
      favorites,
      loaded,
      isFavorite: (id) => favorites.some((f) => f.id === id),
      toggleFavorite: (movie) => {
        const existing = favorites.find((f) => f.id === movie.id);
        if (existing) {
          const hasData = existing.rating !== null || (existing.note ?? "").trim().length > 0;
          if (hasData) {
            setEditor(null);
            setRemoveConfirm({ id: existing.id, title: existing.title, releaseDate: existing.releaseDate ?? null });
          } else {
            setFavorites((prev) => prev.filter((f) => f.id !== movie.id));
          }
          return;
        }
        setRemoveConfirm(null);
        setEditor({ movie, rating: null, note: "" });
      },
      openUpdate: (id) => {
        const existing = favorites.find((f) => f.id === id);
        if (!existing) return;
        setRemoveConfirm(null);
        setEditor({
          movie: existing,
          rating: existing.rating ?? null,
          note: existing.note ?? "",
          existingAddedAt: existing.addedAt
        });
      },
      requestRemoveFavorite: (id) => {
        const existing = favorites.find((f) => f.id === id);
        if (!existing) {
          setFavorites((prev) => prev.filter((f) => f.id !== id));
          return;
        }
        const hasData = existing.rating !== null || (existing.note ?? "").trim().length > 0;
        if (hasData) {
          setEditor(null);
          setRemoveConfirm({ id: existing.id, title: existing.title, releaseDate: existing.releaseDate ?? null });
          return;
        }
        setFavorites((prev) => prev.filter((f) => f.id !== id));
      }
    };
  }, [favorites, loaded]);

  return (
    <FavoritesContext.Provider value={value}>
      {children}
      {removeConfirm ? (
        <div
          className="modalOverlay"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm remove favorite"
          onMouseDown={() => setRemoveConfirm(null)}
        >
          <div className="modal" onMouseDown={(e) => e.stopPropagation()} style={{ width: "min(360px, 100%)" }}>
            <div className="modalHeader">
              <h3>
                Are you sure you want to remove{" "}
                <strong>
                  {removeConfirm.title}
                  {removeConfirm.releaseDate ? ` (${removeConfirm.releaseDate.slice(0, 4)})` : ""}
                </strong>{" "}
                from favorites?
              </h3>
            </div>
            <div className="modalFooter">
              <button className="btn secondary" onClick={() => setRemoveConfirm(null)}>
                No
              </button>
              <button
                className="btn danger"
                onClick={() => {
                  setFavorites((prev) => prev.filter((f) => f.id !== removeConfirm.id));
                  setRemoveConfirm(null);
                }}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {editor ? (
        <div
          className="modalOverlay"
          role="dialog"
          aria-modal="true"
          aria-label="Favorite details"
          onMouseDown={() => setEditor(null)}
        >
          <div className="modal" onMouseDown={(e) => e.stopPropagation()} style={{ width: "min(720px, 100%)" }}>
            <div className="modalHeader">
              <h3>{favorites.some((f) => f.id === editor.movie.id) ? "Update favorite" : "Add to favorites"}</h3>
            </div>
            <div style={{ padding: 14, gap: 12 }} className="fieldRow">
              <p className="favModalTitle" style={{ margin: 0 }}>
                {editor.movie.title}
              </p>
              <label>
                Rating (optional)
                <select
                  value={editor.rating ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setEditor((prev) => {
                      if (!prev) return prev;
                      const ratingNum = v === "" ? null : (Number(v) as 1 | 2 | 3 | 4 | 5);
                      return { ...prev, rating: ratingNum };
                    });
                  }}
                >
                  <option value="">-</option>
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
                  value={editor.note}
                  onChange={(e) => setEditor((prev) => (prev ? { ...prev, note: e.target.value } : prev))}
                  placeholder="What did you think?"
                  maxLength={500}
                />
              </label>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button className="btn secondary" onClick={() => setEditor(null)}>
                  Cancel
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    upsertFavorite(editor.movie, editor.rating, editor.note, editor.existingAddedAt);
                    setEditor(null);
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
}
