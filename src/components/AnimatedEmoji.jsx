// Анимированный эмодзи: у каждого своё движение, подходящее по смыслу
const ANIM = {
  e_laugh: "em-laugh",
  e_heart: "em-heart",
  e_fire: "em-fire",
  e_skull: "em-wobble",
  e_clap: "em-clap",
  e_think: "em-tilt",
  e_gun: "em-recoil",
  e_knife: "em-stab",
  e_mask: "em-flip",
  e_eyes: "em-look",
  e_cry: "em-cry",
  e_angry: "em-angry",
  e_moon: "em-float",
  e_ghost: "em-ghost",
  e_devil: "em-bounce",
  e_star: "em-spin",
  e_crown: "em-crown",
  e_100: "em-pop",
  e_shush: "em-tilt",
  e_lock: "em-angry",
  e_candle: "em-fire",
  e_bomb: "em-bomb",
  e_handcuffs: "em-swing",
  e_wine: "em-swing",
  e_admin: "em-crown",
  e_scales: "em-tilt",
  e_gavel: "em-stab",
  e_judge: "em-bounce",
  e_chains: "em-swing",
  e_scroll: "em-float"
};

export default function AnimatedEmoji({ id, symbol, className = "", paused = false }) {
  return (
    <span
      className={`inline-block select-none ${ANIM[id] || "em-bounce"} ${paused ? "[animation-play-state:paused]" : ""} ${className}`}
      aria-hidden="true"
    >
      {symbol}
    </span>
  );
}
