// Genre options. Slugs match the worker's GENRE_ID_MAP so the chip choice
// becomes the `genre` query param sent to /api/watchlist.

const GENRES = [
  { slug: "action",          name: "Action",          icon: "✦" },
  { slug: "adventure",       name: "Adventure",       icon: "✧" },
  { slug: "animation",       name: "Animation",       icon: "✺" },
  { slug: "comedy",          name: "Comedy",          icon: "☺" },
  { slug: "crime",           name: "Crime",           icon: "✚" },
  { slug: "documentary",     name: "Documentary",     icon: "▣" },
  { slug: "drama",           name: "Drama",           icon: "❖" },
  { slug: "fantasy",         name: "Fantasy",         icon: "✪" },
  { slug: "horror",          name: "Horror",          icon: "✸" },
  { slug: "mystery",         name: "Mystery",         icon: "?" },
  { slug: "romance",         name: "Romance",         icon: "♥" },
  { slug: "science-fiction", name: "Sci-Fi",          icon: "◉" },
  { slug: "thriller",        name: "Thriller",        icon: "▲" },
];

window.GENRES = GENRES;
