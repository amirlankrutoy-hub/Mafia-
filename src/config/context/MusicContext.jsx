import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback
} from "react";

const MusicContext = createContext(null);

const MENU_SRC = "/audio/sound.mp3";
const LOBBY_SRC = "/audio/cowboy-theme.mp3";

export function MusicProvider({ children }) {
  const menuRef = useRef(null);
  const lobbyRef = useRef(null);

  const [menuMuted, setMenuMuted] = useState(() => {
    try {
      return localStorage.getItem("mafia_menu_muted") === "1";
    } catch {
      return false;
    }
  });
  const [lobbyMuted, setLobbyMuted] = useState(() => {
    try {
      return localStorage.getItem("mafia_lobby_muted") === "1";
    } catch {
      return false;
    }
  });
  const [menuPlaying, setMenuPlaying] = useState(false);
  const [lobbyPlaying, setLobbyPlaying] = useState(false);

  // Инициализация audio-элементов один раз
  useEffect(() => {
    const menu = new Audio(MENU_SRC);
    menu.loop = true;
    menu.volume = 0.45;
    menuRef.current = menu;

    const lobby = new Audio(LOBBY_SRC);
    lobby.loop = true;
    lobby.volume = 0.5;
    lobbyRef.current = lobby;

    return () => {
      menu.pause();
      lobby.pause();
      menuRef.current = null;
      lobbyRef.current = null;
    };
  }, []);

  const stopMenu = useCallback(() => {
    const a = menuRef.current;
    if (!a) return;
    a.pause();
    a.currentTime = 0;
    setMenuPlaying(false);
  }, []);

  const stopLobby = useCallback(() => {
    const a = lobbyRef.current;
    if (!a) return;
    a.pause();
    a.currentTime = 0;
    setLobbyPlaying(false);
  }, []);

  const playMenu = useCallback(async () => {
    stopLobby();
    if (menuMuted) return;
    const a = menuRef.current;
    if (!a) return;
    try {
      a.currentTime = 0;
      await a.play();
      setMenuPlaying(true);
    } catch {
      // Автоплей может быть заблокирован — ждём жест пользователя
      setMenuPlaying(false);
    }
  }, [menuMuted, stopLobby]);

  const playLobby = useCallback(async () => {
    stopMenu();
    if (lobbyMuted) return;
    const a = lobbyRef.current;
    if (!a) return;
    try {
      a.currentTime = 0;
      await a.play();
      setLobbyPlaying(true);
    } catch {
      setLobbyPlaying(false);
    }
  }, [lobbyMuted, stopMenu]);

  const toggleMenuMute = useCallback(() => {
    setMenuMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("mafia_menu_muted", next ? "1" : "0");
      } catch {}
      if (next) {
        menuRef.current?.pause();
        setMenuPlaying(false);
      } else {
        // Попробуем снова включить, если мы на главной
        const a = menuRef.current;
        if (a) {
          a.play()
            .then(() => setMenuPlaying(true))
            .catch(() => {});
        }
      }
      return next;
    });
  }, []);

  const toggleLobbyMute = useCallback(() => {
    setLobbyMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("mafia_lobby_muted", next ? "1" : "0");
      } catch {}
      if (next) {
        lobbyRef.current?.pause();
        setLobbyPlaying(false);
      } else {
        const a = lobbyRef.current;
        if (a) {
          a.play()
            .then(() => setLobbyPlaying(true))
            .catch(() => {});
        }
      }
      return next;
    });
  }, []);

  const value = {
    menuMuted,
    lobbyMuted,
    menuPlaying,
    lobbyPlaying,
    playMenu,
    stopMenu,
    playLobby,
    stopLobby,
    toggleMenuMute,
    toggleLobbyMute
  };

  return (
    <MusicContext.Provider value={value}>{children}</MusicContext.Provider>
  );
}

export function useMusic() {
  const ctx = useContext(MusicContext);
  if (!ctx) {
    // безопасный fallback, если провайдер не обёрнут
    return {
      menuMuted: true,
      lobbyMuted: true,
      menuPlaying: false,
      lobbyPlaying: false,
      playMenu: () => {},
      stopMenu: () => {},
      playLobby: () => {},
      stopLobby: () => {},
      toggleMenuMute: () => {},
      toggleLobbyMute: () => {}
    };
  }
  return ctx;
}
