const https = require('https');
const http = require('http');

// Simple HTML parser to extract film data
function parseMovies(html) {
    const movies = [];

    // Match poster containers with film data
    // Pattern: data-film-slug="..." or data-item-slug="..."
    const slugPattern = /data-(?:film|item)-slug="([^"]+)"/g;
    const namePattern = /data-(?:film|item)-name="([^"]+)"/g;
    const imgPattern = /<img[^>]+alt="([^"]+)"[^>]+src="([^"]+)"/g;

    // Extract all slugs
    const slugs = new Set();
    let match;

    while ((match = slugPattern.exec(html)) !== null) {
        slugs.add(match[1]);
    }

    // For each slug, try to find associated data
    for (const slug of slugs) {
        // Find image with this film's data nearby
        const filmSection = html.substring(
            Math.max(0, html.indexOf(slug) - 500),
            Math.min(html.length, html.indexOf(slug) + 500)
        );

        // Try to extract image URL
        const imgMatch = filmSection.match(/src="(https:\/\/[^"]*ltrbxd[^"]*\.jpg[^"]*)"/);
        let poster = imgMatch ? imgMatch[1] : '';

        // Try to get the name from alt text or data attribute
        const altMatch = filmSection.match(/alt="([^"]+)"/);
        const nameMatch = filmSection.match(/data-(?:film|item)-name="([^"]+)"/);
        const name = nameMatch ? nameMatch[1] : (altMatch ? altMatch[0] : slug.replace(/-/g, ' '));

        // Make poster larger
        if (poster) {
            poster = poster.replace(/-0-\d+-0-\d+-crop/, '-0-460-0-690-crop');
        }

        movies.push({
            slug,
            title: name,
            poster,
            link: `https://letterboxd.com/film/${slug}/`
        });
    }

    return movies;
}

// Fetch URL with proper headers
function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'identity',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            }
        };

        https.get(url, options, (res) => {
            // Handle redirects
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                fetchUrl(res.headers.location).then(resolve).catch(reject);
                return;
            }

            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode}`));
                return;
            }

            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
            res.on('error', reject);
        }).on('error', reject);
    });
}

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const username = req.query.username || req.query.user;

    if (!username) {
        res.status(400).json({ error: 'Username required' });
        return;
    }

    try {
        const allMovies = [];
        let page = 1;
        let hasMore = true;

        while (hasMore && page <= 20) {
            const url = `https://letterboxd.com/${username}/watchlist/page/${page}/`;

            try {
                const html = await fetchUrl(url);

                // Check for Cloudflare challenge
                if (html.includes('challenge-platform') || html.includes('Just a moment')) {
                    if (page === 1) {
                        res.status(503).json({
                            error: 'Letterboxd is blocking requests. Try again later.',
                            cloudflare: true
                        });
                        return;
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
            } catch (err) {
                if (page === 1) {
                    res.status(404).json({ error: 'User not found or watchlist is private' });
                    return;
                }
                hasMore = false;
            }
        }

        if (allMovies.length === 0) {
            res.status(404).json({ error: 'Watchlist is empty or not accessible' });
            return;
        }

        // Return all movies or a random one based on query param
        if (req.query.random === 'true') {
            const randomIndex = Math.floor(Math.random() * allMovies.length);
            res.status(200).json({
                movie: allMovies[randomIndex],
                total: allMovies.length
            });
        } else {
            res.status(200).json({
                movies: allMovies,
                total: allMovies.length
            });
        }

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
