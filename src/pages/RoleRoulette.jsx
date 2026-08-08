import { useEffect, useState } from "react";
import { socket } from "../socket";
import roles from "../data/roles";


export default function RoleRoulette({ onFinish }) {

    const [roleId, setRoleId] = useState(null);


    useEffect(() => {

        socket.on("your-role", (role) => {

            console.log("🎭 Моя роль:", role);

            setRoleId(role);

        });

        return () => {

            socket.off("your-role");

        };

    }, []);

    if (!roleId) {

        return (

            <div className="min-h-screen bg-black text-white flex items-center justify-center">

                <h1 className="text-5xl font-bold">

                    🎲 Получаем роль...

                </h1>

            </div>

        );

    }

    const role = roles.find(r => r.id === roleId);

    return (

        <div className="min-h-screen bg-black text-white flex justify-center items-center">

            <div className="w-[450px] rounded-3xl overflow-hidden bg-[#111] border border-yellow-500">

                <img
                    src={role.image}
                    alt={role.name}
                    className="w-full h-[520px] object-cover"
                />

                <div className="p-8">

                    <h1 className="text-4xl font-bold">

                        {role.name}

                    </h1>

                    <p className="mt-4 text-gray-300 text-xl">

                        {role.description}

                    </p>

                    <button
                        onClick={onFinish}
                        className="mt-8 w-full bg-red-700 py-4 rounded-xl text-2xl font-bold hover:bg-red-800"
                    >
                        Я запомнил роль
                    </button>

                </div>
                <p className="text-yellow-400 text-xl mt-3">
                    {role.team}
                </p>

                <div className="mt-6 bg-[#1b1b1b] rounded-xl p-4">
                    <h2 className="text-red-400 font-bold text-xl mb-2">
                        Способность
                    </h2>

                    <p className="text-lg">
                        {role.ability}
                    </p>
                </div>

            </div>

        </div>

    );

}