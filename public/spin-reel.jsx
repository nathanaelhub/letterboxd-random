// SpinReel — vertical slot-machine of film posters.
// Three columns whir at different speeds and stop sequentially, with the
// MIDDLE column landing on the chosen movie. Side columns are decorative.

function SpinReel({ movies, picked, spinning, onSpinDone, posterW, posterH, theme }) {
  const reelRefs = [React.useRef(null), React.useRef(null), React.useRef(null)];
  const [phase, setPhase] = React.useState('idle'); // idle | spinning | landed

  const hasMovies = !!(movies && movies.length > 0);

  // Build deep strips for each column. Middle ends with the picked film.
  const strips = React.useMemo(() => {
    if (!hasMovies) return [[], [], []];
    const shuffle = (arr) => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };
    // Cap the visual pool to 24 items — enough for smooth motion without
    // rendering thousands of DOM nodes when the watchlist is large.
    const pool = shuffle(movies).slice(0, 24);
    const repeats = Math.max(6, Math.ceil(36 / pool.length));
    const make = (endWith) => {
      let strip = [];
      for (let r = 0; r < repeats; r++) strip = strip.concat(shuffle(pool));
      if (endWith) strip.push(endWith);
      return strip;
    };
    return [make(null), make(picked), make(null)];
  }, [movies, picked, spinning]);

  // Trigger the spin animation
  React.useEffect(() => {
    if (!spinning || !picked || !hasMovies) return;
    setPhase('spinning');
    reelRefs.forEach((r, i) => {
      const el = r.current;
      if (!el) return;
      const strip = strips[i];
      if (strip.length === 0) return;
      const targetIdx = i === 1 ? strip.length - 1 : strip.length - 1 - Math.floor(Math.random() * 4);
      const cellH = posterH + 16;
      const distance = targetIdx * cellH;
      el.style.transition = 'none';
      el.style.transform = `translateY(0px)`;
      void el.offsetHeight;
      const duration = 2800 + i * 600;
      el.style.transition = `transform ${duration}ms cubic-bezier(.16,.84,.22,1)`;
      el.style.transform = `translateY(-${distance}px)`;
    });

    const total = 2800 + 2 * 600 + 200;
    const t = setTimeout(() => {
      setPhase('landed');
      onSpinDone && onSpinDone();
    }, total);
    return () => clearTimeout(t);
  }, [spinning, picked]);

  // Reset visual when movie pool changes (e.g. user re-fetches)
  React.useEffect(() => {
    if (spinning) return;
    setPhase('idle');
    reelRefs.forEach(r => {
      const el = r.current;
      if (!el) return;
      el.style.transition = 'none';
      el.style.transform = 'translateY(0px)';
    });
  }, [movies]);

  const reelH = posterH + 32;
  const cols = [0, 1, 2];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `${posterW}px ${posterW}px ${posterW}px`,
      gap: 14,
      position: 'relative',
      padding: '20px 22px',
      borderRadius: 14,
      background: theme.reelBg,
      border: theme.reelBorder,
      boxShadow: theme.reelShadow,
    }}>
      {cols.map((c) => (
        <div key={c} style={{
          width: posterW, height: reelH,
          overflow: 'hidden', position: 'relative',
          borderRadius: 6,
          background: theme.slotBg,
          boxShadow: `inset 0 8px 16px -4px rgba(0,0,0,.7), inset 0 -8px 16px -4px rgba(0,0,0,.7)`,
        }}>
          {hasMovies ? (
            <div ref={reelRefs[c]} style={{
              display: 'flex', flexDirection: 'column',
              gap: 16,
              padding: '16px 0',
              willChange: 'transform',
            }}>
              {strips[c].map((m, i) => (
                <div key={`${c}-${i}`} style={{ display: 'flex', justifyContent: 'center' }}>
                  <Poster movie={m} w={posterW} h={posterH} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              display: 'flex', flexDirection: 'column',
              gap: 16,
              padding: '16px 0',
            }}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Poster movie={null} w={posterW} h={posterH} />
              </div>
            </div>
          )}
          {/* Top fade */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 24,
            background: `linear-gradient(180deg, ${theme.slotFade} 0%, transparent 100%)`,
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 24,
            background: `linear-gradient(0deg, ${theme.slotFade} 0%, transparent 100%)`,
            pointerEvents: 'none',
          }} />
        </div>
      ))}

      {/* Center selection bracket — only after landing */}
      {phase === 'landed' && hasMovies && (
        <div style={{
          position: 'absolute',
          left: 22 + posterW + 14,
          top: 20 + 16,
          width: posterW, height: posterH,
          borderRadius: 6,
          boxShadow: `0 0 0 2px ${theme.accent}, 0 0 32px ${theme.accent}66`,
          pointerEvents: 'none',
          animation: 'lr-pop 0.5s cubic-bezier(.34,1.56,.64,1)',
        }} />
      )}
    </div>
  );
}

window.SpinReel = SpinReel;
