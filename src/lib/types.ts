export type MovieSearchResult = {
  id: number;
  title: string;
  overview: string;
  releaseDate: string | null;
  posterPath: string | null;
};

export type MovieDetails = MovieSearchResult & {
  runtimeMinutes: number | null;
};

export type FavoriteMovie = MovieSearchResult & {
  rating: 1 | 2 | 3 | 4 | 5 | null;
  note: string;
  addedAt: string;
};
