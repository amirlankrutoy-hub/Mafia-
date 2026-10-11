import { Link, useLocation } from 'react-router-dom';
import Logo from '../components/ui/Logo';
import useSeo from '../hooks/useSeo';

// Страница 404 — для всех адресов, которых нет на сайте
function NotFound() {
  const location = useLocation();
  useSeo({ title: 'Страница не найдена', noindex: true });

  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <Logo size={150} float />
      <div className="mt-6 font-display text-8xl font-black blood-text anim-flicker">404</div>
      <h1 className="mt-2 font-display text-3xl font-black gold-text">Здесь никого нет…</h1>
      <p className="mt-3 max-w-md text-[#c9b48f]">
        Адрес <code className="text-[#f3d27a]">{location.pathname}</code> не найден. Похоже, его убрала мафия.
      </p>
      <Link to="/" className="btn btn-gold mt-8">
        На главную
      </Link>
    </section>
  );
}

export default NotFound;
