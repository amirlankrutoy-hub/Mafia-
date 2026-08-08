export default function LoadingSpinner({ text = "Загрузка...", fullScreen = true }) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 rounded-full border-4 border-[#d4af37]/20" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#d4af37] border-r-[#8b0000] animate-spin" />
        <img
          src="/mafio.png"
          alt=""
          className="absolute inset-2 h-12 w-12 object-contain rounded-full opacity-90"
        />
      </div>
      <p className="text-[#d4af37] font-bold uppercase tracking-widest text-sm animate-pulse">
        {text}
      </p>
    </div>
  );

  if (!fullScreen) return content;

  return (
    <div className="fixed inset-0 z-[500] bg-black/90 flex items-center justify-center">
      {content}
    </div>
  );
}
