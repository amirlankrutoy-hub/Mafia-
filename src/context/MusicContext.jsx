import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback
} from "react";
import { getSettings, musicGain, onSettingsChanged } from "../services/settings";

const MusicContext = createContext(null);

const MENU_SRC = "/audio/sound.mp3";
const LOBBY_SRC = "/audio/cowboy-theme.mp3";
const MENU_BASE = 0.45;
const LOBBY_BASE = 0.5;

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

  useEffect(() => {
    const menu = new Audio(MENU_SRC);
    menu.loop = true;
    menuRef.current = menu;

    const lobby = new Audio(LOBBY_SRC);
    lobby.loop = true;
    lobbyRef.current = lobby;

    const applyVolume = () => {
      const g = musicGain();
      menu.volume = Math.min(1, MENU_BASE * g);
      lobby.volume = Math.min(1, LOBBY_BASE * g);
    };
    applyVolume();
    const offSettings = onSettingsChanged(applyVolume);

    // Сайт свернули / открыли другую вкладку или приложение — музыка замолкает,
    // вернулись — продолжает играть с того же места.
    let resume = [];
    const pauseAll = () => {
      resume = [menu, lobby].filter((a) => !a.paused);
      resume.forEach((a) => a.pause());
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (getSettings().pauseInBackground) pauseAll();
      } else {
        resume.forEach((a) => a.play().catch(() => {}));
        resume = [];
      }
    };
    const onPageHide = () => {
      menu.pause();
      lobby.pause();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      offSettings();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
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
    if (!a || document.visibilityState === "hidden") return;
    try {
      a.currentTime = 0;
      await a.play();
      setMenuPlaying(true);
    } catch {
      setMenuPlaying(false);
    }
  }, [menuMuted, stopLobby]);

  const playLobby = useCallback(async () => {
    stopMenu();
    if (lobbyMuted) return;
    const a = lobbyRef.current;
    if (!a || document.visibilityState === "hidden") return;
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