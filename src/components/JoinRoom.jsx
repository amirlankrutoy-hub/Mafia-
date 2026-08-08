import React, { useState } from "react";

export default function JoinRoom({ onJoin, onBack }) {
  const [roomCode, setRoomCode] = useState("");
  const [name, setName] = useState("");

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">

      <div className="bg-zinc-900 border border-zinc-700 rounded-3xl w-[500px] p-8">

        <h1 className="text-4xl text-white text-center font-bold mb-8">
          Войти в комнату
        </h1>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ваше имя"
          className="w-full p-4 rounded-xl mb-5 bg-zinc-800 text-white outline-none"
        />

        <input
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          placeholder="Код комнаты"
          maxLength={6}
          className="w-full p-4 rounded-xl mb-6 bg-zinc-800 text-white tracking-[8px] text-center text-2xl outline-none"
        />

        <button
          onClick={() => onJoin(name, roomCode)}
          className="w-full bg-blue-600 hover:bg-blue-500 transition p-4 rounded-xl text-white text-xl font-bold"
        >
          Войти
        </button>

        <button
          onClick={onBack}
          className="w-full mt-4 bg-zinc-700 hover:bg-zinc-600 transition p-4 rounded-xl text-white"
        >
          Назад
        </button>

      </div>

    </div>
  );
}