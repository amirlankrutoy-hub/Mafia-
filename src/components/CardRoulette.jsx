import { useEffect, useState } from "react";
import roles from "../data/roles";

export default function CardRoulette({ finalRole, onFinish }) {
  const [currentRole, setCurrentRole] = useState(roles[0]);

  useEffect(() => {
    let index = 0;
    let speed = 80;

    function spin() {
      setCurrentRole(roles[index % roles.length]);
      index++;

      if (speed < 350) {
        speed += 20;
        setTimeout(spin, speed);
      } else {
        const role = roles.find(r => r.id === finalRole);

        if (role) {
          setCurrentRole(role);
        }

        setTimeout(() => {
          onFinish();
        }, 1500);
      }
    }

    spin();
  }, []);

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">

      <div className="w-[320px]">

        <div className="rounded-2xl overflow-hidden border-2 border-yellow-500 bg-[#111] shadow-2xl">

          <img
            src={currentRole.image}
            alt={currentRole.name}
            className="w-full h-[430px] object-cover"
          />

          <div className="p-5 text-center">

            <h2 className="text-3xl font-bold text-yellow-400">
              {currentRole.name}
            </h2>

          </div>

        </div>

      </div>

    </div>
  );
}