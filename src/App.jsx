import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import RolesGallery from './pages/RolesGallery';
import RoleDetail from './pages/RoleDetail';
import Play from './pages/Play';
import OnlinePlay from './pages/OnlinePlay';
import Rules from './pages/Rules';
import Shop from './pages/Shop';
import AdminPanel from './pages/AdminPanel';
import Friends from './pages/Friends';
import Achievements from './pages/Achievements';
import AchievementToast from './components/AchievementToast';
import ConnectionStatus from './components/ConnectionStatus';
import { isBanned, bumpSiteVisit } from './services/admin';
import { getMyAccount, resetMyAccount } from './services/accounts';
import Navbar from './components/Navbar';
import NotFound from './pages/NotFound';
import NameModal from './components/NameModal';
import StoryIntro from './components/StoryIntro';
import { MusicProvider, useMusic } from './context/MusicContext';

function AppRoutes({ account, showModal, handleAccountReady }) {
  const userName = account?.name || '';
  const location = useLocation();
  const navigate = useNavigate();
  const { playMenu, stopMenu, stopLobby } = useMusic();

  const [showStory, setShowStory] = useState(false);
  const [pendingOnlinePath, setPendingOnlinePath] = useState(null);

  useEffect(() => {
    const isOnline = location.pathname.startsWith('/online');
    if (isOnline) {
      stopMenu();
    } else {
      stopLobby();
      const t = setTimeout(() => playMenu(), 300);
      return () => clearTimeout(t);
    }
  }, [location.pathname, playMenu, stopMenu, stopLobby]);

  useEffect(() => {
    if (location.pathname === '/online' && location.state?.fromStory !== true) {
      const seen = sessionStorage.getItem('mafia_story_seen') === '1';
      if (!seen) {
        setPendingOnlinePath(location.pathname + location.search);
        setShowStory(true);
        navigate('/', { replace: true });
      }
    }
  }, [location.pathname, location.search, location.state, navigate]);

  const handleStoryFinish = () => {
    sessionStorage.setItem('mafia_story_seen', '1');
    setShowStory(false);
    const target = pendingOnlinePath || '/online';
    setPendingOnlinePath(null);
    navigate(target, { state: { fromStory: true } });
  };

  useEffect(() => {
    if (location.state?.forceStory) {
      setPendingOnlinePath('/online');
      setShowStory(true);
      navigate('/', { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  return (
    <div className="min-h-screen bg-[#0d0907] text-[#e6d5bc] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#2a170e] via-[#0d0907] to-[#050302] font-serif selection:bg-[#d4af37] selection:text-black">
      {showModal && location.pathname !== '/online' && (
        <NameModal onAccountReady={handleAccountReady} />
      )}

      {!showStory && <Navbar account={account} />}

      <main className={`container mx-auto px-3 sm:px-4 py-4 sm:py-8 lg:pl-72 lg:pr-6 ${showStory ? 'hidden' : ''}`}>
        <Routes>
          <Route path="/" element={<Home userName={userName} />} />
          <Route path="/roles" element={<RolesGallery />} />
          <Route path="/role/:id" element={<RoleDetail />} />
          <Route path="/online" element={<OnlinePlay currentUser={userName} account={account} />} />
          <Route path="/play" element={<Play currentUser={userName} />} />
          <Route path="/play/:roomCode" element={<Play currentUser={userName} />} />
          <Route path="/rules" element={<Rules />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/friends" element={<Friends account={account} />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {showStory && <StoryIntro onFinish={handleStoryFinish} />}
      <AchievementToast />
      <ConnectionStatus />
    </div>
  );
}

function App() {
  const location = useLocation();
  const [account, setAccount] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    bumpSiteVisit();
    const saved = getMyAccount();
    if (saved) {
      const ban = isBanned(saved.name);
      if (ban) {
        resetMyAccount();
        setAccount(null);
        setShowModal(true);
        const until = ban.until ? new Date(ban.until).toLocaleString("ru-RU") : "пока админ не разбанит";
        setTimeout(() => alert(`Вы забанены.\nПричина: ${ban.reason}\nДо: ${until}`), 100);
        return;
      }
      setAccount(saved);
      setShowModal(false);
      import('./services/achievementsService').then((m) => m.recordEvent('daily_login')).catch(() => {});
    } else if (location.pathname !== '/online') {
      setShowModal(true);
    }
  }, [location.pathname]);

  const handleAccountReady = (acc) => {
    const ban = isBanned(acc.name);
    if (ban) {
      resetMyAccount();
      const until = ban.until ? new Date(ban.until).toLocaleString("ru-RU") : "пока админ не разбанит";
      alert(`Вы забанены.\nПричина: ${ban.reason}\nДо: ${until}`);
      return;
    }
    setAccount(acc);
    setShowModal(false);
    import('./services/achievementsService').then((m) => m.recordEvent('daily_login')).catch(() => {});
  };

  return (
    <MusicProvider>
      <AppRoutes
        account={account}
        showModal={showModal}
        handleAccountReady={handleAccountReady}
      />
    </MusicProvider>
  );
}

export default App;
