import { isAdmin } from "../services/admin";

const AVATARS = [
  "/avatars/avatar1.svg",
  "/avatars/avatar2.svg",
  "/avatars/avatar3.svg",
  "/avatars/avatar4.svg",
  "/avatars/avatar5.svg",
  "/avatars/avatar6.svg",
  "/avatars/avatar7.svg",
  "/avatars/avatar8.svg",
  "/avatars/avatar9.svg",
  "/avatars/avatar10.svg",
  "/avatars/avatar11.svg",
  "/avatars/avatar12.svg",
  "/avatars/avatar13.svg",
  "/avatars/avatar14.svg",
  "/avatars/avatar15.svg",
  "/avatars/avatar16.svg",
  "/avatars/avatar17.svg",
];

export default function AvatarPicker({ onSelect }) {
  const list = isAdmin() ? [...AVATARS, "/avatars/avatar_admin.svg"] : AVATARS;
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