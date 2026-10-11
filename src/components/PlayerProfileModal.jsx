import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faUserPlus, faCopy } from "@fortawesome/free-solid-svg-icons";
import { getProfile, sendFriendRequest } from "../services/presence";
import { getMyAccount } from "../services/accounts";
import { toast } from "../services/toast";
import roles from "../data/roles";
import Modal from "./ui/Modal";
import Avatar from "./ui/Avatar";

export default function PlayerProfileModal({ accountId, fallbackName, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const me = getMyAccount();

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
  const games = Math.max(profile?.games || 0, profile?.wins || 0);
  const winrate = games ? Math.round(((profile?.wins || 0) / games) * 100) : 0;

  return (
    <Modal onClose={onClose}>
      <button onClick={onClose} className="absolute right-4 top-4 rounded-full p-2 text-[#a8916c] hover:text-[#f3d27a]" aria-label="Закрыть">
        <FontAwesomeIcon icon={faXmark} />
      </button>
      {loading ? (
        <p className="py-10 text-center text-[#a8916c] animate-pulse">Загрузка профиля…</p>
      ) : (
        <div className="text-center">
          <Avatar src={profile?.icon} size={104} online={!!profile?.online} className="mx-auto anim-pop" />
          <h3 className="mt-4 font-display text-3xl font-black gold-text">{profile?.name || fallbackName || `Игрок #${accountId}`}</h3>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(accountId);
              toast({ kind: "success", text: "ID скопирован" });
            }}
            className="mt-1 font-mono text-sm text-[#a8916c] hover:text-[#f3d27a]"
          >
            #{accountId} <FontAwesomeIcon icon={faCopy} className="ml-1 text-xs" />
          </button>

          <div className="mt-6 grid grid-cols-4 gap-2">
            {[
              ["Побед", profile?.wins || 0],
              ["Игр", games],
              ["Винрейт", `${winrate}%`],
              ["MVP", profile?.mvp || 0]
            ].map(([l, v], i) => (
              <div key={l} className="rounded-xl bg-black/35 py-3 ring-1 ring-[#d4af37]/10 anim-fade-up" style={{ "--i": i }}>
                <div className="font-display text-xl font-black text-[#f3d27a]">{v}</div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-[#a8916c]">{l}</div>
              </div>
            ))}
          </div>

          {favoriteRole && (
            <div className="mt-4 flex items-center gap-3 rounded-xl bg-black/30 p-3 text-left ring-1 ring-[#d4af37]/10">
              <img src={favoriteRole.image} alt="" className="h-12 w-12 rounded-lg object-cover" />
              <div>
                <div className="eyebrow !text-[0.55rem]">Любимая роль</div>
                <div className="font-bold text-[#f3e5ab]">{favoriteRole.name}</div>
              </div>
            </div>
          )}

          {me && me.id !== accountId && (
            <button
              onClick={async () => {
                const res = await sendFriendRequest(accountId);
                toast({
                  kind: res?.success ? "success" : "error",
                  text: res?.success ? (res.status === "friends" ? "Вы уже друзья" : "Заявка отправлена") : res?.message
                });
              }}
              className="btn btn-gold mt-5 w-full"
            >
              <FontAwesomeIcon icon={faUserPlus} /> Добавить в друзья
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}
