"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FavoritesProvider } from "@/components/favorites/FavoritesProvider";
import { FavoritesPanel } from "@/components/favorites/FavoritesPanel";
import { MovieDetailsModal } from "@/components/movies/MovieDetailsModal";
import { MovieGrid } from "@/components/movies/MovieGrid";
import { MovieGridSkeleton } from "@/components/movies/MovieSkeleton";
import type { MovieSearchResult } from "@/lib/types";

type SearchMode = "infinite" | "paged";
const SEARCH_MODE_KEY = "movie-explorer:search-mode:v1";

function completenessScore(m: MovieSearchResult) {
  let score = 0;
  if (m.posterPath) score += 2;
  if (m.releaseDate) score += 1;
  if (m.overview?.trim()) score += 1;
  return score;
}

function dedupeById(list: MovieSearchResult[]) {
  const seen = new Set<number>();
  return list.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
}

type PaginationItem = { type: "page"; page: number } | { type: "ellipsis"; min: number; max: number };

// Builds a compact pager like: 1,2,3,…,500 or 1,…,3,4,5,…,500.
function buildPaginationItems(current: number, total: number): PaginationItem[] {
  const items: PaginationItem[] = [];
  if (total <= 5) {
    for (let p = 1; p <= total; p++) items.push({ type: "page", page: p });
    return items;
  }

  const clamped = Math.min(Math.max(current, 1), total);
  const atStart = clamped <= 3;
  const atEnd = clamped >= total - 2;

  items.push({ type: "page", page: 1 });

  if (atStart) {
    items.push({ type: "page", page: 2 });
    items.push({ type: "page", page: 3 });
    items.push({ type: "ellipsis", min: 4, max: total - 1 });
    items.push({ type: "page", page: total });
    return items;
  }

  if (atEnd) {
    items.push({ type: "ellipsis", min: 2, max: total - 3 });
    items.push({ type: "page", page: total - 2 });
    items.push({ type: "page", page: total - 1 });
    items.push({ type: "page", page: total });
    return items;
  }

  items.push({ type: "ellipsis", min: 2, max: clamped - 2 });
  items.push({ type: "page", page: clamped - 1 });
  items.push({ type: "page", page: clamped });
  items.push({ type: "page", page: clamped + 1 });
  items.push({ type: "ellipsis", min: clamped + 2, max: total - 1 });
  items.push({ type: "page", page: total });
  return items;
}

