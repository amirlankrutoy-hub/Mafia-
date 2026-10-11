import { memo, useEffect } from "react";

const EMBERS = Array.from({ length: 18 }, (_, i) => ({
  left: `${(i * 53) % 100}%`,
  s: `${2 + ((i * 7) % 4)}px`,
  d: `${11 + ((i * 5) % 12)}s`,
  delay: `${-((i * 3.3) % 16)}s`,
  x: `${((i % 2 ? 1 : -1) * (20 + ((i * 13) % 70)))}px`
}));

// Атмосферный фон: туман, искры, плёночное зерно и виньетка.
// Плюс подсветка карточек .spotlight, следующая за курсором.
function Ambient() {
  useEffect(() => {
    const onMove = (e) => {
      const el = e.target.closest?.(".spotlight");
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <div className="ambient" aria-hidden="true">
      <div className="ambient__fog ambient__fog--a" />
      <div className="ambient__fog ambient__fog--b" />
      {EMBERS.map((e, i) => (
        <span
          key={i}
          className="ember"
          style={{ left: e.left, "--s": e.s, "--d": e.d, "--delay": e.delay, "--x": e.x }}
        />
      ))}
      <div className="ambient__grain" />
      <div className="ambient__vignette" />
    </div>
  );
}

export default memo(Ambient);
