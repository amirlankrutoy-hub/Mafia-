import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faArrowRight, faGem, faMoon } from '@fortawesome/free-solid-svg-icons';
import roles from '../data/roles';
import { RARITIES, ROLE_RARITY, BASE_ROLES } from '../data/chests';
import { TEAMS, ALL_TEAMS, TEAM_ORDER } from '../data/teams';
import { ownsRole } from '../services/wallet';
import { isRoleDisabled } from '../services/admin';
import useSeo from '../hooks/useSeo';
import '../roles.css';

/** Карточка с лёгким 3D-наклоном за курсором */
export function TiltCard({ className = '', style, children, max = 8 }) {
  const ref = useRef(null);
  const onMove = (e) => {
    const el = ref.current;
    if (!el || e.pointerType === 'touch') return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty('--rx', `${(0.5 - y) * max}deg`);
    el.style.setProperty('--ry', `${(x - 0.5) * max}deg`);
    el.style.setProperty('--mx', `${x * 100}%`);
    el.style.setProperty('--my', `${y * 100}%`);
  };
  const reset = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  };
  return (
    <div ref={ref} className={`tilt ${className}`} style={style} onPointerMove={onMove} onPointerLeave={reset}>
      {children}
    </div>
  );
}

function RoleCard({ role, i }) {
  const team = TEAMS[role.category] || TEAMS.civilians;
  const rarity = RARITIES[ROLE_RARITY[role.id]];
  const owned = ownsRole(role.id);
  const isBase = BASE_ROLES.includes(role.id);
  return (
    <Link to={`/role/${role.id}`} className="block anim-scale-in" style={{ '--i': Math.min(i, 12) }}>
      <TiltCard className={`role-card ${owned ? '' : 'role-card--locked'}`} style={{ '--team': team.color, '--team-glow': team.glow, '--rar': rarity?.color }}>
        <div className="role-card__frame">
          <img src={role.image} alt={role.name} className="role-card__img" loading="lazy" />
          <div className="role-card__shade" />
          <div className="role-card__shine" />

          <span className="role-card__team">
            <FontAwesomeIcon icon={team.icon} /> {team.short}
          </span>
          {rarity && (
            <span className="role-card__rarity" title={isBase ? 'Базовая — есть у всех' : rarity.label}>
              <FontAwesomeIcon icon={faGem} />
            </span>
          )}

          {!owned && (
            <div className="role-card__lock">
              <span className="role-card__lock-icon">
                <FontAwesomeIcon icon={faLock} />
              </span>
              <span className="text-[11px] font-bold text-[#f3e5ab]">Выпадает из сундуков</span>
            </div>
          )}

          <div className="role-card__info">
            <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: rarity?.color }}>
              {isBase ? 'Базовая' : rarity?.label}
            </span>
            <h3 className="font-display text-2xl font-black leading-tight text-[#fff1c4]">{role.name}</h3>
            <p className="role-card__desc">{role.description}</p>
            <p className="role-card__ability">
              <FontAwesomeIcon icon={faMoon} className="mr-1.5 opacity-70" />
              {role.ability}
            </p>
            <span className="role-card__more">
              Досье <FontAwesomeIcon icon={faArrowRight} />
            </span>
          </div>
        </div>
      </TiltCard>
    </Link>
  );
}

const RolesGallery = () => {
  useSeo({
    title: 'Все роли игры Мафия',
    description:
      'Все 12 ролей игры «Мафия» в Mafia Play: Доктор, Шериф, Красотка, Священник, Мафиози, Крёстный отец, Вор, Маньяк, Потрошитель, Поклонница, Стукач, Обыватель — способности и цели.',
    path: '/roles'
  });
  const [active, setActive] = useState('all');
  const [, force] = useState(0);
  useEffect(() => {
    const refresh = () => force((n) => n + 1);
    window.addEventListener('mafia-roles-disabled-changed', refresh);
    window.addEventListener('mafia-wallet-changed', refresh);
    return () => {
      window.removeEventListener('mafia-roles-disabled-changed', refresh);
      window.removeEventListener('mafia-wallet-changed', refresh);
    };
  }, []);

  const visible = roles.filter((role) => {
    const dis = isRoleDisabled(role.id);
    return !(dis && !dis.until);
  });
  const ownedCount = visible.filter((r) => ownsRole(r.id)).length;
  const pct = visible.length ? Math.round((ownedCount / visible.length) * 100) : 0;
  const filters = [ALL_TEAMS, ...TEAM_ORDER.map((t) => TEAMS[t])];
  const groups = (active === 'all' ? TEAM_ORDER : [active]).map((t) => ({
    team: TEAMS[t],
    list: visible.filter((r) => r.category === t)
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-8 py-6">
      {/* Шапка */}
      <section className="roles-hero anim-fade-up">
        <div className="roles-hero__cards" aria-hidden="true">
          {visible.slice(0, 5).map((r, i) => (
            <img key={r.id} src={r.image} alt="" style={{ '--k': i }} />
          ))}
        </div>
        <div className="relative max-w-xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-[#a8916c]">Картотека семьи</p>
          <h1 className="ach-title mt-1 font-display text-5xl font-black sm:text-6xl">Роли</h1>
          <p className="mt-3 text-sm text-[#c9b48f]">
            {visible.length} персонажей, три стороны и у каждого своя цель. Узнайте, кто на что способен, — и кого опасаться ночью.
          </p>
          <div className="mt-5 max-w-sm">
            <div className="flex justify-between text-xs">
              <span className="font-bold text-[#e6d5bc]">Ваша коллекция</span>
              <span className="font-mono text-[#f3d27a]">
                {ownedCount} / {visible.length}
              </span>
            </div>
            <div className="ach-bar mt-1.5 !h-2">
              <div className="ach-bar__fill" style={{ width: `${pct}%` }} />
            </div>
            {ownedCount < visible.length && (
              <Link to="/shop?tab=chests" className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-[#f3d27a] hover:underline">
                Открыть сундуки и собрать все роли <FontAwesomeIcon icon={faArrowRight} />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Фильтр по командам */}
      <nav className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {filters.map((t) => {
          const count = t.id === 'all' ? visible.length : visible.filter((r) => r.category === t.id).length;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              className={`team-filter ${active === t.id ? 'team-filter--active' : ''}`}
              style={{ '--team': t.color, '--team-glow': t.glow }}
            >
              <span className="team-filter__icon">
                <FontAwesomeIcon icon={t.icon} />
              </span>
              <span className="min-w-0 text-left">
                <span className="block truncate text-sm font-black">{t.label}</span>
                <span className="block text-[10px] opacity-70">{count} ролей</span>
              </span>
            </button>
          );
        })}
      </nav>

      {groups.map(({ team, list }) =>
        list.length ? (
          <section key={team.id}>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2" style={{ '--team': team.color }}>
              <h2 className="flex items-center gap-3 font-display text-2xl font-black text-[#f3e5ab] sm:text-3xl">
                <span className="team-dot">
                  <FontAwesomeIcon icon={team.icon} />
                </span>
                {team.label}
              </h2>
              <p className="text-xs text-[#a8916c]">Цель: {team.goal}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
              {list.map((role, i) => (
                <RoleCard key={role.id} role={role} i={i} />
              ))}
            </div>
          </section>
        ) : null
      )}
    </div>
  );
};

export default RolesGallery;
