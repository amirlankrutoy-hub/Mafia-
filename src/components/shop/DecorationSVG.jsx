import { useId } from "react";

// DecorationSVG.jsx — украшение над аватаркой: металлический блеск,
// драгоценные камни и мерцающая искра. Цвета берутся из палитры (colors).

function Sparkle({ x, y, s = 1 }) {
  return (
    <path
      className="deco-sparkle"
      style={{ transformOrigin: `${x}px ${y}px` }}
      d={`M${x} ${y - 6 * s} L${x + 1.6 * s} ${y - 1.6 * s} L${x + 6 * s} ${y} L${x + 1.6 * s} ${y + 1.6 * s} L${x} ${y + 6 * s} L${x - 1.6 * s} ${y + 1.6 * s} L${x - 6 * s} ${y} L${x - 1.6 * s} ${y - 1.6 * s} Z`}
      fill="#fff"
    />
  );
}

function Gem({ cx, cy, r, color }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={color} stroke="#000" strokeOpacity="0.35" strokeWidth="0.8" />
      <circle cx={cx - r * 0.35} cy={cy - r * 0.35} r={r * 0.35} fill="#fff" opacity="0.75" />
    </g>
  );
}

function Shape({ kind, colors, id }) {
  const { main, accent, dark } = colors;
  const gem = colors.gem || accent;
  const metal = `url(#${id}m)`;
  const shade = `url(#${id}s)`;

  switch (kind) {
    case "fedora":
      return (
        <g>
          <ellipse cx="50" cy="55" rx="46" ry="10" fill={shade} />
          <path d="M22 54 Q20 22 38 14 Q50 22 62 14 Q80 22 78 54 Z" fill={shade} />
          <path d="M40 16 Q50 24 60 16" stroke={dark} strokeWidth="2" fill="none" />
          <path d="M21 42 Q50 36 79 42 L79 52 Q50 46 21 52 Z" fill={metal} />
          <path d="M28 22 Q34 16 42 18" stroke="#fff" strokeOpacity="0.3" strokeWidth="2.5" fill="none" />
          <Sparkle x={76} y={40} s={0.9} />
        </g>
      );
    case "tophat":
      return (
        <g>
          <ellipse cx="50" cy="60" rx="44" ry="8" fill={shade} />
          <path d="M26 60 L29 6 Q50 2 71 6 L74 60 Z" fill={shade} />
          <path d="M27 42 Q50 38 73 42 L74 54 Q50 50 26 54 Z" fill={metal} />
          <path d="M34 9 L33 38" stroke="#fff" strokeOpacity="0.22" strokeWidth="4" />
          <Gem cx={62} cy={47} r={4} color={gem} />
          <Sparkle x={70} y={12} />
        </g>
      );
    case "crown":
      return (
        <g>
          <path d="M10 58 L16 18 L33 38 L50 6 L67 38 L84 18 L90 58 Z" fill={metal} stroke={dark} strokeWidth="2" strokeLinejoin="round" />
          <rect x="10" y="54" width="80" height="12" rx="3" fill={metal} stroke={dark} strokeWidth="2" />
          <Gem cx={16} cy={18} r={4} color={gem} />
          <Gem cx={50} cy={7} r={5.5} color={gem} />
          <Gem cx={84} cy={18} r={4} color={gem} />
          <Gem cx={30} cy={60} r={3} color="#fff" />
          <Gem cx={50} cy={60} r={3.5} color={gem} />
          <Gem cx={70} cy={60} r={3} color="#fff" />
          <path d="M20 50 L28 30" stroke="#fff" strokeOpacity="0.35" strokeWidth="2.5" />
          <Sparkle x={62} y={22} />
        </g>
      );
    case "laurel":
      return (
        <g>
          {[-1, 1].map((side) => (
            <g key={side} transform={side === 1 ? "translate(100 0) scale(-1 1)" : undefined}>
              <path d="M14 64 Q8 26 46 12" stroke={dark} strokeWidth="2.5" fill="none" />
              {[0, 1, 2, 3, 4, 5].map((i) => {
                const t = i / 5;
                const x = 14 + 30 * t - 6 * Math.sin(t * 3);
                const y = 60 - 44 * t + 4 * Math.sin(t * 3);
                return (
                  <g key={i}>
                    <ellipse cx={x - 5} cy={y - 3} rx="7" ry="3.4" fill={metal} transform={`rotate(${-50 + i * 6} ${x - 5} ${y - 3})`} />
                    <ellipse cx={x + 4} cy={y - 5} rx="7" ry="3.4" fill={shade} transform={`rotate(${40 - i * 4} ${x + 4} ${y - 5})`} />
                  </g>
                );
              })}
            </g>
          ))}
          <Gem cx={50} cy={13} r={4.5} color={gem} />
          <Sparkle x={84} y={40} s={0.8} />
        </g>
      );
    case "halo":
      return (
        <g className="deco-halo">
          <ellipse cx="50" cy="36" rx="40" ry="13" fill="none" stroke={accent} strokeWidth="10" opacity="0.25" />
          <ellipse cx="50" cy="36" rx="38" ry="12" fill="none" stroke={metal} strokeWidth="5" />
          <ellipse cx="50" cy="34" rx="34" ry="9" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="1.2" />
          <Sparkle x={86} y={30} />
          <Sparkle x={16} y={42} s={0.7} />
        </g>
      );
    case "horns":
      return (
        <g>
          <path d="M30 64 Q10 46 14 10 Q22 32 40 44 Q44 56 30 64 Z" fill={shade} stroke={dark} strokeWidth="1.5" />
          <path d="M70 64 Q90 46 86 10 Q78 32 60 44 Q56 56 70 64 Z" fill={shade} stroke={dark} strokeWidth="1.5" />
          <path d="M20 40 Q18 26 16 16 M80 40 Q82 26 84 16" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" fill="none" />
          {[0, 1, 2].map((i) => (
            <path key={i} d={`M${24 + i * 3} ${50 - i * 9} q6 2 8 -3 M${76 - i * 3} ${50 - i * 9} q-6 2 -8 -3`} stroke={dark} strokeWidth="1.5" fill="none" />
          ))}
          <circle cx="14" cy="9" r="3" fill={accent} className="deco-ember" />
          <circle cx="86" cy="9" r="3" fill={accent} className="deco-ember" />
        </g>
      );
    case "rose":
      return (
        <g>
          <path d="M50 66 Q46 50 50 40" stroke="#1f6b2a" strokeWidth="3" fill="none" />
          <path d="M48 56 Q30 52 28 44 Q42 42 48 52 Z M52 52 Q66 44 74 50 Q64 58 52 56 Z" fill="#2f8a3c" />
          <circle cx="50" cy="26" r="20" fill={shade} />
          <path d="M34 24 Q36 8 50 8 Q66 8 66 24 Q60 14 50 16 Q40 16 34 24 Z" fill={metal} />
          <path d="M42 28 Q42 18 52 18 Q60 20 58 28 Q54 22 48 24 Q44 26 42 28 Z" fill={dark} opacity="0.6" />
          <path d="M46 30 Q50 24 56 28" stroke={dark} strokeWidth="2" fill="none" />
          <circle cx="50" cy="26" r="20" fill="none" stroke={dark} strokeWidth="1.5" />
          <Sparkle x={70} y={14} s={0.8} />
        </g>
      );
    case "bowler":
      return (
        <g>
          <path d="M8 56 Q50 48 92 56 Q94 64 84 64 Q50 58 16 64 Q6 64 8 56 Z" fill={shade} />
          <path d="M22 56 Q20 14 50 12 Q80 14 78 56 Z" fill={shade} />
          <path d="M22 46 Q50 41 78 46 L78 55 Q50 50 22 55 Z" fill={metal} />
          <path d="M32 24 Q38 16 48 16" stroke="#fff" strokeOpacity="0.3" strokeWidth="3" fill="none" />
          <Sparkle x={74} y={26} />
        </g>
      );
    case "beret":
      return (
        <g transform="rotate(-8 50 40)">
          <ellipse cx="50" cy="40" rx="42" ry="20" fill={shade} />
          <path d="M14 46 Q50 60 86 46 L84 52 Q50 64 16 52 Z" fill={metal} />
          <path d="M48 20 L50 10 L53 20" stroke={dark} strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M22 34 Q34 24 52 24" stroke="#fff" strokeOpacity="0.25" strokeWidth="3" fill="none" />
          <Gem cx={70} cy={44} r={3.5} color={gem} />
          <Sparkle x={80} y={26} s={0.8} />
        </g>
      );
    case "tiara":
      return (
        <g>
          <path d="M8 60 Q50 30 92 60" stroke={metal} strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M22 50 Q30 34 38 42 Q44 22 50 12 Q56 22 62 42 Q70 34 78 50" fill="none" stroke={metal} strokeWidth="3.5" strokeLinejoin="round" />
          {[16, 26, 36, 64, 74, 84].map((x, i) => (
            <circle key={x} cx={x} cy={59 - Math.sin(((x - 8) / 84) * Math.PI) * 15 - 1} r="2.6" fill="#fbf6ec" stroke="#cfc4b0" strokeWidth="0.6" />
          ))}
          <path d="M50 12 L57 26 L50 38 L43 26 Z" fill={gem} stroke={dark} strokeWidth="1.2" />
          <path d="M50 14 L54 25 L50 30 Z" fill="#fff" opacity="0.6" />
          <Sparkle x={50} y={8} s={1.1} />
        </g>
      );
    case "admin_crown":
      return (
        <g>
          <path d="M8 62 L16 20 L30 40 L50 8 L70 40 L84 20 L92 62 Z" fill={metal} stroke="#5c4300" strokeWidth="2.5" strokeLinejoin="round" />
          <rect x="8" y="60" width="84" height="14" rx="3" fill={metal} stroke="#5c4300" strokeWidth="2.5" />
          <Gem cx={16} cy={21} r={4.5} color="#ff2d55" />
          <Gem cx={50} cy={9} r={5.5} color="#3ddcff" />
          <Gem cx={84} cy={21} r={4.5} color="#4dff88" />
          <rect x="14" y="76" width="72" height="16" rx="3" fill="#8b0000" stroke="#3a0000" strokeWidth="1.5" />
          <text x="50" y="88" textAnchor="middle" fontSize="10" fontWeight="900" fill="#f3e5ab" fontFamily="Georgia, serif" letterSpacing="1">
            ADMIN
          </text>
          <Sparkle x={70} y={28} />
        </g>
      );
    default:
      return null;
  }
}

export default function DecorationSVG({ kind, colors, className = "" }) {
  const raw = useId().replace(/:/g, "");
  const id = `d${raw}`;
  const viewBox = kind === "admin_crown" ? "0 0 100 96" : "0 0 100 70";
  return (
    <svg viewBox={viewBox} className={`overflow-visible ${className}`} aria-hidden="true">
      <defs>
        {/* металл: блик сверху, тень снизу */}
        <linearGradient id={`${id}m`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={colors.accent} />
          <stop offset="0.45" stopColor={colors.main} />
          <stop offset="1" stopColor={colors.dark} />
        </linearGradient>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={colors.main} />
          <stop offset="1" stopColor={colors.dark} />
        </linearGradient>
      </defs>
      <g style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.6))" }}>
        <Shape kind={kind} colors={colors} id={id} />
      </g>
    </svg>
  );
}
