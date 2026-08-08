import { useEffect, useState } from "react";
import roles from "../data/roles";

export default function RoleRoulette({ role, onFinish }) {

    const [current, setCurrent] = useState(0);
    const [finished, setFinished] = useState(false);

    useEffect(() => {

        let index = 0;

        const interval = setInterval(() => {

            index++;

            setCurrent(index % roles.length);

        }, 120);

        setTimeout(() => {

            clearInterval(interval);

            const finalIndex = roles.findIndex(r => r.id === role);

            setCurrent(finalIndex);

            setFinished(true);

            setTimeout(() => {

                onFinish();

            }, 2500);

        }, 4500);

        return () => clearInterval(interval);

    }, []);

    const currentRole = roles[current];

    return (

        <div className="min-h-screen bg-black flex items-center justify-center">

            <div className="w-96">

                <img
                    src={currentRole.image}
                    className={`rounded-3xl transition-all duration-700 w-[400px] h-[400px] ${
                        finished ? "scale-110" : ""
                    }`}
                />

                <h1 className="text-white text-center text-4xl mt-6 font-black">

                    {currentRole.name}

                </h1>

            </div>

        </div>

    );

}