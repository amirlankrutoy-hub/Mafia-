import { createContext, useContext, useState } from "react";

const RoomContext = createContext();

export function RoomProvider({ children }) {

    const [roomCode, setRoomCode] = useState("");

    const [players, setPlayers] = useState([]);

    const [isMayor, setIsMayor] = useState(false);

    const [connected, setConnected] = useState(false);

    const [gameStarted, setGameStarted] = useState(false);

    return (

        <RoomContext.Provider
            value={{

                roomCode,
                setRoomCode,

                players,
                setPlayers,

                isMayor,
                setIsMayor,

                connected,
                setConnected,

                gameStarted,
                setGameStarted

            }}
        >

            {children}

        </RoomContext.Provider>

    );

}

export function useRoom(){

    return useContext(RoomContext);

}