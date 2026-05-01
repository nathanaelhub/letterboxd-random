// App — the main Reel Roulette experience.
// Three themes (Marquee, Projector, Neon) toggleable via Tweaks.
// Watchlist comes from /api/watchlist (the worker), with a watchlistpicker.com
// fallback if the worker can't satisfy the request.

const THEMES = {
  projector: {
    name: 'Projector',
    bodyBg: '#0E1115',
    bodyBgGradient: 'radial-gradient(ellipse 1200px 800px at 50% -10%, #1a1f28 0%, #0a0c10 60%)',
    surface: 'rgba(20,24,30,.7)',
    cardBorder: '1px solid rgba(255,255,255,.06)',
    reelBg: 'linear-gradient(180deg, #16191e 0%, #0c0e12 100%)',
    reelBorder: '1px solid rgba(255,255,255,.05)',
    reelShadow: '0 1px 0 rgba(255,255,255,.04) inset, 0 24px 60px rgba(0,0,0,.5)',
    slotBg: '#08090c',
    slotFade: '#08090c',
    accent: '#E8B947',
    accentRgb: '232,185,71',
    textBright: '#F5F1E8',
    text: '#C9C2B5',
    textDim: '#7A7568',
    chipBorder: 'rgba(255,255,255,.12)',
    chipHover: 'rgba(255,255,255,.04)',
    inputBg: 'rgba(255,255,255,.04)',
    inputBorder: 'rgba(255,255,255,.1)',
    inputFocus: '#E8B947',
    btnPrimary: '#E8B947',
    btnPrimaryText: '#1A1408',
    titleFont: '"Cormorant Garamond", Georgia, serif',
    bgTexture: true,
  },
  marquee: {
    name: 'Marquee',
    bodyBg: '#1A0F12',
    bodyBgGradient: 'radial-gradient(ellipse 1200px 800px at 50% -10%, #2C1518 0%, #120608 70%)',
    surface: 'rgba(40,20,22,.6)',
    cardBorder: '1px solid rgba(255,200,140,.08)',
    reelBg: 'linear-gradient(180deg, #2A1014 0%, #160608 100%)',
    reelBorder: '1px solid rgba(255,200,140,.12)',
    reelShadow: '0 0 0 6px #1A0F12, 0 0 0 7px rgba(255,200,140,.15), 0 24px 60px rgba(0,0,0,.5)',
    slotBg: '#0E0608',
    slotFade: '#0E0608',
    accent: '#FFB347',
    accentRgb: '255,179,71',
    textBright: '#FFF1D4',
    text: '#D4B896',
    textDim: '#8A6E5A',
    chipBorder: 'rgba(255,200,140,.18)',
    chipHover: 'rgba(255,200,140,.06)',
    inputBg: 'rgba(255,200,140,.04)',
    inputBorder: 'rgba(255,200,140,.18)',
    inputFocus: '#FFB347',
    btnPrimary: '#FFB347',
    btnPrimaryText: '#1A0F0A',
    titleFont: '"Cormorant Garamond", Georgia, serif',
    bgTexture: true,
  },
  neon: {
    name: 'Neon',
    bodyBg: '#0A0716',
    bodyBgGradient: 'radial-gradient(ellipse 1200px 800px at 50% 0%, #1B1240 0%, #060410 70%)',
    surface: 'rgba(20,15,40,.6)',
    cardBorder: '1px solid rgba(180,120,255,.12)',
    reelBg: 'linear-gradient(180deg, #15102E 0%, #07051A 100%)',
    reelBorder: '1px solid rgba(180,120,255,.18)',
    reelShadow: '0 0 0 1px rgba(255,80,180,.2), 0 24px 60px rgba(80,40,180,.3), 0 0 80px rgba(180,120,255,.12)',
    slotBg: '#04030D',
    slotFade: '#04030D',
    accent: '#FF4FBE',
    accentRgb: '255,79,190',
    textBright: '#F0E6FF',
    text: '#B8A8E0',
    textDim: '#6E5F95',
    chipBorder: 'rgba(180,120,255,.2)',
    chipHover: 'rgba(180,120,255,.08)',
    inputBg: 'rgba(180,120,255,.06)',
    inputBorder: 'rgba(180,120,255,.25)',
    inputFocus: '#FF4FBE',
    btnPrimary: 'linear-gradient(135deg, #FF4FBE 0%, #7A4FFF 100%)',
    btnPrimaryText: '#FFFFFF',
    titleFont: '"Cormorant Garamond", Georgia, serif',
    bgTexture: false,
  },
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "projector",
  "spinIntensity": "cinematic",
  "showFilmGrain": true,
  "username": ""
}/*EDITMODE-END*/;