function HomeInner() {
  const [mode, setMode] = useState<SearchMode>("paged");
  const [isTouch, setIsTouch] = useState(false);
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [results, setResults] = useState<MovieSearchResult[]>([]);
  const [selected, setSelected] = useState<MovieSearchResult | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [jump, setJump] = useState<{ min: number; max: number; value: string } | null>(null);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const inFlight = useRef<AbortController | null>(null);
  const loadingMorePageRef = useRef<number | null>(null);

  const trimmed = useMemo(() => query.trim(), [query]);
  const isInitialLoading = isSearching || (isLoadingMore && results.length === 0);

  useEffect(() => {
    const media = window.matchMedia("(hover: none), (pointer: coarse)");

    const apply = () => {
      const touch = media.matches;
      setIsTouch(touch);

      // On touch devices, keep paging (infinite scroll gets jumpy and hard to control).
      if (touch) {
        setMode("paged");
        localStorage.setItem(SEARCH_MODE_KEY, "paged");
        return;
      }

      const raw = localStorage.getItem(SEARCH_MODE_KEY);
      if (raw === "paged" || raw === "infinite") setMode(raw);
    };

    apply();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", apply);
      return () => media.removeEventListener("change", apply);
    }

    // Safari fallback
    // eslint-disable-next-line deprecation/deprecation
    media.addListener(apply);
    // eslint-disable-next-line deprecation/deprecation
    return () => media.removeListener(apply);
  }, []);

  useEffect(() => {
    if (isTouch) return;
    localStorage.setItem(SEARCH_MODE_KEY, mode);
  }, [mode, isTouch]);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 40);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function fetchPage(q: string, pageToFetch: number, mode: "replace" | "append") {
    // Abort any in-flight search to avoid out-of-order updates.
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;

    try {
      const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(q)}&page=${pageToFetch}`, {
        signal: controller.signal
      });
      const data = (await res.json()) as {
        results?: MovieSearchResult[];
        message?: string;
        page?: number;
        totalPages?: number;
      };
      if (!res.ok) throw new Error(data.message ?? "Search failed");

      // Rank within a page by "completeness" so nicer cards appear first.
      const raw = data.results ?? [];
      const ranked = raw
        .map((m, idx) => ({ m, idx }))
        .sort((a, b) => completenessScore(b.m) - completenessScore(a.m) || a.idx - b.idx)
        .map((x) => x.m);

      const dedupedRanked = dedupeById(ranked);
      setResults((prev) => {
        if (mode === "replace") return dedupedRanked;
        const existing = new Set(prev.map((m) => m.id));
        const nextUnique = dedupedRanked.filter((m) => !existing.has(m.id));
        return nextUnique.length ? [...prev, ...nextUnique] : prev;
      });

      const nextPage = data.page ?? pageToFetch;
      const totalPages = data.totalPages ?? nextPage;
      setPage(nextPage);
      setHasMore(nextPage < totalPages);
      setTotalPages(totalPages);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      throw err;
    } finally {
      if (inFlight.current === controller) inFlight.current = null;
    }
  }

  async function goToPage(nextPage: number) {
    if (!activeQuery) return;
    if (nextPage < 1) return;
    if (totalPages && nextPage > totalPages) return;

    setIsLoadingMore(true);
    setLoadMoreError(null);
    try {
      await fetchPage(activeQuery, nextPage, "replace");
    } catch (err) {
      setLoadMoreError(err instanceof Error ? err.message : "Failed to load page");
    } finally {
      setIsLoadingMore(false);
    }
  }

  function promptForPage(min: number, max: number) {
    const current = page || 1;
    const seed = String(Math.min(Math.max(current, min), max));
    setJump({ min, max, value: seed });
  }

  function setSearchMode(next: SearchMode) {
    if (isTouch) return;
    setMode(next);
    if (!activeQuery) return;

    if (next === "paged") {
      setResults([]);
      setPage(0);
      setHasMore(false);
      setLoadMoreError(null);
      loadingMorePageRef.current = null;
      goToPage(1);
    }
  }

  async function onSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const q = trimmed;
    if (!q) {
      setResults([]);
      setActiveQuery(null);
      setPage(0);
      setHasMore(false);
      setTotalPages(0);
      loadingMorePageRef.current = null;
      setSearchError("Type a movie title to search.");
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setLoadMoreError(null);
    setResults([]);
    setActiveQuery(q);
    setPage(0);
    setHasMore(false);
    setTotalPages(0);
    loadingMorePageRef.current = null;

    try {
      await fetchPage(q, 1, "replace");
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Search failed");
      setHasMore(false);
    } finally {
      setIsSearching(false);
    }
  }

  useEffect(() => {
    if (!activeQuery) return;
    if (mode !== "infinite") return;
    if (!hasMore) return;
    if (isSearching || isLoadingMore) return;
    if (!sentinelRef.current) return;

    const el = sentinelRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        const next = page + 1;
        if (loadingMorePageRef.current === next) return;
        loadingMorePageRef.current = next;
        setIsLoadingMore(true);
        setLoadMoreError(null);
        fetchPage(activeQuery, next, "append")
          .catch((err) => {
            setLoadMoreError(err instanceof Error ? err.message : "Failed to load more");
          })
          .finally(() => {
            loadingMorePageRef.current = null;
            setIsLoadingMore(false);
          });
      },
      { root: null, rootMargin: "350px 0px", threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [activeQuery, hasMore, isSearching, isLoadingMore, page]);

  return (
    <div className="container">
      <div className="header">
        <div>
          <h1>🎬 Movie Explorer</h1>
          <p>Find films fast, open full details, then save favorites with your own rating and a short note.</p>
        </div>
      </div>

      <div className={scrolled ? "stickySearchBar" : "searchSection"} style={{ marginBottom: 16 }}>
        <form className="searchBar" onSubmit={onSearch}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try: Inception, The Matrix, Parasite…"
            aria-label="Search movies by title"
          />
          <button className="btn searchBtn" type="submit" disabled={isSearching}>
            {isSearching ? "Searching…" : "Search"}
          </button>
        </form>
        <div className="searchOptions">
          {!isTouch ? (
            <label className="switch">
              <span className={`switchLabel ${mode === "paged" ? "active" : ""}`}>Paging</span>
              <input
                type="checkbox"
                checked={mode === "infinite"}
                onChange={(e) => setSearchMode(e.target.checked ? "infinite" : "paged")}
                aria-label="Toggle infinite scroll mode"
              />
              <span className="track" aria-hidden="true" />
              <span className={`switchLabel ${mode === "infinite" ? "active" : ""}`}>Infinite</span>
            </label>
          ) : null}
        </div>
        {searchError ? (
          <div style={{ marginTop: 12 }} className="error" role="alert">
            {searchError}
          </div>
        ) : null}
      </div>

      <div className="row">
        <div className="panel">
          <h2>Results</h2>
          {isInitialLoading ? <MovieGridSkeleton count={4} /> : null}
          {!isInitialLoading && !searchError && activeQuery && results.length === 0 ? (
            <p className="muted">No results. Try a different title.</p>
          ) : null}
          {!activeQuery ? <p className="muted">Search to see results.</p> : null}
          {results.length > 0 ? <MovieGrid results={results} onSelect={setSelected} /> : null}
          {loadMoreError ? (
            <p className="error" role="alert" style={{ marginTop: 10 }}>
              {loadMoreError}
            </p>
          ) : null}

          {activeQuery && mode === "paged" && results.length > 0 ? (
            <div className="pager" role="navigation" aria-label="Search results pages">
              <button
                className="pagerLink"
                onClick={() => goToPage((page || 1) - 1)}
                disabled={(page || 1) <= 1 || isSearching || isLoadingMore}
              >
                Prev
              </button>

              <div className="pageList" aria-label="Page numbers">
                {buildPaginationItems(page || 1, totalPages || 1).map((item, idx) => {
                  if (item.type === "page") {
                    const isCurrent = (page || 1) === item.page;
                    return (
                      <button
                        key={`p-${item.page}-${idx}`}
                        className={`pageItem ${isCurrent ? "current" : ""}`}
                        onClick={() => goToPage(item.page)}
                        disabled={isCurrent || isSearching || isLoadingMore}
                        aria-current={isCurrent ? "page" : undefined}
                      >
                        {item.page}
                      </button>
                    );
                  }

                  return (
                    <button
                      key={`e-${item.min}-${item.max}-${idx}`}
                      className="pageEllipsis"
                      onClick={() => promptForPage(item.min, item.max)}
                      disabled={isSearching || isLoadingMore || item.max < item.min}
                      aria-label="Jump to a page"
                      title="Jump to page"
                    >
                      …
                    </button>
                  );
                })}
              </div>

              <button
                className="pagerLink"
                onClick={() => goToPage((page || 1) + 1)}
                disabled={!hasMore || isSearching || isLoadingMore}
              >
                Next
              </button>
            </div>
          ) : null}

          {results.length > 0 ? <div ref={sentinelRef} style={{ height: 1 }} /> : null}
          {isLoadingMore ? (
            <div style={{ marginTop: 14 }}>
              <MovieGridSkeleton count={2} />
            </div>
          ) : null}
        </div>

        <FavoritesPanel />
      </div>

      <MovieDetailsModal movie={selected} onClose={() => setSelected(null)} />

      {jump ? (
        <div className="modalOverlay" role="dialog" aria-modal="true" aria-label="Jump to page" onMouseDown={() => setJump(null)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()} style={{ width: "min(420px, 100%)" }}>
            <div className="modalHeader">
              <h3>
                Go to page ({jump.min}–{jump.max})
              </h3>
            </div>
            <div className="fieldRow" style={{ padding: 14, gap: 12 }}>
              <label>
                Page number
                <input
                  inputMode="numeric"
                  value={jump.value}
                  onChange={(e) => setJump((prev) => (prev ? { ...prev, value: e.target.value } : prev))}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    const n = Number(jump.value.trim());
                    if (!Number.isInteger(n) || n < jump.min || n > jump.max) {
                      setLoadMoreError(`Enter a whole number between ${jump.min} and ${jump.max}.`);
                      return;
                    }
                    setJump(null);
                    goToPage(n);
                  }}
                />
              </label>
              <div className="modalFooter">
                <button className="btn secondary" onClick={() => setJump(null)}>
                  Cancel
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    const n = Number(jump.value.trim());
                    if (!Number.isInteger(n) || n < jump.min || n > jump.max) {
                      setLoadMoreError(`Enter a whole number between ${jump.min} and ${jump.max}.`);
                      return;
                    }
                    setJump(null);
                    goToPage(n);
                  }}
                >
                  Go
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
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
