import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faRightLeft } from "@fortawesome/free-solid-svg-icons";
import "../wallet.css";

const compact = (n) => {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1).replace(".0", "")}M`;
  if (v >= 100_000) return `${Math.round(v / 1000)}K`;
  return v.toLocaleString("ru-RU");
};

/** Значение, которое «подпрыгивает» и подсвечивается при изменении */
function useBump(value) {
  const prev = useRef(value);
  const [dir, setDir] = useState(null);
  useEffect(() => {
    if (prev.current === value) return;
    setDir(value > prev.current ? "up" : "down");
    prev.current = value;
    const t = setTimeout(() => setDir(null), 900);
    return () => clearTimeout(t);
  }, [value]);
  return dir;
}

function Chip({ kind, value, onClick, size }) {
  const bump = useBump(value);
  const teni = kind === "teni";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`wallet-chip wallet-chip--${kind} wallet-chip--${size} ${bump ? `wallet-chip--${bump}` : ""}`}
      title={teni ? "Тени — обменять Токены" : "Токены — пополнить"}
    >
      <span className="wallet-chip__coin">
        <img src={teni ? "/krital.svg" : "/tokens.png"} alt="" />
      </span>
      <span className="wallet-chip__body">
        {size === "lg" && <span className="wallet-chip__label">{teni ? "Тени" : "Токены"}</span>}
        <span className="wallet-chip__value">{size === "lg" ? (Number(value) || 0).toLocaleString("ru-RU") : compact(value)}</span>
      </span>
      <span className="wallet-chip__plus">
        <FontAwesomeIcon icon={teni ? faRightLeft : faPlus} />
      </span>
    </button>
  );
}

/** Балансы игрока: Токены (пополнить) и Тени (обменять). size: "lg" — меню, "sm" — шапка телефона */
export default function WalletChips({ tokens, teni, onTopUp, onExchange, size = "lg", className = "" }) {
  return (
    <div className={`wallet-chips wallet-chips--${size} ${className}`}>
      <Chip kind="tokens" value={tokens} onClick={onTopUp} size={size} />
      <Chip kind="teni" value={teni} onClick={onExchange} size={size} />
    </div>
  );
}
