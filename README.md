# Movie Explorer

Search movies, view details, and save favorites with a personal rating (1–5) and optional note.

## Hosted App

Add your deployed URL here (Vercel recommended): `https://movie-explorer-hpkh.vercel.app`

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

- Search ranking and strict mode are simplified (1–2 character searches use exact-title matching to reduce noisy results).
- Favorites are local-only (LocalStorage) and not synced across devices.
- No auth/user accounts.
- Basic UI polish only; could improve accessibility (focus management, ARIA), add keyboard shortcuts, and add better empty/loading states.
- Could add caching, debouncing, and more robust request cancellation across all endpoints.