async function fetchWatchlist(usernameTrim, genre) {
  // Strategy 1: our Cloudflare Worker, which talks to StremThru and (on
  // failure) scrapes Letterboxd directly. Returns a full pool we can spin
  // through and re-pick from without re-fetching.
  const genreParam = genre ? `&genre=${encodeURIComponent(genre)}` : '';
  let workerErr = null;
  try {
    const res = await fetch(`/api/watchlist?username=${encodeURIComponent(usernameTrim)}${genreParam}`);
    const data = await res.json().catch(() => null);
    if (res.ok && data && Array.isArray(data.movies) && data.movies.length > 0) {
      return { movies: data.movies };
    }
    if (data && data.error) workerErr = data.error;
  } catch (e) {
    workerErr = e.message;
  }

  // Strategy 2: watchlistpicker.com — only returns one film at a time, so
  // we end up with a pool of one. Better than failing outright.
  try {
    const res = await fetch(`https://watchlistpicker.com/api?users=${encodeURIComponent(usernameTrim)}`);
    if (res.ok) {
      const text = await res.text();
      if (!text.includes('error') && !text.includes('Union error')) {
        const film = JSON.parse(text);
        if (film && film.slug) {
          return { movies: [{
            slug: film.slug,
            title: film.film_name || film.slug.replace(/-/g, ' '),
            poster: film.image_url || '',
            year: film.release_year || '',
            link: `https://letterboxd.com/film/${film.slug}/`,
          }] };
        }
      }
    }
  } catch (e) { /* swallow — fall through to error */ }

  return { error: workerErr || 'Could not fetch watchlist. User may not exist or watchlist is private.' };
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const theme = THEMES[t.theme] || THEMES.projector;

  const [username, setUsername] = React.useState(t.username || '');
  const [genre, setGenre] = React.useState(null);
  const [phase, setPhase] = React.useState('ready'); // ready | loading | spinning | result
  const [picked, setPicked] = React.useState(null);
  const [movies, setMovies] = React.useState([]);
  const [cacheKey, setCacheKey] = React.useState('');
  const [error, setError] = React.useState(null);
  const [savedSet, setSavedSet] = React.useState(new Set());
  const [watchedSet, setWatchedSet] = React.useState(new Set());

  const usernameTrim = username.trim().toLowerCase();
  const targetCacheKey = `${usernameTrim}|${genre || ''}`;
  const canSpin = !!usernameTrim && phase !== 'spinning' && phase !== 'loading';

  // Clear stale errors when the user edits the inputs.
  React.useEffect(() => { setError(null); }, [username, genre]);

  const triggerSpin = React.useCallback(async () => {
    if (!usernameTrim) return;
    setError(null);
    let pool = movies;
    if (cacheKey !== targetCacheKey || pool.length === 0) {
      setPhase('loading');
      const result = await fetchWatchlist(usernameTrim, genre);
      if (result.error) {
        setError(result.error);
        setPhase('ready');
        return;
      }
      pool = result.movies;
      setMovies(pool);
      setCacheKey(targetCacheKey);
    }
    if (pool.length === 0) {
      setError('No films found for this watchlist + filter.');
      setPhase('ready');
      return;
    }
    const choice = pool[Math.floor(Math.random() * pool.length)];
    setPicked(choice);
    setPhase('spinning');
  }, [usernameTrim, genre, cacheKey, targetCacheKey, movies]);

  const handleSpinDone = () => setPhase('result');

  const handleSpinAgain = () => {
    if (cacheKey !== targetCacheKey || movies.length === 0) {
      // Cache stale — refetch. Bounce through 'ready' so the reel resets
      // visually before the new spin starts.
      setPhase('ready');
      setTimeout(() => triggerSpin(), 50);
      return;
    }
    setPhase('ready');
    setTimeout(() => {
      const choice = movies[Math.floor(Math.random() * movies.length)];
      setPicked(choice);
      setPhase('spinning');
    }, 50);
  };

  const toggle = (set, key, setter) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key); else next.add(key);
    setter(next);
  };

  const onUsernameKey = (e) => {
    if (e.key === 'Enter' && canSpin) triggerSpin();
  };

  const posterW = 132, posterH = 198;

  return (
    <div style={{
      minHeight: '100vh',
      background: theme.bodyBgGradient,
      backgroundColor: theme.bodyBg,
      color: theme.text,
      fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
      padding: '40px 24px 80px',
      position: 'relative',
      overflowX: 'hidden',
    }}>
      {t.showFilmGrain && (
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', opacity: 0.04, zIndex: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }} />
      )}

      <div style={{
        maxWidth: 720, margin: '0 auto',
        position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 36,
      }}>
        <Header theme={theme} />

        {phase !== 'result' && (
          <SetupPanel
            theme={theme}
            username={username}
            setUsername={setUsername}
            onUsernameKey={onUsernameKey}
            genre={genre} setGenre={setGenre}
          />
        )}

        {error && phase !== 'result' && (
          <div style={{
            maxWidth: 560, width: '100%',
            padding: '12px 16px', borderRadius: 8,
            background: 'rgba(255, 80, 80, .08)',
            border: '1px solid rgba(255, 120, 120, .35)',
            color: '#FFB0B0',
            fontSize: 13,
          }}>
            {error}
          </div>
        )}

        <SpinReel
          movies={movies}
          picked={picked}
          spinning={phase === 'spinning'}
          onSpinDone={handleSpinDone}
          posterW={posterW}
          posterH={posterH}
          theme={theme}
        />

        {phase !== 'result' ? (
          <SpinButton
            theme={theme}
            disabled={!canSpin}
            spinning={phase === 'spinning' || phase === 'loading'}
            onClick={triggerSpin}
            label={
              phase === 'loading'  ? 'Loading…' :
              phase === 'spinning' ? 'Spinning…' :
              !usernameTrim        ? 'Enter your username' :
                                     'Spin the Reel'
            }
          />
        ) : (
          <ResultCard
            movie={picked}
            theme={theme}
            onSpinAgain={handleSpinAgain}
            onSave={() => toggle(savedSet, picked.slug, setSavedSet)}
            saved={savedSet.has(picked && picked.slug)}
            onWatched={() => toggle(watchedSet, picked.slug, setWatchedSet)}
            watched={watchedSet.has(picked && picked.slug)}
          />
        )}

        <div style={{
          marginTop: 24, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
          color: theme.textDim, opacity: 0.7, textAlign: 'center',
        }}>
          {movies.length > 0
            ? `${movies.length} ${movies.length === 1 ? 'film' : 'films'} in pool · powered by your watchlist`
            : 'powered by your letterboxd watchlist'}
        </div>
      </div>

      <TweaksUI t={t} setTweak={setTweak} theme={theme} />
    </div>
  );
}

