// DecorationSVG.jsx — рисует украшение поверх аватарки по его "kind".

function Shape({ kind, colors }) {
  const { main, accent, dark } = colors;

  switch (kind) {
    case "cap":
      return (
        <g>
          <path d="M10 55 Q50 15 90 55 L90 65 L10 65 Z" fill={main} stroke={dark} strokeWidth="2" />
          <path d="M55 40 Q85 40 90 65 L60 65 Z" fill={accent} opacity="0.85" />
          <circle cx="50" cy="20" r="5" fill={accent} />
        </g>
      );
    case "tophat":
      return (
        <g>
          <rect x="20" y="10" width="60" height="45" rx="4" fill={main} stroke={dark} strokeWidth="2" />
          <rect x="8" y="52" width="84" height="12" rx="3" fill={main} stroke={dark} strokeWidth="2" />
          <rect x="20" y="40" width="60" height="10" fill={accent} />
        </g>
      );
    case "crown":
      return (
        <g>
          <path
            d="M12 60 L20 25 L38 45 L50 15 L62 45 L80 25 L88 60 Z"
            fill={main}
            stroke={dark}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <rect x="12" y="58" width="76" height="10" fill={main} stroke={dark} strokeWidth="2" />
          <circle cx="20" cy="26" r="4" fill={accent} />
          <circle cx="50" cy="16" r="4.5" fill={accent} />
          <circle cx="80" cy="26" r="4" fill={accent} />
        </g>
      );
    case "headband":
      return (
        <g>
          <rect x="8" y="45" width="84" height="14" rx="7" fill={main} stroke={dark} strokeWidth="2" />
          <circle cx="50" cy="52" r="7" fill={accent} />
        </g>
      );
    case "halo":
      return (
        <ellipse
          cx="50"
          cy="20"
          rx="30"
          ry="9"
          fill="none"
          stroke={main}
          strokeWidth="6"
          opacity="0.9"
        />
      );
    case "horns":
      return (
        <g fill={main} stroke={dark} strokeWidth="2">
          <path d="M25 55 Q15 25 32 12 Q30 35 38 50 Z" />
          <path d="M75 55 Q85 25 68 12 Q70 35 62 50 Z" />
        </g>
      );
    case "flower":
      return (
        <g>
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <ellipse
              key={deg}
              cx="50"
              cy="35"
              rx="9"
              ry="16"
              fill={main}
              stroke={dark}
              strokeWidth="1"
              transform={`rotate(${deg} 50 35)`}
            />
          ))}
          <circle cx="50" cy="35" r="8" fill={accent} />
        </g>
      );
    case "bandana":
      return (
        <g>
          <path d="M10 50 Q50 30 90 50 L90 60 Q50 45 10 60 Z" fill={main} stroke={dark} strokeWidth="2" />
          <path d="M70 55 L92 70 L74 62 Z" fill={main} stroke={dark} strokeWidth="1.5" />
        </g>
      );
    case "beanie":
      return (
        <g>
          <path d="M15 55 Q50 10 85 55 Z" fill={main} stroke={dark} strokeWidth="2" />
          <rect x="12" y="52" width="76" height="12" rx="5" fill={accent} />
          <circle cx="50" cy="12" r="6" fill={accent} />
        </g>
      );
    case "partyhat":
      return (
        <g>
          <path d="M50 8 L78 60 L22 60 Z" fill={main} stroke={dark} strokeWidth="2" />
          <circle cx="50" cy="8" r="5" fill={accent} />
          <circle cx="44" cy="30" r="3" fill={accent} />
          <circle cx="58" cy="40" r="3" fill={accent} />
          <circle cx="50" cy="52" r="3" fill={accent} />
        </g>
      );
    case "admin_crown":
      // Эксклюзивная корона администратора — тщательно проработанная,
      // с зубцами, самоцветами и лентой "ADMIN"
      return (
        <g>
          <defs>
            <linearGradient id="adminGold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fff3c4" />
              <stop offset="45%" stopColor="#ffd700" />
              <stop offset="100%" stopColor="#a97c00" />
            </linearGradient>
          </defs>
          <path
            d="M8 62 L16 20 L30 40 L50 8 L70 40 L84 20 L92 62 Z"
            fill="url(#adminGold)"
            stroke="#5c4300"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <rect x="8" y="60" width="84" height="14" rx="3" fill="url(#adminGold)" stroke="#5c4300" strokeWidth="2.5" />
          <circle cx="16" cy="21" r="4.5" fill="#ff2d55" stroke="#5c4300" strokeWidth="1" />
          <circle cx="50" cy="9" r="5.5" fill="#3ddcff" stroke="#5c4300" strokeWidth="1" />
          <circle cx="84" cy="21" r="4.5" fill="#4dff88" stroke="#5c4300" strokeWidth="1" />
          <circle cx="33" cy="42" r="3" fill="#fff" opacity="0.9" />
          <circle cx="67" cy="42" r="3" fill="#fff" opacity="0.9" />
          <rect x="14" y="76" width="72" height="16" rx="3" fill="#8b0000" stroke="#3a0000" strokeWidth="1.5" />
          <text
            x="50"
            y="88"
            textAnchor="middle"
            fontSize="10"
            fontWeight="900"
            fill="#f3e5ab"
            fontFamily="Georgia, serif"
            letterSpacing="1"
          >
            ADMIN
          </text>
        </g>
      );
    default:
      return null;
  }
}

export default function DecorationSVG({ kind, colors, className = "" }) {
  const viewBox = kind === "admin_crown" ? "0 0 100 96" : "0 0 100 70";
  return (
    <svg viewBox={viewBox} className={className} aria-hidden="true">
      <Shape kind={kind} colors={colors} />
    </svg>
  );
}
