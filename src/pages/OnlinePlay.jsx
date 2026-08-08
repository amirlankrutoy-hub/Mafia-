import { useEffect, useState } from "react";

import Lobby from "../components/Lobby";
import PartySetup from "../components/PartySetup";
import RoleRoulette from "../components/RoleRoulette";
import NameModal from "../components/NameModal";
import AvatarPicker from "../components/AvatarPicker";
import GameRoom from "./game/GameRoom";

import {
    createRoom,
    joinRoom,
    setupRoles,
    startGame,
    onPlayersUpdated,
    onYourRole,
    onLobbyConfiguring,
    onLoadingGame,
    beginLobbyConfig,

} from "../services/roomService";

import { socket } from "../socket";
import { EMOJIS } from "../data/shopData";
import { credit, getEquippedDecoration, ownsEmoji } from "../services/wallet";
import { isAdmin } from "../services/admin";
import LoadingSpinner from '../components/LoadingSpinner';


export default function OnlinePlay() {

    // -------------------------
    // ЭКРАН
    // -------------------------

    const [view, setView] = useState("menu");

    // menu
    // code
    // name
    // avatar
    // lobby

    // -------------------------
    // ДЕЙСТВИЕ
    // -------------------------

    const [action, setAction] = useState(null);

    // create
    // join

    // -------------------------
    // ДАННЫЕ
    // -------------------------

    const [roomCode, setRoomCode] = useState("");
    const [joinCode, setJoinCode] = useState("");

    const [playerName, setPlayerName] = useState("");
    const [playerAvatar, setPlayerAvatar] = useState("");

    const [players, setPlayers] = useState([]);
    const [playerReady, setPlayerReady] = useState(false);
    const [mayor, setMayor] = useState(null);
    const [emojiMap, setEmojiMap] = useState({});

    // -------------------------
    // ИГРА
    // -------------------------

    const [myRole, setMyRole] = useState(null);

    const [showRoulette, setShowRoulette] = useState(false);

    const [showPartySetup, setShowPartySetup] = useState(false);

    const [selectedRoles, setSelectedRoles] = useState({});

    const [lobbyConfiguring, setLobbyConfiguring] = useState(false);

    const [loadingStart, setLoadingStart] = useState(false);

    const [loadingGame, setLoadingGame] = useState(false);

    const [waitingMayor, setWaitingMayor] = useState(false);

    const [partyStarted, setPartyStarted] = useState(false);

    const [canSetupGame, setCanSetupGame] = useState(false); 

    const [inGame, setInGame] = useState(false);

    useEffect(() => {

        socket.connect();

        socket.on("connect", () => {

            console.log("Socket:", socket.id);

        });

        return () => {

            socket.off("connect");

        };

    }, []);

    // If page opened with ?autojoin=CODE, prefill join flow
    useEffect(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            const auto = params.get('autojoin');
            if (auto) {
                setJoinCode(auto.toUpperCase());
                setAction('join');
                setView('name');
            }
        } catch (e) {
            console.warn('autojoin parse error', e);
        }
    }, []);
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get("autojoin")) return;

        const raw = localStorage.getItem("mafia_lobby");
        if (!raw) return;

        let session;
        try {
            session = JSON.parse(raw);
        } catch {
            localStorage.removeItem("mafia_lobby");
            return;
        }

        if (!session?.roomCode || !session?.playerName) return;

        setRoomCode(session.roomCode);
        setJoinCode(session.roomCode);
        setPlayerName(session.playerName);
        setPlayerAvatar(session.avatar || "");
        setAction(session.isMayor ? "create" : "join");

        const restore = async () => {
            if (!socket.connected) {
                socket.connect();
                await new Promise(resolve => {
                    if (socket.connected) return resolve();
                    socket.once("connect", resolve);
                });
            }
            const leaveLobby = () => {
                if (roomCode) {
                    socket.emit("leave-room", roomCode);
                }
                localStorage.removeItem("mafia_lobby");
                setView("menu");
                setRoomCode("");
                setPlayers([]);
                setMayor(null);
                setPlayerReady(false);
                setCanSetupGame(false);
                setShowPartySetup(false);
                setAction(null);
            };

            const response = await joinRoom(
                session.roomCode,
                session.playerName,
                session.avatar || "/avatars/avatar1.svg"
            );

            if (!response?.success) {
                console.warn("restore failed", response);
                localStorage.removeItem("mafia_lobby");
                setView("menu");
                return;
            }

            setRoomCode(response.roomCode);
            setPlayers(response.players || []);
            setMayor(response.mayor || null);
            setView("lobby");
            console.log("Лобби восстановлено после F5");
        };

        restore();
    }, []);

    useEffect(() => {
        onPlayersUpdated((list) => {
            console.log("Players:", list);

            // убираем дубликаты
            const unique = [];
            const seen = new Set();
            for (const p of list || []) {
                if (!seen.has(p.id)) {
                    seen.add(p.id);
                    unique.push(p);
                }
            }

            setPlayers(unique);

            const me = unique.find(player => player.id === socket.id);
            if (me) setPlayerReady(me.ready);
        });
    }, []);
    useEffect(() => {
        const handler = (updatedPlayers) => {
            console.log("ПОЛУЧЕН players-ready", updatedPlayers);

            setPlayers(prev => {
                const merged = (updatedPlayers || []).map(u => {
                    const old = prev.find(p => p.id === u.id);
                    return {
                        id: u.id,
                        name: u.name || old?.name || "Игрок",
                        avatar: u.avatar || old?.avatar || "/avatars/avatar1.svg",
                        ready: !!u.ready,
                        decoration: u.decoration ?? old?.decoration ?? null
                    };
                });

                const seen = new Set();
                return merged.filter(p => {
                    if (seen.has(p.id)) return false;
                    seen.add(p.id);
                    return true;
                });
            });

            const me = (updatedPlayers || []).find(p => p.id === socket.id);
            if (me) setPlayerReady(!!me.ready);
        };

        socket.on("players-ready", handler);
        return () => socket.off("players-ready", handler);
    }, []);

    // Эмодзи над карточками игроков (пропадает через 3 секунды)
    useEffect(() => {
        const onEmoji = ({ playerId, emojiId }) => {
            const emoji = EMOJIS.find((e) => e.id === emojiId);
            if (!emoji) return;
            setEmojiMap((prev) => ({ ...prev, [playerId]: emoji.symbol }));
            setTimeout(() => {
                setEmojiMap((prev) => {
                    const next = { ...prev };
                    delete next[playerId];
                    return next;
                });
            }, 3000);
        };

        const onCurrency = ({ amount }) => {
            if (amount > 0) credit(amount);
        };

        socket.on("emoji-sent", onEmoji);
        socket.on("you-received-currency", onCurrency);

        return () => {
            socket.off("emoji-sent", onEmoji);
            socket.off("you-received-currency", onCurrency);
        };
    }, []);

    // Рассылаем своё надетое украшение остальным, как только оказались
    // в комнате (и если сменили украшение прямо во время лобби)
    useEffect(() => {
        if (!roomCode) return;

        const broadcastDecoration = () => {
            socket.emit("set-decoration", roomCode, getEquippedDecoration());
        };

        broadcastDecoration();
        window.addEventListener("mafia-wallet-changed", broadcastDecoration);
        return () =>
            window.removeEventListener("mafia-wallet-changed", broadcastDecoration);
    }, [roomCode]);

    function sendEmoji(emojiId) {
        if (!roomCode) return;
        socket.emit("send-emoji", roomCode, emojiId);
    }

    function adminGiveCurrency(targetId, amount) {
        if (!roomCode) return;
        socket.emit("admin-give-currency", roomCode, targetId, amount);
    }

    useEffect(() => {

        onLobbyConfiguring(() => {
            setLobbyConfiguring(true);
        });

    }, []);

    useEffect(() => {

        onLoadingGame(() => {
            setLoadingGame(true);
            setLobbyConfiguring(false);
        });

    }, []);

    useEffect(() => {

        onYourRole((role) => {
            setMyRole(role);
            setLoadingStart(false);
            setLoadingGame(true);
            setShowRoulette(false);

        });

    }, []);

    // Мэр не получает роль — входит в GameRoom по фазе waiting_ready
    useEffect(() => {
        const onPhase = (data) => {
            if (!data?.phase) return;
            const amMayor = mayor?.id === socket.id;
            if (amMayor && (data.phase === "waiting_ready" || data.phase === "night" || data.phase === "night_end")) {
                setLoadingStart(false);
                setLoadingGame(false);
                setShowRoulette(false);
                setInGame(true);
            }
        };
        socket.on("game-phase", onPhase);
        return () => socket.off("game-phase", onPhase);
    }, [mayor]);

    useEffect(() => {
        if (loadingGame && myRole) {
            const timer = setTimeout(() => {
                setLoadingGame(false);
                setShowRoulette(true);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [loadingGame, myRole]);
    // PartySetup.jsx


    useEffect(() => {

        socket.on("open-party-setup", () => {

            console.log("👑 Открываем выбор ролей");

            setShowPartySetup(true);

        });

        return () => {

            socket.off("open-party-setup");

        };

    }, []);
    useEffect(() => {

        socket.on("waiting-party-setup", () => {

            setWaitingMayor(true);
            setPartyStarted(true);

        });

        return () => {

            socket.off("waiting-party-setup");

        };

    }, []);
    useEffect(() => {

        socket.on("everyone-ready", () => {
            console.log("🔥 everyone-ready ПОЛУЧЕН");

            setCanSetupGame(true);

        });

        return () => {

            socket.off("everyone-ready");

        };

    }, []);
    useEffect(() => {
        console.log("canSetupGame =", canSetupGame);
    }, [canSetupGame]);
    // ==========================
    // СОЗДАТЬ КОМНАТУ
    // ==========================

    const handleCreate = () => {

        setAction("create");

        setView("name");

    };

    // ==========================
    // ВОЙТИ В КОМНАТУ
    // ==========================

    const handleJoin = () => {

        setAction("join");

        setView("code");

    };

    // ==========================
    // СОХРАНИТЬ КОД КОМНАТЫ
    // ==========================

    const handleSaveCode = (code) => {

        setJoinCode(code.toUpperCase());

        setView("name");

    };

    // ==========================
    // СОХРАНИТЬ ИМЯ
    // ==========================

    const handleSaveName = (name) => {

        setPlayerName(name);

        setView("avatar");

    };

    // ==========================
    // ВЫБОР АВАТАРА
    // ==========================

    const handleAvatarSelect = async (avatar) => {
        console.log("handleAvatarSelect старт, avatar =", avatar);

        setPlayerAvatar(avatar);

        // ---------- СОЗДАТЬ ----------
        if (action === "create") {
            const response = await createRoom(playerName, avatar);
            console.log("createRoom ответ:", response);

            if (!response || !response.success) {
                alert("Не удалось создать комнату");
                setView("menu");
                return;
            }

            setRoomCode(response.roomCode);
            setPlayers(response.players || []);
            setMayor(response.mayor || null);
            setView("lobby");

            const session = {
                roomCode: response.roomCode,
                playerName,
                avatar,
                isMayor: action === "create",
                action
            };
            localStorage.setItem("mafia_lobby", JSON.stringify(session));
            return;
        }

        // ---------- ВОЙТИ ----------
        const response = await joinRoom(joinCode, playerName, avatar);
        console.log("joinRoom ответ:", response);
        setPlayers(
            (response.players || []).filter(
                (p, i, arr) => arr.findIndex(x => x.id === p.id) === i
            )
        );

        if (!response || !response.success) {
            alert(response?.message || "Не удалось войти в комнату");
            setView("menu");
            return;
        }

        setRoomCode(response.roomCode);
        setPlayers(response.players || []);
        setMayor(response.mayor || null);   // если сервер отдаёт mayor
        setView("lobby");

        const session = {
            roomCode: response.roomCode,
            playerName,
            avatar,
            isMayor: false,
            action
        };
        localStorage.setItem("mafia_lobby", JSON.stringify(session));
    };

    // ==========================
    // НАЧАТЬ ИГРУ
    // ==========================

    const handlePartyStart = (roles) => {

        setSelectedRoles(roles);

        setupRoles(roomCode, roles);

        setupRoles(roomCode, roles);

        // только после нажатия "Начать игру"
        // игрокам придет событие waiting-party-setup
        beginLobbyConfig(roomCode);
        setShowPartySetup(false);

        // экран загрузки только у мэра
        setLoadingStart(true);

        setPartyStarted(true);

        setTimeout(() => {
            startGame(roomCode);
        }, 3000);




    };
    const handlePlayerReady = () => {
        if (!roomCode) {
            console.warn("Нет roomCode");
            return;
        }

        console.log("Отправляем player-ready", roomCode, socket.id);

        // Сразу меняем UI у себя
        setPlayerReady(prev => !prev);
        setPlayers(prev =>
            prev.map(p =>
                p.id === socket.id ? { ...p, ready: !p.ready } : p
            )
        );

        if (!socket.connected) {
            socket.connect();
        }

        socket.emit("player-ready", roomCode);
    };
    const leaveLobby = () => {
        if (roomCode) {
            socket.emit("leave-room", roomCode);
        }
        localStorage.removeItem("mafia_lobby");
        setView("menu");
        setRoomCode("");
        setJoinCode("");
        setPlayers([]);
        setMayor(null);
        setPlayerReady(false);
        setCanSetupGame(false);
        setShowPartySetup(false);
        setAction(null);
        setInGame(false);
    };
    useEffect(() => {
        socket.on("kicked", (data) => {
            alert(data?.reason || "Вас выгнали");
            localStorage.removeItem("mafia_lobby");
            setView("menu");
            setPlayers([]);
            setMayor(null);
            setRoomCode("");
        });

        socket.on("room-closed", (data) => {
            alert(data?.reason || "Комната закрыта");
            localStorage.removeItem("mafia_lobby");
            setView("menu");
            setPlayers([]);
            setMayor(null);
            setRoomCode("");
        });

        return () => {
            socket.off("kicked");
            socket.off("room-closed");
        };
    }, []);
    


    useEffect(() => {
        if (loadingGame && myRole) {
            const timer = setTimeout(() => {
                setLoadingGame(false);
                setShowRoulette(true);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [loadingGame, myRole]);
    useEffect(() => {
        const onKicked = (data) => {
            alert(data?.reason || "Вас выгнали");
            localStorage.removeItem("mafia_lobby");
            setView("menu");
            setPlayers([]);
            setMayor(null);
            setRoomCode("");
            setInGame(false);
        };

        const onClosed = (data) => {
            alert(data?.reason || "Комната закрыта");
            localStorage.removeItem("mafia_lobby");
            setView("menu");
            setPlayers([]);
            setMayor(null);
            setRoomCode("");
            setInGame(false);
        };

        socket.on("kicked", onKicked);
        socket.on("room-closed", onClosed);

        return () => {
            socket.off("kicked", onKicked);
            socket.off("room-closed", onClosed);
        };
    }, []);
    if (inGame) {
        return (
            <GameRoom
                roomCode={roomCode}
                isMayor={mayor?.id === socket.id}
                players={players}
                myRole={myRole}
                onLeaveToLobby={() => setInGame(false)}
            />
        );
    }


    // ==========================
    // ПОКАЗ РОЛИ
    // ==========================


    if (showRoulette && myRole) {

        return (

            <RoleRoulette
                role={myRole}
                onFinish={() => {
                    setShowRoulette(false);
                    setInGame(true);
                }}
            />
        );

    }

    // ==========================
    // UI
    // ==========================
    console.log("mayor.id =", mayor?.id);
    console.log("socket.id =", socket.id);
    console.log("canSetupGame =", canSetupGame);
    console.log("условие =", mayor?.id === socket.id);
    return (

        <>

            {/* ---------------- ГЛАВНОЕ МЕНЮ ---------------- */}

            {view === "menu" && (

                <div className="min-h-screen bg-black flex flex-col items-center pt-32 gap-8">

                    <h1 className="text-6xl font-bold text-yellow-500">
                        MAFIA
                    </h1>

                    <button
                        onClick={handleCreate}
                        className="bg-gradient-to-r from-[#8b0000] to-[#5c0000] border border-amber-300 border-[1px] px-10 py-4 rounded-xl text-white text-xl"
                    >
                        Создать комнату
                    </button>

                    <button
                        onClick={handleJoin}
                        className=" border border-amber-300 border-[1px] px-10 py-4 rounded-xl text-white text-xl"
                    >
                        Войти в комнату
                    </button>

                </div>

            )}

            {/* ---------------- КОД КОМНАТЫ ---------------- */}

            {view === "code" && (

                <NameModal
                    title="КОД КОМНАТЫ"
                    subtitle="Введите код комнаты"
                    placeholder="ABCDE"
                    buttonText="Продолжить"
                    onSaveName={handleSaveCode}
                />

            )}

            {/* ---------------- ИМЯ ---------------- */}

            {view === "name" && (

                <NameModal
                    title="ПРЕДСТАВЬТЕСЬ"
                    subtitle="Семья должна знать, с кем имеет дело."
                    placeholder="Ваше имя..."
                    buttonText="Продолжить"
                    onSaveName={handleSaveName}
                />

            )}

            {/* ---------------- АВАТАР ---------------- */}

            {view === "avatar" && (

                <AvatarPicker
                    onSelect={handleAvatarSelect}
                />

            )}



            {/* ---------------- ЛОББИ ---------------- */}


            {view === "lobby" && (



                <>
                    {console.log("roomCode =", roomCode)}
                    {console.log("mayor =", mayor)}
                    {console.log("players =", players)}


                    <Lobby
                        roomCode={roomCode}
                        players={players}
                        mayor={mayor}
                        isMayor={mayor?.id === socket.id}
                        playerReady={playerReady}
                        onPlayerReady={handlePlayerReady}
                        canSetupGame={canSetupGame}
                        onStartSetup={() => setShowPartySetup(true)}
                        onLeave={leaveLobby}
                        onKick={(playerId) => socket.emit("kick-player", roomCode, playerId)}
                        emojiMap={emojiMap}
                        onSendEmoji={sendEmoji}
                        isAdminViewer={isAdmin()}
                        onAdminGive={adminGiveCurrency}
                    />
                    {console.log("mayor.id =", mayor?.id)}
                    {console.log("socket.id =", socket.id)}
                    {console.log("canSetupGame =", canSetupGame)}
                    {console.log("условие =", mayor?.id === socket.id)}


                    {waitingMayor && loadingStart && (

                        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-40">

                            <div className="text-center">

                                <h2 className="text-5xl text-yellow-500 mb-6">
                                    Мэр настраивает партию
                                </h2>

                                <p className="text-xl text-white">
                                    Подождите немного...
                                </p>

                            </div>

                        </div>

                    )}
                    

                    {showPartySetup && (

                        <PartySetup
                            players={players}
                            onStart={handlePartyStart}
                        />

                    )}

                    {(loadingStart || loadingGame) && (
                        <LoadingSpinner
                          text={loadingStart
                            ? "Раздача ролей и подготовка игры..."
                            : "Мэр раздает роли. Секундочку..."}
                        />
                    )}
                </>

            )}

        </>

    );

}