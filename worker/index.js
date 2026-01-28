// Cloudflare Worker for Letterboxd watchlist using StremThru API

const STREMTHRU_API_BASE = "https://stremthru.13377001.xyz/v0";

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
    // Step 1: Get the Letterboxd identifier from the watchlist page
    const letterboxdUrl = `https://letterboxd.com/${username}/watchlist/`;

    const idResponse = await fetch(letterboxdUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });

    if (!idResponse.ok) {
      return new Response(JSON.stringify({ error: 'User not found or watchlist is private' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const letterboxdId = idResponse.headers.get('x-letterboxd-identifier');

    if (!letterboxdId) {
      // Fallback: try to extract from HTML or use username-based approach
      return await fallbackScrape(username, corsHeaders);
    }

    // Step 2: Fetch watchlist data from StremThru API
    const stremthruUrl = `${STREMTHRU_API_BASE}/meta/letterboxd/users/${letterboxdId}/lists/watchlist`;

    const dataResponse = await fetch(stremthruUrl, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!dataResponse.ok) {
      console.log(`StremThru API error: ${dataResponse.status}`);
      return await fallbackScrape(username, corsHeaders);
    }

    const data = await dataResponse.json();

    if (!data.data || !data.data.items || data.data.items.length === 0) {
      return new Response(JSON.stringify({ error: 'Watchlist is empty' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Transform StremThru response to our format
    const movies = data.data.items.map(item => ({
      slug: item.slug || item.id,
      title: item.name || item.title,
      year: item.year ? String(item.year) : '',
      poster: item.poster || '',
      tmdb: item.tmdb_id,
      imdb: item.imdb_id,
      link: `https://letterboxd.com/film/${item.slug || item.id}/`
    }));

    const random = url.searchParams.get('random') === 'true';
    if (random) {
      const randomIndex = Math.floor(Math.random() * movies.length);
      return new Response(JSON.stringify({
        movie: movies[randomIndex],
        total: movies.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      movies: movies,
      total: movies.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Fallback to direct scraping if StremThru doesn't work
async function fallbackScrape(username, corsHeaders) {
  try {
    const allMovies = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 10) {
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

  // Extract film slugs
  const slugPattern1 = /data-film-slug="([^"]+)"/g;
  const slugPattern2 = /data-item-slug="([^"]+)"/g;
  const slugPattern3 = /href="\/film\/([^/"]+)\/"/g;

  let match;
  while ((match = slugPattern1.exec(html)) !== null) {
    if (!seen.has(match[1])) seen.add(match[1]);
  }
  while ((match = slugPattern2.exec(html)) !== null) {
    if (!seen.has(match[1])) seen.add(match[1]);
  }
  while ((match = slugPattern3.exec(html)) !== null) {
    if (!seen.has(match[1])) seen.add(match[1]);
  }

  for (const slug of seen) {
    const slugIndex = html.indexOf(slug);
    if (slugIndex === -1) continue;

    const start = Math.max(0, slugIndex - 1000);
    const end = Math.min(html.length, slugIndex + 1000);
    const section = html.substring(start, end);

    let name = slug.replace(/-/g, ' ');
    const nameMatch = section.match(/data-(?:film|item)-name="([^"]+)"/);
    if (nameMatch) {
      name = nameMatch[1];
    } else {
      const altMatch = section.match(/alt="([^"]+)"/);
      if (altMatch && altMatch[1].length > 1) {
        name = altMatch[1];
      }
    }

    let poster = '';
    const imgMatch = section.match(/src="(https:\/\/[^"]*ltrbxd[^"]*\.(jpg|webp)[^"]*)"/i);
    if (imgMatch) {
      poster = imgMatch[1];
      poster = poster.replace(/-0-\d+-0-\d+-crop/, '-0-460-0-690-crop');
      poster = poster.replace(/-0-150-0-225-/, '-0-230-0-345-');
      poster = poster.replace(/-0-125-0-187-/, '-0-230-0-345-');
    }

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
