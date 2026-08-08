import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import RoleDetail from './pages/RoleDetail';
import Play from './pages/Play';
import OnlinePlay from './pages/OnlinePlay';
import Rules from './pages/Rules';
import Shop from './pages/Shop';
import AdminPanel from './pages/AdminPanel';
import { tryLoginAsAdminByName, isBanned, bumpSiteVisit } from './services/admin';
import Navbar from './components/Navbar';
import NotFound from './pages/NotFound';
import NameModal from './components/NameModal';
import StoryIntro from './components/StoryIntro';
import { MusicProvider, useMusic } from './context/MusicContext';

function AppRoutes({ userName, showModal, handleSaveName, handleChangeName }) {
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
        <NameModal onSaveName={handleSaveName} existingName={userName} />
      )}

      {!showStory && (
        <Navbar userName={userName} onChangeName={handleChangeName} />
      )}

      <main className={`container mx-auto px-3 sm:px-4 py-4 sm:py-8 ${showStory ? 'hidden' : ''}`}>
        <Routes>
          <Route path="/" element={<Home userName={userName} />} />
          <Route path="/role/:id" element={<RoleDetail />} />
          <Route path="/online" element={<OnlinePlay currentUser={userName} />} />
          <Route path="/play" element={<Play currentUser={userName} />} />
          <Route path="/play/:roomCode" element={<Play currentUser={userName} />} />
          <Route path="/rules" element={<Rules />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {showStory && <StoryIntro onFinish={handleStoryFinish} />}
    </div>
  );
}

function App() {
  const location = useLocation();
  const [userName, setUserName] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    bumpSiteVisit();
    const savedName = localStorage.getItem('mafia_user_name');
    if (savedName) {
      const ban = isBanned(savedName);
      if (ban) {
        localStorage.removeItem('mafia_user_name');
        setUserName('');
        setShowModal(true);
        const until = ban.until ? new Date(ban.until).toLocaleString("ru-RU") : "пока админ не разбанит";
        setTimeout(() => alert(`Вы забанены.\nПричина: ${ban.reason}\nДо: ${until}`), 100);
      } else {
        tryLoginAsAdminByName(savedName);
        setUserName(savedName);
      }
    }
    if (!savedName && location.pathname !== '/online') {
      setShowModal(true);
    } else {
      setShowModal(false);
    }
  }, [location.pathname]);

  const handleSaveName = (name) => {
    const ban = isBanned(name);
    if (ban) {
      const until = ban.until ? new Date(ban.until).toLocaleString("ru-RU") : "пока админ не разбанит";
      alert(`Вы забанены.\nПричина: ${ban.reason}\nДо: ${until}`);
      return;
    }
    tryLoginAsAdminByName(name);
    localStorage.setItem('mafia_user_name', name);
    setUserName(name);
    setShowModal(false);
  };

  const handleChangeName = () => {
    setShowModal(true);
  };

  return (
    <MusicProvider>
      <AppRoutes
        userName={userName}
        showModal={showModal}
        handleSaveName={handleSaveName}
        handleChangeName={handleChangeName}
      />
    </MusicProvider>
  );
}

export default App;
