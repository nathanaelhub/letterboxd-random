// FilterRail — genre + mood chip selectors with a refined feel.

function FilterChip({ active, onClick, children, theme, accent }) {
  const [hover, setHover] = React.useState(false);
  const c = accent || theme.accent;
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        appearance: 'none', cursor: 'default',
        padding: '7px 13px',
        fontSize: 12.5, fontWeight: 500, letterSpacing: '0.01em',
        border: `1px solid ${active ? c : theme.chipBorder}`,
        background: active ? `${c}1f` : (hover ? theme.chipHover : 'transparent'),
        color: active ? c : theme.textDim,
        borderRadius: 999,
        fontFamily: 'inherit',
        transition: 'all .18s ease',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
}

function FilterRail({ label, items, value, onChange, theme, accentByItem }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{
        fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
        color: theme.textDim, fontWeight: 600,
      }}>{label}</div>
      <div style={{
        display: 'flex', gap: 6, flexWrap: 'wrap',
      }}>
        {items.map(item => (
          <FilterChip
            key={item.slug}
            active={value === item.slug}
            onClick={() => onChange(value === item.slug ? null : item.slug)}
            theme={theme}
            accent={accentByItem ? accentByItem(item) : null}
          >
            {item.icon ? <span style={{ marginRight: 5, opacity: 0.85 }}>{item.icon}</span> : null}
            {item.name || item.label}
          </FilterChip>
        ))}
      </div>
    </div>
  );
}

window.FilterRail = FilterRail;
window.FilterChip = FilterChip;
