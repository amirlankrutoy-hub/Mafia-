import { useState, useEffect } from "react";

const STORY_PAGES = [
  { image: "/page1.png" },
  { image: "/page2.png" },
  { image: "/page3.png" },
  { image: "/page4.png" },
  { image: "/page5.png" }
];

export default function StoryIntro({ onFinish }) {
  const [page, setPage] = useState(0);
  const [fade, setFade] = useState(true);

  const current = STORY_PAGES[page];
  const isLast = page === STORY_PAGES.length - 1;

  useEffect(() => {
    setFade(false);
    const t = setTimeout(() => setFade(true), 50);
    return () => clearTimeout(t);
  }, [page]);

  const goNext = () => {
    if (isLast) {
      onFinish?.();
    } else {
      setPage((p) => p + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] bg-black overflow-hidden">

      {/* Картинка */}
      <div className="absolute inset-0 flex items-center justify-center">

        <img
          key={current.image}
          src={current.image}
          alt=""
          className={`max-w-full max-h-full object-contain transition-opacity duration-500 ${
            fade ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Затемнение */}
        <div className="absolute inset-0 bg-black/20 pointer-events-none" />

        {/* Нижняя тень */}
        <div className="absolute bottom-0 left-0 right-0 h-56 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none" />

      </div>

      {/* Индикатор */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
        <div className="rounded-full border border-[#d4af37] bg-[#17120d]/90 px-6 py-2 text-[#d4af37] font-bold">
          {page + 1} / {STORY_PAGES.length}
        </div>
      </div>

      {/* Кнопки */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 w-full max-w-xl px-6">

        <div className="flex gap-5">

          <button
            onClick={() => onFinish?.()}
            className="flex-1 rounded-xl border-2 border-[#d4af37] bg-[#1a1a1a]/90 py-4 font-bold uppercase tracking-wider text-[#d4af37] transition duration-200 hover:bg-[#292929]"
          >
            ПРОПУСТИТЬ
          </button>

          <button
            onClick={goNext}
            className="flex-[1.3] rounded-xl border-2 border-[#d4af37] bg-gradient-to-r from-[#8b0000] to-[#5c0000] py-4 font-bold uppercase tracking-wider text-[#f3e5ab] transition duration-200 hover:brightness-110"
          >
            {isLast ? "ВОЙТИ В ИГРУ →" : "ДАЛЕЕ →"}
          </button>

        </div>

      </div>

    </div>
  );
}