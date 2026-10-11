export default function LoadingSpinner({ text = "Загрузка...", fullScreen = true }) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-6 py-10">
      <div className="relative h-28 w-28">
        <div className="absolute inset-0 rounded-full border-2 border-[#d4af37]/15" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#f3d27a] border-r-[#c0151f] animate-spin" />
        <div className="absolute inset-2 rounded-full border border-transparent border-b-[#d4af37]/60 anim-spin-slow" />
        <img src="/logo-256.webp" alt="" className="absolute inset-3 h-[88px] w-[88px] object-contain anim-heartbeat" />
      </div>
      <p className="font-display text-lg font-bold tracking-wide gold-text text-center px-6">{text}</p>
      <div className="progress-run h-1 w-48 rounded-full" />
    </div>
  );

  if (!fullScreen) return content;

  return (
    <div className="fixed inset-0 z-[800] flex items-center justify-center bg-[#0a0605]/95 backdrop-blur-sm anim-fade-in">
      {content}
    </div>
  );
}
