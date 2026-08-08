export default function MayorExecutionScreen({ candidate, onExecute }) {
  if (!candidate) {
    return (
      <div className="fixed inset-0 z-[300] bg-black flex items-center justify-center text-white">
        <p>Город определяет, кого казнить...</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[300] bg-[#1a0000] flex flex-col items-center justify-center gap-6 p-8 text-center">
      <p className="text-gray-400 uppercase tracking-[0.3em] text-sm">
        Город вынес приговор
      </p>

      {candidate.avatar && (
        <img
          src={candidate.avatar}
          alt=""
          className="w-40 h-40 object-cover rounded-2xl border-4 border-red-700"
        />
      )}

      <h1 className="text-4xl md:text-5xl text-red-500 font-black">
        {candidate.name}
      </h1>

      <p className="text-gray-400 max-w-md">
        Только вы решаете, приведён ли приговор в исполнение.
      </p>

      <button
        type="button"
        onClick={onExecute}
        className="mt-4 bg-red-800 hover:bg-red-700 text-white px-12 py-5 rounded-xl text-2xl font-black tracking-wide"
      >
        Казнить
      </button>
    </div>
  );
}
