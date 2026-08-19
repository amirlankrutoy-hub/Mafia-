import React, { useState, useRef, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";

const FLAGS = { ru: "🇷🇺", uz: "🇺🇿", en: "🇬🇧" };

export default function LanguageSwitcher({ className = "" }) {
  const { language, setLanguage, languages } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-[#c5a059]/40 bg-[#120a07] px-3 py-1.5 text-sm font-bold text-[#f3e5ab] hover:border-[#d4af37]"
      >
        <span>{FLAGS[language]}</span>
        <span className="uppercase">{language}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-40 overflow-hidden rounded-lg border border-[#c5a059]/40 bg-[#120a07] shadow-lg">
          {languages.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => {
                setLanguage(l.code);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[#1c100b] ${
                l.code === language ? "text-[#d4af37] font-bold" : "text-[#f3e5ab]"
              }`}
            >
              <span>{FLAGS[l.code]}</span>
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