function Header({ theme }) {
  return (
    <div style={{
      textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      marginTop: 8,
    }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff8000' }} />
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#00e054' }} />
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#40bcf4' }} />
      </div>
      <h1 style={{
        fontFamily: theme.titleFont,
        fontStyle: 'italic', fontWeight: 500,
        fontSize: 'clamp(32px, 8vw, 52px)', lineHeight: 1.05, margin: 0,
        color: theme.textBright,
        letterSpacing: '-0.01em',
        textAlign: 'center',
      }}>
        Watchlist Randomizer
      </h1>
      <p style={{
        margin: '6px 0 0', fontSize: 13, letterSpacing: '0.04em',
        color: theme.textDim, fontStyle: 'italic',
        fontFamily: theme.titleFont,
      }}>
        let the projector decide tonight's feature
      </p>
    </div>
  );
}

function SetupPanel({ theme, username, setUsername, onUsernameKey, genre, setGenre }) {
  return (
    <div style={{
      width: '100%', maxWidth: 560,
      background: theme.surface,
      border: theme.cardBorder,
      borderRadius: 14,
      padding: 20,
      display: 'flex', flexDirection: 'column', gap: 18,
      backdropFilter: 'blur(12px)',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{
          fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
          color: theme.textDim, fontWeight: 600,
        }}>Watchlist source</div>
        <div style={{
          display: 'flex', alignItems: 'center',
          background: theme.inputBg,
          border: `1px solid ${theme.inputBorder}`,
          borderRadius: 8,
          padding: '0 12px',
          height: 40,
          transition: 'border-color .2s',
        }}>
          <span style={{ color: theme.textDim, fontSize: 13, marginRight: 4 }}>letterboxd.com/</span>
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={onUsernameKey}
            placeholder="username"
            autoComplete="off" autoCapitalize="off" spellCheck="false"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: theme.textBright, fontSize: 13, fontFamily: 'inherit',
              padding: '8px 0',
            }}
          />
        </div>
      </div>

      <FilterRail
        label="Genre"
        items={GENRES}
        value={genre}
        onChange={setGenre}
        theme={theme}
      />
    </div>
  );
}

