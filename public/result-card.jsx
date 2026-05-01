// ResultCard — the picked movie revealed after a spin.
// Minimal: poster + title + year + reroll/save actions.

function ResultCard({ movie, theme, onSpinAgain, onSave, saved, watched, onWatched }) {
  if (!movie) return null;

  const meta = [];
  if (movie.year) meta.push(<span key="year">{movie.year}</span>);
  if (movie.dir) meta.push(<span key="dir">dir. {movie.dir}</span>);
  if (movie.runtime) meta.push(<span key="run">{movie.runtime}m</span>);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 18,
      animation: 'lr-fade-up .6s cubic-bezier(.16,.84,.22,1) both',
      animationDelay: '.15s',
    }}>
      {/* Title block */}
      <div style={{ textAlign: 'center', maxWidth: 460 }}>
        <div style={{
          fontSize: 10, letterSpacing: '0.32em', textTransform: 'uppercase',
          color: theme.textDim, fontWeight: 600, marginBottom: 12,
        }}>
          ◆ Tonight's Pick ◆
        </div>
        <h2 style={{
          fontFamily: '"Cormorant Garamond", "Playfair Display", Georgia, serif',
          fontStyle: 'italic',
          fontSize: 42, lineHeight: 1.05, fontWeight: 500,
          color: theme.textBright,
          margin: 0,
          textWrap: 'balance',
        }}>
          {movie.title}
        </h2>
        {meta.length > 0 && (
          <div style={{
            marginTop: 10,
            fontSize: 13, letterSpacing: '0.06em',
            color: theme.textDim,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}>
            {meta.map((node, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span style={{ opacity: 0.4 }}>·</span>}
                {node}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Action row */}
      <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={onSpinAgain} className="lr-btn lr-btn-primary">
          <span style={{ fontSize: 14 }}>↻</span>
          Spin again
        </button>
        <button onClick={onSave} className={`lr-btn ${saved ? 'lr-btn-active' : 'lr-btn-ghost'}`}>
          <span style={{ fontSize: 13 }}>{saved ? '✓' : '+'}</span>
          {saved ? 'Saved' : 'Save'}
        </button>
        <button onClick={onWatched} className={`lr-btn ${watched ? 'lr-btn-active' : 'lr-btn-ghost'}`}>
          <span style={{ fontSize: 13 }}>{watched ? '✓' : '◉'}</span>
          {watched ? 'Watched' : 'Mark watched'}
        </button>
        <a
          href={movie.link || `https://letterboxd.com/film/${movie.slug}/`}
          target="_blank" rel="noreferrer"
          className="lr-btn lr-btn-ghost"
          style={{ textDecoration: 'none' }}
        >
          View ↗
        </a>
      </div>
    </div>
  );
}

window.ResultCard = ResultCard;
