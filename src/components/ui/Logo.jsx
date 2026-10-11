// Логотип с золотым ореолом и пробегающим бликом
export default function Logo({ size = 64, intro = false, float = false, className = "" }) {
  return (
    <span
      className={`logo-glow ${float ? "anim-float" : ""} ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={size > 200 ? "/logo.webp" : "/logo-256.webp"}
        alt="Mafia Play — логотип"
        width={size}
        height={size}
        className={`block h-full w-full object-contain select-none ${intro ? "logo-intro" : ""}`}
        draggable="false"
      />
      <span className="logo-sheen" />
    </span>
  );
}
