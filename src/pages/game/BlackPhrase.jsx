export default function BlackPhrase({ text }) {
  const fallback = "Сегодня мне не спится...";

  return (
    <div className="fixed inset-0 z-[300] bg-black flex items-center justify-center p-8">
      <h1
        className="text-3xl md:text-5xl font-black text-center tracking-wide"
        style={{
          color: "#8b0000",
          textShadow: "0 0 30px #5c0000, 0 0 60px #8b0000",
          fontFamily: "Georgia, serif"
        }}
      >
        {text || fallback}
      </h1>
    </div>
  );
}