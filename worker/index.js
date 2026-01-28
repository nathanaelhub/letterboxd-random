// Cloudflare Worker for Letterboxd watchlist scraping

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle API requests
    if (url.pathname === '/api/watchlist') {
      return handleWatchlistAPI(request);
    }

    // For all other requests, let the assets handler take over
    return env.ASSETS.fetch(request);
  }
};

async function handleWatchlistAPI(request) {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(request.url);
  const username = url.searchParams.get('username') || url.searchParams.get('user');

  if (!username) {
    return new Response(JSON.stringify({ error: 'Username required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const allMovies = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 20) {
      const letterboxdUrl = `https://letterboxd.com/${username}/watchlist/page/${page}/`;

      const response = await fetch(letterboxdUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        }
      });

      if (!response.ok) {
        if (page === 1) {
          return new Response(JSON.stringify({ error: 'User not found or watchlist is private' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        hasMore = false;
        continue;
      }

      const html = await response.text();

      // Check for Cloudflare challenge
      if (html.includes('challenge-platform') || html.includes('Just a moment')) {
        if (page === 1) {
          return new Response(JSON.stringify({
            error: 'Letterboxd is blocking requests. Try again later.',
            cloudflare: true
          }), {
            status: 503,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        hasMore = false;
        continue;
      }

      const movies = parseMovies(html);

      if (movies.length === 0) {
        hasMore = false;
      } else {
        allMovies.push(...movies);
        page++;
      }
    }

    if (allMovies.length === 0) {
      return new Response(JSON.stringify({ error: 'Watchlist is empty or not accessible' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Return random movie or all movies
    const random = url.searchParams.get('random') === 'true';
    if (random) {
      const randomIndex = Math.floor(Math.random() * allMovies.length);
      return new Response(JSON.stringify({
        movie: allMovies[randomIndex],
        total: allMovies.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      movies: allMovies,
      total: allMovies.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

function parseMovies(html) {
  const movies = [];
  const seen = new Set();

  // Extract film slugs using regex patterns
  // Pattern 1: data-film-slug="movie-name"
  const slugPattern1 = /data-film-slug="([^"]+)"/g;
  // Pattern 2: data-item-slug="movie-name"
  const slugPattern2 = /data-item-slug="([^"]+)"/g;
  // Pattern 3: /film/movie-name/ in links
  const slugPattern3 = /href="\/film\/([^/"]+)\/"/g;

  let match;

  // Collect all slugs
  while ((match = slugPattern1.exec(html)) !== null) {
    if (!seen.has(match[1])) {
      seen.add(match[1]);
    }
  }
  while ((match = slugPattern2.exec(html)) !== null) {
    if (!seen.has(match[1])) {
      seen.add(match[1]);
    }
  }
  while ((match = slugPattern3.exec(html)) !== null) {
    if (!seen.has(match[1])) {
      seen.add(match[1]);
    }
  }

  // For each slug, extract associated data
  for (const slug of seen) {
    // Find the section of HTML containing this slug
    const slugIndex = html.indexOf(slug);
    if (slugIndex === -1) continue;

    const start = Math.max(0, slugIndex - 1000);
    const end = Math.min(html.length, slugIndex + 1000);
    const section = html.substring(start, end);

    // Try to find the film name
    let name = slug.replace(/-/g, ' ');

    // Look for data-film-name or data-item-name
    const nameMatch = section.match(/data-(?:film|item)-name="([^"]+)"/);
    if (nameMatch) {
      name = nameMatch[1];
    } else {
      // Try alt text from image
      const altMatch = section.match(/alt="([^"]+)"/);
      if (altMatch && altMatch[1].length > 1) {
        name = altMatch[1];
      }
    }

    // Try to find poster image
    let poster = '';
    const imgMatch = section.match(/src="(https:\/\/[^"]*ltrbxd[^"]*\.(jpg|webp)[^"]*)"/i);
    if (imgMatch) {
      poster = imgMatch[1];
      // Convert to larger size
      poster = poster.replace(/-0-\d+-0-\d+-crop/, '-0-460-0-690-crop');
      poster = poster.replace(/-0-150-0-225-/, '-0-230-0-345-');
      poster = poster.replace(/-0-125-0-187-/, '-0-230-0-345-');
    }

    // Extract year if present in name
    let year = '';
    const yearMatch = name.match(/\((\d{4})\)/);
    if (yearMatch) {
      year = yearMatch[1];
    }

    movies.push({
      slug,
      title: name,
      year,
      poster,
      link: `https://letterboxd.com/film/${slug}/`
    });
  }

  return movies;
}
