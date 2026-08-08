import React from "react";

export default function ChooseRole({
  onMayor,
  onPlayer,
}) {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">

      <div className="bg-zinc-900 rounded-3xl p-10 w-[600px] border border-zinc-700 shadow-2xl">

        <h1 className="text-4xl text-white text-center mb-8 font-bold">
          Выберите роль
        </h1>

        <div className="grid grid-cols-2 gap-8">

          <button
            onClick={onMayor}
            className="bg-yellow-500 hover:bg-yellow-400 transition rounded-2xl p-8 text-2xl font-bold"
          >
            👑
            <br />
            Мэр
          </button>

          <button
            onClick={onPlayer}
            className="bg-blue-600 hover:bg-blue-500 transition rounded-2xl p-8 text-2xl font-bold text-white"
          >
            👤
            <br />
            Игрок
          </button>

        </div>

      </div>

    </div>
  );
}