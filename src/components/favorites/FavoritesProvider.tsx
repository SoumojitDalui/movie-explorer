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
  updateFavorite: (id: number, patch: Partial<Pick<FavoriteMovie, "rating" | "note">>) => void;
  removeFavorite: (id: number) => void;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function safeParseFavorites(raw: string | null): FavoriteMovie[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return v
      .filter((x) => x && typeof x === "object")
      .map((x) => x as FavoriteMovie)
      .filter((x) => typeof x.id === "number" && typeof x.title === "string");
  } catch {
    return [];
  }
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteMovie[]>([]);
  const [loaded, setLoaded] = useState(false);
  const didInit = useRef(false);

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

  const value = useMemo<FavoritesContextValue>(() => {
    return {
      favorites,
      loaded,
      isFavorite: (id) => favorites.some((f) => f.id === id),
      toggleFavorite: (movie) => {
        setFavorites((prev) => {
          const existing = prev.find((f) => f.id === movie.id);
          if (existing) return prev.filter((f) => f.id !== movie.id);
          const next: FavoriteMovie = {
            id: movie.id,
            title: movie.title,
            overview: movie.overview ?? "",
            releaseDate: movie.releaseDate ?? null,
            posterPath: movie.posterPath ?? null,
            rating: 3,
            note: "",
            addedAt: new Date().toISOString()
          };
          return [next, ...prev];
        });
      },
      updateFavorite: (id, patch) => {
        setFavorites((prev) =>
          prev.map((f) =>
            f.id === id
              ? {
                  ...f,
                  rating: patch.rating ?? f.rating,
                  note: patch.note !== undefined ? clampNote(patch.note) : f.note
                }
              : f
          )
        );
      },
      removeFavorite: (id) => setFavorites((prev) => prev.filter((f) => f.id !== id))
    };
  }, [favorites, loaded]);

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
}
