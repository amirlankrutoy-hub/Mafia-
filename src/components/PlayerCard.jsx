import { useState } from "react";
import AvatarPicker from "./AvatarPicker";
import { socket } from "../socket";
import DecorationSVG from "./shop/DecorationSVG";
import { DECORATIONS, ADMIN_DECORATION } from "../data/shopData";

const ALL_DECORATIONS = [...DECORATIONS, ADMIN_DECORATION];

export default function PlayerCard({
    player,
    isMayor,
    activeEmoji,
    isAdminViewer,
    onAdminGive
}) {
    const [showPicker, setShowPicker] = useState(false);
    const decoration = ALL_DECORATIONS.find((d) => d.id === player.decoration);

    return (
        <>
            <div
                className="relative w-full bg-[#1c1c1c] rounded-2xl border border-yellow-700 shadow-lg overflow-hidden hover:scale-105 transition"
                onClick={() => {
                    if (player.id === socket.id) {
                        setShowPicker(true);
                    }
                }}
            >
                {decoration && (
                    <DecorationSVG
                        kind={decoration.kind}
                        colors={decoration.colors}
                        className="absolute -top-6 left-1/2 -translate-x-1/2 w-24 z-10 pointer-events-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]"
                    />
                )}

                {activeEmoji && (
                    <div className="absolute -top-4 right-2 z-20 text-3xl animate-bounce drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                        {activeEmoji}
                    </div>
                )}

                <div className="h-40 bg-black flex items-center justify-center">
                    <img
                        src={player.avatar || "/avatars/avatar1.svg"}
                        alt={player.name}
                        className="w-full object-cover"
                    />
                </div>

                <div className="p-4 text-center">
                    <h3 className="text-xl font-bold text-white flex justify-center items-center gap-2">
                        {player.name}
                        {isMayor && (
                            <span className="text-yellow-400 text-2xl">👑</span>
                        )}
                    </h3>
                    <p className="text-gray-400 mt-2">
                        {isMayor ? "Мэр" : "Игрок"}
                    </p>
                </div>

                {isAdminViewer && player.id !== socket.id && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            const amount = window.prompt(
                                `Сколько Мафио выдать игроку «${player.name}»?`,
                                "1000"
                            );
                            const value = Number(amount);
                            if (value > 0) onAdminGive?.(player.id, value);
                        }}
                        className="w-full bg-[#d4af37] text-black text-xs font-bold py-1.5 hover:brightness-110"
                    >
                        + Выдать Мафио
                    </button>
                )}
            </div>
            {showPicker && (
                <AvatarPicker
                    onClose={() => setShowPicker(false)}
                    onSelect={(image) => {
                        console.log("Выбран аватар:", image);
                        setShowPicker(false);
                    }}
                />
            )}
        </>
    );
}
