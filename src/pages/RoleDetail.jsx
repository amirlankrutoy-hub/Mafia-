import { useParams, Link, useNavigate } from 'react-router-dom';
import roles from '../data/roles.js';

function RoleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const role = roles.find((r) => r.id === id);

  if (!role) {
    return (
      <div className="my-16 text-center space-y-4">
        <h1 className="text-3xl font-bold text-red-600">Досье не найдено</h1>
        <p className="text-[#c5a059]">Персонаж с ID: "{id}" отсутствует в картотеке семьи.</p>
        <button
          className="mt-4 rounded-lg bg-[#d4af37] px-6 py-2.5 font-bold uppercase text-black hover:bg-[#f3e5ab]"
          onClick={() => navigate('/')}
        >
          Вернуться к семье
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl py-6">
      <Link
        to="/"
        className="mb-6 inline-flex items-center text-sm font-bold uppercase tracking-wider text-[#d4af37] hover:underline"
      >
        ← Вернуться в главное меню
      </Link>

      <div className="relative overflow-hidden rounded-2xl border-2 border-[#d4af37]/60 bg-gradient-to-br from-[#1c100b] via-[#120a07] to-[#080402] p-6 md:p-10 shadow-[0_15px_40px_rgba(0,0,0,0.9)]">
        {/* ФОНОВЫЙ ЗНАЧЕК МАКЕТА */}
        <div className="flex flex-col gap-8 md:flex-row items-center md:items-start">
          {/* ИЗОБРАЖЕНИЕ ПЕРСОНАЖА */}
          <div className="relative h-96 w-64 shrink-0 overflow-hidden rounded-xl border-2 border-[#d4af37]/50 bg-black shadow-2xl">
            <img 
              src={role.image} 
              alt={role.name} 
              className="h-full w-full object-cover object-top"
            />
          </div>

          {/* ИНФОРМАЦИЯ О ДЕЛЕ */}
          <div className="flex-1 space-y-5 text-left">
            <div className="border-b border-[#c5a059]/30 pb-4">
              <span className="inline-block rounded-md border border-[#d4af37]/40 bg-[#8b0000]/40 px-3 py-1 text-xs font-bold tracking-widest text-[#f3e5ab] uppercase">
                Принадлежность: {role.team}
              </span>
              <h1 className="mt-3 text-4xl font-black uppercase tracking-wider text-[#d4af37]">
                {role.name}
              </h1>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#c5a059]">
                Характеристика и досье
              </h3>
              <p className="text-[#e6d5bc] leading-relaxed text-base italic">
                "{role.description}"
              </p>
            </div>

            <div className="rounded-xl border-l-4 border-[#8b0000] bg-[#1a0505]/80 p-5 border border-[#8b0000]/30">
              <h3 className="font-bold text-[#f3e5ab] uppercase tracking-wider text-sm flex items-center gap-2">
                <span>🎯</span> Особое ночное действие:
              </h3>
              <p className="mt-2 text-sm text-[#e6d5bc] leading-relaxed">
                {role.ability}
              </p>
            </div>

            <div className="pt-2 text-xs text-[#c5a059]/60">
              Архивный код дела: <code className="text-[#d4af37] font-mono">{id}</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoleDetail;