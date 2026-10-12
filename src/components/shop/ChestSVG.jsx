// Сундук в SVG: крышка отдельной группой, чтобы её можно было открыть анимацией
export default function ChestSVG({ colors, open = false, className = "" }) {
  const { body, trim } = colors;
  const id = body.replace("#", "");
  return (
    <svg viewBox="0 0 200 170" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`b${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={body} />
          <stop offset="1" stopColor="#0a0605" />
        </linearGradient>
        <linearGradient id={`t${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff7d6" />
          <stop offset="0.45" stopColor={trim} />
          <stop offset="1" stopColor="#5b4310" />
        </linearGradient>
        <radialGradient id={`l${id}`} cx="0.5" cy="1" r="0.8">
          <stop offset="0" stopColor="#fffbe6" stopOpacity="1" />
          <stop offset="1" stopColor={trim} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Свет изнутри */}
      <ellipse cx="100" cy="78" rx="78" ry="34" fill={`url(#l${id})`} style={{ opacity: open ? 1 : 0, transition: "opacity .4s" }} />

      {/* Корпус */}
      <rect x="22" y="78" width="156" height="82" rx="10" fill={`url(#b${id})`} stroke={`url(#t${id})`} strokeWidth="4" />
      <rect x="22" y="100" width="156" height="10" fill={`url(#t${id})`} opacity="0.85" />
      <rect x="44" y="78" width="12" height="82" fill={`url(#t${id})`} opacity="0.9" />
      <rect x="144" y="78" width="12" height="82" fill={`url(#t${id})`} opacity="0.9" />
      {/* Замок */}
      <rect x="86" y="92" width="28" height="32" rx="5" fill={`url(#t${id})`} stroke="#3b2a08" strokeWidth="2" />
      <circle cx="100" cy="104" r="4" fill="#1a1206" />
      <rect x="98.5" y="105" width="3" height="10" rx="1.5" fill="#1a1206" />

      {/* Крышка (откидывается назад) */}
      <g
        style={{
          transformOrigin: "100px 78px",
          transformBox: "view-box",
          transform: open ? "translateY(-26px) rotate(-14deg) scaleY(0.55)" : "none",
          transition: "transform .55s cubic-bezier(.34,1.56,.64,1)"
        }}
      >
        <path d="M22 78 V58 Q22 22 100 22 Q178 22 178 58 V78 Z" fill={`url(#b${id})`} stroke={`url(#t${id})`} strokeWidth="4" />
        <path d="M44 78 V40 Q46 30 56 27 V78 Z" fill={`url(#t${id})`} opacity="0.9" />
        <path d="M156 78 V40 Q154 30 144 27 V78 Z" fill={`url(#t${id})`} opacity="0.9" />
        <path d="M22 66 H178" stroke={`url(#t${id})`} strokeWidth="6" />
        <circle cx="100" cy="46" r="9" fill={`url(#t${id})`} />
      </g>
    </svg>
  );
}
