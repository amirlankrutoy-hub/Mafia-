import { getAvailableAvatars } from "../services/profile";


export default function AvatarPicker({ onSelect }) {
  const list = getAvailableAvatars();
  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100]">
      <div className="bg-[#181818] p-8 rounded-2xl border border-yellow-600 max-w-4xl max-h-[85vh] overflow-y-auto relative z-[101]">
        <h2 className="text-3xl text-yellow-400 font-bold mb-6 text-center">
          Выберите аватар
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          {list.map((src, index) => (
            <button
              key={index}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log("Выбран аватар:", src);
                onSelect(src);
              }}
              className="relative z-[102] cursor-pointer hover:scale-105 transition rounded-xl overflow-hidden border-2 border-yellow-700/50 hover:border-yellow-400 active:scale-95 bg-[#1c100b] p-0"
              style={{ pointerEvents: "auto" }}
            >
              <img
                src={src}
                alt={`Аватар ${index + 1}`}
                className="w-28 h-28 object-cover rounded-xl block pointer-events-none"
                draggable={false}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}