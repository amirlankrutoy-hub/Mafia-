import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import RolesGallery from './pages/RolesGallery';
import RoleDetail from './pages/RoleDetail';
import OnlinePlay from './pages/OnlinePlay';
import Rules from './pages/Rules';
import Shop from './pages/Shop';
import Friends from './pages/Friends';
import Leaderboard from './pages/Leaderboard';
import ProfilePage from './pages/ProfilePage';
import Achievements from './pages/Achievements';
import AchievementToast from './components/AchievementToast';
import ConnectionStatus from './components/ConnectionStatus';
import ErrorBoundary from './components/ErrorBoundary';
import GlobalEvents from './components/GlobalEvents';
import Toaster from './components/Toaster';
import PaymentSuccess from './components/PaymentSuccess';
import Ambient from './components/ui/Ambient';
import LoadingSpinner from './components/LoadingSpinner';
import { getMyAccount } from './services/accounts';
import Navbar from './components/Navbar';
import NotFound from './pages/NotFound';
import NameModal from './components/NameModal';
import StoryIntro from './components/StoryIntro';
import { MusicProvider, useMusic } from './context/MusicContext';
import { LanguageProvider } from './context/LanguageContext';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Terms from './pages/Terms';

// Тяжёлые и редко нужные страницы — отдельными файлами
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const Play = lazy(() => import('./pages/Play'));

function AppRoutes({ account, showModal, handleAccountReady }) {
  const userName = account?.name || '';
  const location = useLocation();
  const navigate = useNavigate();
  const { playMenu, stopMenu, stopLobby } = useMusic();

  const [showStory, setShowStory] = useState(false);
  const [pendingOnlinePath, setPendingOnlinePath] = useState(null);

  // Убираем заставку из index.html, когда приложение готово
  useEffect(() => {
    const boot = document.getElementById('boot');
    if (!boot) return;
    boot.style.opacity = '0';
    const t = setTimeout(() => boot.remove(), 500);
    return () => clearTimeout(t);
  }, []);

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
    const params = new URLSearchParams(location.search);
    // Вход по приглашению/ссылке — без заставки, сразу в комнату
    if (params.get('autojoin')) return;
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

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }, [location.pathname]);

  const isGame = location.pathname.startsWith('/online');

  return (
    <div className="relative min-h-screen text-[#e6d5bc] font-sans selection:bg-[#d4af37] selection:text-black">
      <Ambient />

      {showModal && !showStory && <NameModal onAccountReady={handleAccountReady} />}

      {!showStory && <Navbar account={account} />}

      <main
        className={`relative mx-auto w-full px-3 sm:px-5 ${isGame ? 'py-3 sm:py-5' : 'pt-5 pb-28 sm:pt-8 lg:pb-10'} lg:pl-[18.5rem] lg:pr-8 max-w-[1600px] ${
          showStory ? 'hidden' : ''
        }`}
      >
        <ErrorBoundary resetKey={location.pathname}>
          <div key={location.pathname} className="page-enter">
            <Suspense fallback={<LoadingSpinner fullScreen={false} text="Загрузка…" />}>
              <Routes>
                <Route path="/" element={<Home userName={userName} account={account} />} />
                <Route path="/roles" element={<RolesGallery />} />
                <Route path="/role/:id" element={<RoleDetail />} />
                <Route path="/online" element={<OnlinePlay currentUser={userName} account={account} />} />
                <Route path="/play" element={<Play currentUser={userName} />} />
                <Route path="/play/:roomCode" element={<Play currentUser={userName} />} />
                <Route path="/rules" element={<Rules />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/friends" element={<Friends account={account} />} />
                <Route path="/top" element={<Leaderboard account={account} />} />
                <Route path="/profile" element={<ProfilePage account={account} />} />
                <Route path="/achievements" element={<Achievements />} />
                <Route path="/admin" element={<AdminPanel />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </div>
        </ErrorBoundary>
      </main>

      {showStory && <StoryIntro onFinish={handleStoryFinish} />}
      <GlobalEvents account={account} />
      <Toaster />
      <PaymentSuccess />
      <AchievementToast />
      <ConnectionStatus />
    </div>
  );
}

function App() {
  const [account, setAccount] = useState(() => getMyAccount());
  const [showModal, setShowModal] = useState(() => !getMyAccount());

  useEffect(() => {
    if (account) {
      import('./services/achievementsService').then((m) => m.recordEvent('daily_login')).catch(() => {});
    }
  }, [account?.id]);

  const handleAccountReady = (acc) => {
    setAccount(acc);
    setShowModal(false);
  };

  return (
    <LanguageProvider>
      <MusicProvider>
        <AppRoutes account={account} showModal={showModal} handleAccountReady={handleAccountReady} />
      </MusicProvider>
    </LanguageProvider>
  );
}

export default App;
