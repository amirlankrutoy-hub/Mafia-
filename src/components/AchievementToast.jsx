import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { categoryOf } from "../data/achievementCategories";
import "../achievements.css";

const SHOW_MS = 4600;
const LEAVE_MS = 650;

// Искры, разлетающиеся от медали
const SPARKS = Array.from({ length: 18 }, (_, i) => {
  const angle = (i / 18) * Math.PI * 2;
  const dist = 70 + (i % 3) * 28;
  return {
    x: Math.cos(angle) * dist,
    y: Math.sin(angle) * dist,
    delay: 0.45 + (i % 4) * 0.06,
    size: 4 + (i % 3) * 2
  };
});

/**
 * Флаг-вымпел «Достижение выполнено»: спускается сверху с жёлтым свечением,
 * лучами, искрами и бликом. Несколько достижений показываются по очереди.
 */
const AchievementToast = () => {
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const onUnlocked = (e) => setQueue((q) => [...q, { ...e.detail, key: `${e.detail.id}-${Date.now()}` }]);
    window.addEventListener("mafia-achievement-unlocked", onUnlocked);
    return () => window.removeEventListener("mafia-achievement-unlocked", onUnlocked);
  }, []);

  useEffect(() => {
    if (current || !queue.length) return;
    setCurrent(queue[0]);
    setQueue((q) => q.slice(1));
    setLeaving(false);
  }, [queue, current]);

  useEffect(() => {
    if (!current) return;
    const t = setTimeout(() => setLeaving(true), SHOW_MS);
    return () => clearTimeout(t);
  }, [current]);

  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => {
      setCurrent(null);
      setLeaving(false);
    }, LEAVE_MS);
    return () => clearTimeout(t);
  }, [leaving]);

  if (!current) return null;
  const cat = categoryOf(current);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[300] flex justify-center" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <div className={`ach-flag-wrap ${leaving ? "ach-flag-wrap--leave" : ""} ${current.gold ? "ach-flag-wrap--gold" : ""}`} key={current.key}>
        <div className="ach-flag__aura" />
        <div className="ach-flag__rays" />
        <button type="button" className="ach-flag pointer-events-auto" onClick={() => setLeaving(true)} aria-label="Закрыть">
          <span className="ach-flag__rod" />
          <span className="ach-flag__body">
            <span className="ach-flag__sheen" />
            <span className="ach-flag__label">{current.gold ? "Легендарное достижение" : "Достижение выполнено"}</span>
            <span className="ach-flag__medal">
              <FontAwesomeIcon icon={cat.icon} />
              {SPARKS.map((s, i) => (
                <i
                  key={i}
                  className="ach-flag__spark"
                  style={{ "--x": `${s.x}px`, "--y": `${s.y}px`, "--d": `${s.delay}s`, width: s.size, height: s.size }}
                />
              ))}
            </span>
            <span className="ach-flag__title">{current.title}</span>
            <span className="ach-flag__reward">
              <img src="/krital.svg" alt="" />+{current.reward} теней
            </span>
          </span>
        </button>
      </div>
    </div>
  );
};

export default AchievementToast;
