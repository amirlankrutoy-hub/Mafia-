const FALLBACK = "/avatars/avatar1.svg";

export default function Avatar({ src, size = 44, online, ring = true, className = "" }) {
  return (
    <span className={`relative inline-block shrink-0 ${className}`} style={{ width: size, height: size }}>
      <img
        src={src || FALLBACK}
        alt=""
        loading="lazy"
        onError={(e) => {
          if (!e.currentTarget.src.endsWith(FALLBACK)) e.currentTarget.src = FALLBACK;
        }}
        className={`h-full w-full rounded-full object-cover bg-black ${
          ring ? "ring-1 ring-[#d4af37]/50 shadow-[0_0_14px_rgba(212,175,55,0.2)]" : ""
        }`}
      />
      {online !== undefined && (
        <span className="absolute -bottom-0.5 -right-0.5">
          {online ? (
            <span className="online-dot block" />
          ) : (
            <span className="block h-2.5 w-2.5 rounded-full bg-zinc-600 ring-2 ring-[#0a0605]" />
          )}
        </span>
      )}
    </span>
  );
}
