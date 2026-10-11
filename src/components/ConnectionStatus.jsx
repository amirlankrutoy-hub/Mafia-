import { useEffect, useState } from "react";
import { socket } from "../socket";

// Плашка "нет связи с сервером" — показывается, только если связь
// пропала дольше чем на пару секунд (короткие переподключения не мигают).
export default function ConnectionStatus() {
  const [down, setDown] = useState(false);

  useEffect(() => {
    let timer = null;
    const onDown = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setDown(true), 2500);
    };
    const onUp = () => {
      clearTimeout(timer);
      setDown(false);
    };
    socket.on("connect_error", onDown);
    socket.on("disconnect", onDown);
    socket.on("connect", onUp);
    return () => {
      clearTimeout(timer);
      socket.off("connect_error", onDown);
      socket.off("disconnect", onDown);
      socket.off("connect", onUp);
    };
  }, []);

  if (!down) return null;
  return (
    <div className="fixed bottom-4 left-1/2 z-[2500] -translate-x-1/2 toast-in">
      <div className="flex items-center gap-3 rounded-full border border-red-500/40 bg-[#1a0606]/95 px-5 py-2.5 text-sm text-red-200 shadow-2xl backdrop-blur">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
        <span>
          Подключаемся к серверу…
          <span className="block text-[11px] text-red-200/60">Если сервер «спал», он проснётся за 30–60 секунд</span>
        </span>
      </div>
    </div>
  );
}
