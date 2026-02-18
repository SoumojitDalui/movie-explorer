# Movie Explorer

Search movies, view details, and save favorites with a personal rating (1–5) and optional note.

## Hosted App

Not deployed yet (per current scope). Run locally using the instructions below.

## Setup

1) Install dependencies:

```bash
npm install
```

2) Configure TMDB credentials (kept server-side via API routes):

```bash
cp .env.local.example .env.local
```

Then set **one** of:

- `TMDB_READ_ACCESS_TOKEN` (TMDB v4 read access token, recommended), or
- `TMDB_API_KEY` (TMDB v3 API key)

3) Run locally:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Technical Decisions & Tradeoffs

- **API proxy**: The browser calls `/api/tmdb/*` so the TMDB key/token stays in `.env.local` and is never shipped to the client.
- **State management**: Simple React hooks + a `FavoritesProvider` (no external state libs) to keep the prototype understandable and interview-friendly.
- **Persistence**: LocalStorage baseline only (fast to implement; no auth needed). A server DB/API route would be the next step if multi-device sync mattered.

## Known Limitations / Next Improvements

- No pagination/infinite scroll; search returns the first TMDB page only.
- Favorites are per-browser (LocalStorage) and not synced.
- Basic styling only (focus on functionality); could add skeleton loading, better responsive layout, accessibility pass.
- Could add caching / debounce / request cancellation to reduce API traffic.
