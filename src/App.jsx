import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
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
import { resumeSession, startCloudSync, forgetLocalAccount, getAuthToken } from './services/auth';
import { MusicProvider, useMusic } from './context/MusicContext';
import { LanguageProvider } from './context/LanguageContext';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Terms from './pages/Terms';

// Тяжёлые и редко нужные страницы — отдельными файлами
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const Play = lazy(() => import('./pages/Play'));
const Settings = lazy(() => import('./pages/Settings'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));

function AppRoutes({ account, showModal, handleAccountReady, loginReason }) {
  const userName = account?.name || '';
  const location = useLocation();
  const { playMenu, stopMenu, stopLobby } = useMusic();

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
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }, [location.pathname]);

  const isGame = location.pathname.startsWith('/online');

  return (
    <div className="relative min-h-screen text-[#e6d5bc] font-sans selection:bg-[#d4af37] selection:text-black">
      <Ambient />

      {showModal && !location.pathname.startsWith('/auth/') && <NameModal onAccountReady={handleAccountReady} reason={loginReason} />}

      <Navbar account={account} />

      <main
        className={`relative mx-auto w-full px-3 sm:px-5 ${isGame ? 'py-3 sm:py-5' : 'pt-5 pb-28 sm:pt-8 lg:pb-10'} lg:pl-[18.5rem] lg:pr-8 max-w-[1600px]`}
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
                <Route path="/settings" element={<Settings account={account} />} />
                <Route path="/auth/callback" element={<AuthCallback onAccountReady={handleAccountReady} />} />
                <Route path="/admin" element={<AdminPanel />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </div>
        </ErrorBoundary>
      </main>

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
  const [loginReason, setLoginReason] = useState('');
  const showModal = !account;

  // Проверяем вход: если аккаунт привязан к Google/почте, а сессии нет —
  // просим войти снова и возвращаем игрока в его же аккаунт.
  useEffect(() => {
    if (getAuthToken()) startCloudSync();
    if (!getMyAccount()) return;
    resumeSession().then((r) => {
      if (r.needLogin) {
        setLoginReason('Войдите снова, чтобы вернуться в свой аккаунт.');
        forgetLocalAccount();
      }
    });
  }, []);

  useEffect(() => {
    const onAuth = () => getAuthToken() && startCloudSync();
    window.addEventListener('mafia-auth-changed', onAuth);
    return () => window.removeEventListener('mafia-auth-changed', onAuth);
  }, []);

  useEffect(() => {
    if (account) {
      import('./services/achievementsService').then((m) => m.recordEvent('daily_login')).catch(() => {});
    }
  }, [account?.id]);

  useEffect(() => {
    const refresh = () => setAccount(getMyAccount());
    window.addEventListener('mafia-account-changed', refresh);
    return () => window.removeEventListener('mafia-account-changed', refresh);
  }, []);

  const handleAccountReady = (acc) => {
    setAccount(acc);
    setLoginReason('');
  };

  return (
    <LanguageProvider>
      <MusicProvider>
        <AppRoutes account={account} showModal={showModal} handleAccountReady={handleAccountReady} loginReason={loginReason} />
      </MusicProvider>
    </LanguageProvider>
  );
}

export default App;
