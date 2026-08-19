import React from "react";

/**
 * Фоновое видео для экрана "Создать/Войти в комнату".
 *
 * Файл видео НЕ включён в этот проект — его нужно положить самостоятельно:
 *   /public/videos/night-city-rain.mp4
 * (опционально ещё .webm той же ночной сцены под дождём для лучшей
 * совместимости — тогда браузер сам выберет подходящий формат).
 *
 * Требования, под которые сделан компонент:
 * - запускается сразу (autoPlay + muted, иначе браузеры блокируют автозапуск)
 * - без звука (muted)
 * - без элементов управления (controls не выставлен)
 * - зацикливается, если ролик короче времени, что человек проведёт на экране
 * - не мешает читать текст/кнопки поверх — тёмная виньетка поверх видео
 */
export default function BackgroundVideo({
  src = "/videos/night-city-rain.mp4",
  webmSrc = "/videos/night-city-rain.webm",
  children
}) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
      >
        {webmSrc && <source src={webmSrc} type="video/webm" />}
        <source src={src} type="video/mp4" />
      </video>

      {/* Затемнение, чтобы текст и кнопки читались поверх видео */}
      <div className="absolute inset-0 bg-black/55" />

      <div className="relative z-10">{children}</div>
    </div>
  );
}
