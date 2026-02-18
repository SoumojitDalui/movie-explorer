"use client";

import { useMemo, useState } from "react";
import { FavoritesProvider } from "@/components/favorites/FavoritesProvider";
import { FavoritesPanel } from "@/components/favorites/FavoritesPanel";
import { MovieDetailsModal } from "@/components/movies/MovieDetailsModal";
import { MovieGrid } from "@/components/movies/MovieGrid";
import type { MovieSearchResult } from "@/lib/types";

function HomeInner() {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<MovieSearchResult[]>([]);
  const [selected, setSelected] = useState<MovieSearchResult | null>(null);

  const trimmed = useMemo(() => query.trim(), [query]);

  async function onSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const q = trimmed;
    if (!q) {
      setResults([]);
      setSearchError("Type a movie title to search.");
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setResults([]);

    try {
      const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as { results?: MovieSearchResult[]; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Search failed");
      setResults(data.results ?? []);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="container">
      <div className="header">
        <div>
          <h1>Movie Explorer</h1>
          <p>Search → open details → favorite → add rating &amp; note (saved in LocalStorage).</p>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <h2>Search</h2>
        <form className="searchBar" onSubmit={onSearch}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try: Inception, The Matrix, Parasite…"
            aria-label="Search movies by title"
          />
          <button className="btn" type="submit" disabled={isSearching}>
            {isSearching ? "Searching…" : "Search"}
          </button>
        </form>
        {searchError ? (
          <div style={{ marginTop: 12 }} className="error" role="alert">
            {searchError}
          </div>
        ) : null}
      </div>

      <div className="row">
        <div className="panel">
          <h2>Results</h2>
          {isSearching ? <p className="muted">Loading…</p> : null}
          {!isSearching && !searchError && trimmed && results.length === 0 ? (
            <p className="muted">No results. Try a different title.</p>
          ) : null}
          {!trimmed ? <p className="muted">Search to see results.</p> : null}
          {results.length > 0 ? (
            <MovieGrid results={results} onSelect={setSelected} />
          ) : null}
        </div>

        <FavoritesPanel />
      </div>

      <MovieDetailsModal movie={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

export default function HomePage() {
  return (
    <FavoritesProvider>
      <HomeInner />
    </FavoritesProvider>
  );
}
