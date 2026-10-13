import { useParams, Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faArrowRight, faMoon, faBullseye, faLightbulb, faGem, faLock, faCheck } from '@fortawesome/free-solid-svg-icons';
import roles from '../data/roles.js';
import { RARITIES, ROLE_RARITY, BASE_ROLES } from '../data/chests';
import { TEAMS } from '../data/teams';
import { ownsRole } from '../services/wallet';
import { TiltCard } from './RolesGallery';
import useSeo from '../hooks/useSeo';
import '../roles.css';

function RoleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const index = roles.findIndex((r) => r.id === id);
  const role = roles[index];
  useSeo({
    title: role ? `${role.name} — роль в игре Мафия` : 'Роль не найдена',
    description: role ? `${role.name} (${role.team}) в Mafia Play: ${role.description} Способность: ${role.ability}` : undefined,
    path: `/role/${id}`,
    noindex: !role
  });

  if (!role) {
    return (
      <div className="my-16 space-y-4 text-center">
        <h1 className="font-display text-3xl font-black text-red-400">Досье не найдено</h1>
        <p className="text-[#c5a059]">Персонажа «{id}» нет в картотеке семьи.</p>
        <button className="btn btn-gold" onClick={() => navigate('/roles')}>
          Ко всем ролям
        </button>
      </div>
    );
  }

  const team = TEAMS[role.category] || TEAMS.civilians;
  const rarity = RARITIES[ROLE_RARITY[role.id]];
  const isBase = BASE_ROLES.includes(role.id);
  const owned = ownsRole(role.id);
  const prev = roles[(index - 1 + roles.length) % roles.length];
  const next = roles[(index + 1) % roles.length];
  const allies = roles.filter((r) => r.category === role.category && r.id !== role.id);

  return (
    <div className="mx-auto max-w-5xl py-6" style={{ '--team': team.color, '--team-glow': team.glow, '--rar': rarity?.color }}>
      <Link to="/roles" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-[#d4af37] hover:text-[#f3e5ab]">
        <FontAwesomeIcon icon={faArrowLeft} /> Все роли
      </Link>

      <section className="role-dossier anim-fade-up">
        <div className="role-dossier__bg" style={{ backgroundImage: `url(${role.image})` }} />
        <div className="relative grid items-center gap-8 md:grid-cols-[280px_1fr]">
          <TiltCard className={`role-card role-card--big mx-auto w-60 sm:w-72 ${owned ? '' : 'role-card--locked'}`} max={12}>
            <div className="role-card__frame">
              <img src={role.image} alt={role.name} className="role-card__img" />
              <div className="role-card__shine" />
              {!owned && (
                <div className="role-card__lock">
                  <span className="role-card__lock-icon">
                    <FontAwesomeIcon icon={faLock} />
                  </span>
                </div>
              )}
            </div>
          </TiltCard>

          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <span className="role-chip" style={{ '--c': team.color }}>
                <FontAwesomeIcon icon={team.icon} /> {role.team}
              </span>
              {rarity && (
                <span className="role-chip" style={{ '--c': rarity.color }}>
                  <FontAwesomeIcon icon={faGem} /> {isBase ? 'Базовая' : rarity.label}
                </span>
              )}
              <span className="role-chip" style={{ '--c': owned ? '#34d399' : '#a1a1aa' }}>
                <FontAwesomeIcon icon={owned ? faCheck : faLock} /> {owned ? 'В коллекции' : 'Нет в коллекции'}
              </span>
            </div>

            <h1 className="ach-title font-display text-5xl font-black sm:text-6xl">{role.name}</h1>
            <p className="text-base leading-relaxed text-[#e6d5bc]">{role.description}</p>

            <div className="role-block">
              <h3>
                <FontAwesomeIcon icon={faMoon} /> Способность
              </h3>
              <p>{role.ability}</p>
            </div>
            <div className="role-block">
              <h3>
                <FontAwesomeIcon icon={faBullseye} /> Цель
              </h3>
              <p>{team.goal}</p>
            </div>

            {!owned && (
              <Link to="/shop?tab=chests" className="btn btn-gold">
                Выбить из сундука <FontAwesomeIcon icon={faArrowRight} />
              </Link>
            )}
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <section className="settings-card">
          <h2 className="flex items-center gap-2 font-display text-xl font-black text-[#f3e5ab]">
            <FontAwesomeIcon icon={faLightbulb} className="text-[#d4af37]" /> Советы
          </h2>
          <ul className="mt-3 space-y-2.5">
            {team.tips.map((t) => (
              <li key={t} className="flex gap-2.5 text-sm text-[#c9b48f]">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: team.color }} />
                {t}
              </li>
            ))}
          </ul>
        </section>
        <section className="settings-card">
          <h2 className="flex items-center gap-2 font-display text-xl font-black text-[#f3e5ab]">
            <FontAwesomeIcon icon={team.icon} style={{ color: team.color }} /> На той же стороне
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {allies.length ? (
              allies.map((r) => (
                <Link key={r.id} to={`/role/${r.id}`} className="ally">
                  <img src={r.image} alt="" />
                  <span>{r.name}</span>
                </Link>
              ))
            ) : (
              <p className="text-sm text-[#a8916c]">Эта роль играет сама за себя.</p>
            )}
          </div>
        </section>
      </div>

      <nav className="mt-6 grid grid-cols-2 gap-3">
        <Link to={`/role/${prev.id}`} className="role-nav">
          <FontAwesomeIcon icon={faArrowLeft} />
          <img src={prev.image} alt="" />
          <span className="truncate">{prev.name}</span>
        </Link>
        <Link to={`/role/${next.id}`} className="role-nav justify-end text-right">
          <span className="truncate">{next.name}</span>
          <img src={next.image} alt="" />
          <FontAwesomeIcon icon={faArrowRight} />
        </Link>
      </nav>
    </div>
  );
}

export default RoleDetail;
