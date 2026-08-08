import roles from "../data/roles";

export default function RoleReveal({ roleId, onReady }) {

    const role = roles.find(r => r.id === roleId);

    if (!role) return null;

    return (

        <div className="fixed inset-0 bg-black flex items-center justify-center">

            <div className="max-w-md rounded-2xl overflow-hidden border-2 border-[#d4af37] bg-[#120a07] shadow-2xl">

                <img
                    src={role.image}
                    alt={role.name}
                    className="w-full h-[430px] object-cover"
                />

                <div className="p-6">

                    <h1 className="text-4xl font-black text-[#d4af37] text-center uppercase">
                        {role.name}
                    </h1>

                    <p className="mt-4 text-center italic text-[#e6d5bc]">
                        "{role.description}"
                    </p>

                    <div className="mt-6 rounded-xl border border-[#8b0000]/40 bg-[#1a0505] p-4">

                        <h3 className="text-[#f3e5ab] font-bold uppercase">
                            🎯 Особая способность
                        </h3>

                        <p className="mt-2 text-[#e6d5bc]">
                            {role.ability}
                        </p>

                    </div>

                    <button
                        onClick={onReady}
                        className="mt-8 w-full rounded-xl bg-[#8b0000] py-4 text-xl font-bold text-white hover:bg-red-800 transition"
                    >
                        Я готов
                    </button>

                </div>

            </div>

        </div>

    );

}