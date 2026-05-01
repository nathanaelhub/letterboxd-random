// Poster — renders a real movie poster image when a URL is provided,
// otherwise falls back to a typographic poster generated from the film's
// color palette. In production the `poster` URL comes from the worker's
// /api/watchlist response (item.poster from StremThru, or the rescaled
// ltrbxd.com image from the fallback scraper).

function Poster({ movie, w = 200, h = 300, style = {} }) {
  const [imgState, setImgState] = React.useState('loading'); // loading | loaded | error
  const imgRef = React.useRef(null);
  const hasUrl = !!(movie && movie.poster);

  React.useEffect(() => {
    if (!hasUrl) { setImgState('error'); return; }
    setImgState('loading');
    // Cached images may already be complete on mount, in which case
    // the onLoad event never fires. Check the ref directly.
    const el = imgRef.current;
    if (el && el.complete) {
      if (el.naturalWidth > 0) setImgState('loaded');
      else setImgState('error');
    }
  }, [movie && movie.poster]);

  // Empty placeholder slot
  if (!movie) {
    return (
      <div style={{
        width: w, height: h, borderRadius: 4,
        background: 'linear-gradient(135deg, #1a1f27, #0e1117)',
        border: '1px dashed rgba(255,255,255,.1)',
        ...style,
      }} />
    );
  }

  // Real poster path — show the image, fall back to typographic on error
  if (hasUrl && imgState !== 'error') {
    return (
      <div style={{
        width: w, height: h, borderRadius: 4, overflow: 'hidden',
        position: 'relative',
        background: `linear-gradient(165deg, ${movie.color1 || '#222'} 0%, ${movie.color2 || '#000'} 100%)`,
        boxShadow: '0 1px 0 rgba(255,255,255,.08) inset, 0 12px 32px rgba(0,0,0,.5)',
        ...style,
      }}>
        <img
          ref={imgRef}
          src={movie.poster}
          alt={movie.title}
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={() => setImgState('loaded')}
          onError={() => setImgState('error')}
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            display: 'block',
            opacity: imgState === 'loaded' ? 1 : 0,
            transition: 'opacity .25s ease',
          }}
        />
      </div>
    );
  }

  // Typographic fallback (no poster URL, or image failed to load)
  return <TypoPoster movie={movie} w={w} h={h} style={style} />;
}

function TypoPoster({ movie, w, h, style }) {
  const titleWords = movie.title.split(/[\s:]+/).filter(Boolean);
  const tinyFont = w < 140;

  return (
    <div style={{
      width: w, height: h, borderRadius: 4, overflow: 'hidden',
      position: 'relative',
      background: `linear-gradient(165deg, ${movie.color1} 0%, ${movie.color1} 35%, ${movie.color2} 100%)`,
      boxShadow: '0 1px 0 rgba(255,255,255,.08) inset, 0 12px 32px rgba(0,0,0,.5)',
      fontFamily: '"Cormorant Garamond", "Playfair Display", Georgia, serif',
      color: movie.text || '#fff',
      ...style,
    }}>
      {/* Film grain texture */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse at 30% 20%, rgba(255,255,255,.18), transparent 55%),
                     radial-gradient(ellipse at 70% 90%, rgba(0,0,0,.45), transparent 60%)`,
        mixBlendMode: 'overlay',
      }} />
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.18,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.6'/%3E%3C/svg%3E")`,
        mixBlendMode: 'overlay',
      }} />

      {/* Director credit, top */}
      {movie.dir && (
        <div style={{
          position: 'absolute', top: w * 0.06, left: w * 0.08, right: w * 0.08,
          fontFamily: '"Inter", system-ui, sans-serif',
          fontSize: tinyFont ? 7 : 9, letterSpacing: '0.2em', textTransform: 'uppercase',
          opacity: 0.78, fontWeight: 500,
        }}>
          a film by {movie.dir}
        </div>
      )}

      {/* Title — bottom-anchored */}
      <div style={{
        position: 'absolute', left: w * 0.07, right: w * 0.07,
        bottom: w * 0.12,
        fontStyle: 'italic', fontWeight: 500,
        lineHeight: 0.92, textWrap: 'balance',
      }}>
        {titleWords.map((word, i) => (
          <div key={i} style={{
            fontSize: Math.max(11, w * (word.length > 8 ? 0.085 : word.length > 5 ? 0.11 : 0.14)),
            marginBottom: -w * 0.01,
          }}>{word}</div>
        ))}
      </div>

      {/* Year, bottom-right */}
      {movie.year && (
        <div style={{
          position: 'absolute', bottom: w * 0.05, right: w * 0.07,
          fontFamily: '"Inter", system-ui, sans-serif',
          fontSize: tinyFont ? 7 : 9, letterSpacing: '0.18em',
          opacity: 0.6, fontWeight: 500,
        }}>
          {movie.year}
        </div>
      )}
    </div>
  );
}

window.Poster = Poster;
window.TypoPoster = TypoPoster;
