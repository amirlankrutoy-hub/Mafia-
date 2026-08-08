import React, { useState, useEffect } from 'react';

const NameModal = ({
  onSaveName,
  existingName,
  title = "ПРЕДСТАВЬТЕСЬ",
  subtitle = "Семья должна знать, с кем имеет дело. Введите ваше имя для входа.",
  placeholder = "Ваше имя...",
  buttonText = "ВОЙТИ"
}) => {
  const [inputName, setInputName] = useState('');
  const [isChanging, setIsChanging] = useState(false);

  const hasSavedName = Boolean(existingName) && !isChanging;

  useEffect(() => {
    if (existingName) {
      setInputName(existingName);
    }
  }, [existingName]);

const handleSubmit = (e) => {
  e.preventDefault();

  if (!inputName.trim()) return;

  onSaveName(inputName.trim());
};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4">
      <div className="relative w-full max-w-sm sm:max-w-md overflow-hidden rounded-2xl border-2 border-[#d4af37] bg-gradient-to-b from-[#1c100b] via-[#120a07] to-[#080402] p-5 sm:p-8 shadow-[0_0_50px_rgba(212,175,55,0.3)] text-center">
        {/* Декоративные уголки */}
        <div className="absolute top-2 left-2 h-3.5 w-3.5 sm:h-4 sm:w-4 border-t-2 border-l-2 border-[#d4af37]" />
        <div className="absolute top-2 right-2 h-3.5 w-3.5 sm:h-4 sm:w-4 border-t-2 border-r-2 border-[#d4af37]" />
        <div className="absolute bottom-2 left-2 h-3.5 w-3.5 sm:h-4 sm:w-4 border-b-2 border-l-2 border-[#d4af37]" />
        <div className="absolute bottom-2 right-2 h-3.5 w-3.5 sm:h-4 sm:w-4 border-b-2 border-r-2 border-[#d4af37]" />

       <img className="w-[50px] h-[50px] mx-auto" src="/favicon.svg" alt="" />
       <br />

        {hasSavedName ? (
          <div className="space-y-4 sm:space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-widest text-[#d4af37]">
                С возвращением!
              </h2>
              <p className="mt-2 sm:mt-3 text-base sm:text-lg font-bold text-[#f3e5ab]">
                {existingName}
              </p>
              <p className="mt-1 text-[11px] sm:text-xs italic text-[#c5a059]">
                Семья рада видеть вас снова в штабе.
              </p>
            </div>

            <div className="space-y-2.5 sm:space-y-3">
              <button
                onClick={() => onSaveName(existingName)}
                className="w-full rounded-lg bg-gradient-to-r from-[#8b0000] to-[#5c0000] py-2.5 sm:py-3 text-xs sm:text-sm font-bold uppercase tracking-wider text-[#f3e5ab] border border-[#d4af37] transition-all hover:shadow-[0_0_20px_rgba(212,175,55,0.4)]"
              >
                Продолжить
              </button>

              <button
                type="button"
                onClick={() => setIsChanging(true)}
                className="w-full rounded-lg border border-[#c5a059]/40 bg-[#0d0907] py-2 text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-[#c5a059] transition-all hover:border-[#d4af37] hover:text-[#d4af37]"
              >
                Сменить имя
              </button>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-widest text-[#d4af37]">
    {title}
</h2>
            <p className="mt-1.5 sm:mt-2 text-[11px] sm:text-xs italic text-[#c5a059]">
    {subtitle}
</p>

            <form onSubmit={handleSubmit} className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
              <input
                type="text"
                placeholder={placeholder}
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                className="w-full rounded-lg border border-[#c5a059]/40 bg-[#0d0907] px-3 py-2.5 sm:px-4 sm:py-3 text-center text-sm text-[#e6d5bc] placeholder-[#c5a059]/40 focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                autoFocus
              />
              <button
                type="submit"
                className="w-full rounded-lg bg-gradient-to-r from-[#8b0000] to-[#5c0000] py-2.5 sm:py-3 text-xs sm:text-sm font-bold uppercase tracking-wider text-[#f3e5ab] border border-[#d4af37] transition-all hover:shadow-[0_0_20px_rgba(212,175,55,0.4)]"
              >
                {buttonText}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default NameModal;