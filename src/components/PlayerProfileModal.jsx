import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faTrophy, faStar } from "@fortawesome/free-solid-svg-icons";
import { getProfile } from "../services/presence";
import roles from "../data/roles";

const DEFAULT_ICON = "/avatars/avatar1.svg";

export default function PlayerProfileModal({ accountId, fallbackName, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getProfile(accountId).then((p) => {
      if (!cancelled) {
        setProfile(p);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  if (!accountId) return null;

  const favoriteRole = roles.find((r) => r.id === profile?.favoriteRole);

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl border border-[#d4af37]/40 bg-[#120a07] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 text-[#c5a059] hover:text-[#d4af37]"
        >
          <FontAwesomeIcon icon={faXmark} size="lg" />
        </button>

        {loading ? (
          <p className="py-10 text-center text-sm text-[#8b6b12]">Загрузка...</p>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <img
              src={profile?.icon || DEFAULT_ICON}
              alt=""
              className="h-24 w-24 rounded-full border-2 border-[#d4af37] object-cover"
            />
            <div className="text-center">
              <p className="text-lg font-black text-[#f3e5ab]">
                {profile?.name || fallbackName || "Игрок"}
              </p>
              <p className="font-mono text-xs text-[#8b6b12]">ID: {accountId}</p>
            </div>

            <div className="mt-2 grid w-full grid-cols-1 gap-2">
              <div className="flex items-center justify-between rounded-lg border border-[#d4af37]/25 bg-[#0d0705]/70 px-3 py-2">
                <span className="flex items-center gap-2 text-xs font-bold text-[#c5a059]">
                  <FontAwesomeIcon icon={faTrophy} className="text-[#d4af37]" />
                  Побед
                </span>
                <span className="text-sm font-bold text-[#f3e5ab]">
                  {profile?.wins ?? 0}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-[#d4af37]/25 bg-[#0d0705]/70 px-3 py-2">
                <span className="flex items-center gap-2 text-xs font-bold text-[#c5a059]">
                  <FontAwesomeIcon icon={faStar} className="text-[#d4af37]" />
                  Любимая роль
                </span>
                <span className="text-sm font-bold text-[#f3e5ab]">
                  {favoriteRole ? favoriteRole.name : "Не выбрана"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