function SpinButton({ theme, disabled, spinning, onClick, label }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        appearance: 'none', cursor: disabled ? 'not-allowed' : 'default',
        border: 'none',
        padding: '18px 56px',
        fontSize: 14, fontWeight: 600,
        letterSpacing: '0.22em', textTransform: 'uppercase',
        fontFamily: 'inherit',
        background: disabled ? 'rgba(255,255,255,.06)' : theme.btnPrimary,
        color: disabled ? theme.textDim : theme.btnPrimaryText,
        borderRadius: 999,
        boxShadow: disabled ? 'none' : `0 0 0 6px rgba(${theme.accentRgb},.08), 0 12px 32px rgba(${theme.accentRgb},.25)`,
        transition: 'all .2s ease',
        transform: spinning ? 'scale(0.98)' : 'scale(1)',
        opacity: disabled ? 0.6 : 1,
        position: 'relative',
      }}
    >
      {spinning && (
        <span style={{
          display: 'inline-block', width: 12, height: 12,
          border: `2px solid currentColor`, borderTopColor: 'transparent',
          borderRadius: '50%', marginRight: 12, verticalAlign: -1,
          animation: 'lr-spin 0.7s linear infinite',
        }} />
      )}
      {label}
    </button>
  );
}

function TweaksUI({ t, setTweak, theme }) {
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Aesthetic" />
      <TweakSelect
        label="Theme"
        value={t.theme}
        options={[
          { value: 'projector', label: 'Projector — warm amber' },
          { value: 'marquee',   label: 'Marquee — vintage cinema' },
          { value: 'neon',      label: 'Neon — synthwave noir' },
        ]}
        onChange={(v) => setTweak('theme', v)}
      />
      <TweakToggle
        label="Film grain"
        value={t.showFilmGrain}
        onChange={(v) => setTweak('showFilmGrain', v)}
      />
      <TweakSection label="Defaults" />
      <TweakText
        label="Username"
        value={t.username}
        onChange={(v) => setTweak('username', v)}
      />
    </TweaksPanel>
  );
}

window.App = App;
