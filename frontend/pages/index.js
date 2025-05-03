import { useState } from "react";
import { useRouter } from "next/router";

export default function Home() {
  const [roomId, setRoomId] = useState("");
  const router = useRouter();

  const joinRoom = () => {
    if (roomId.trim()) {
      router.push(`/room/${roomId}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-4">Enter Room ID</h1>
      <input
        type="text"
        placeholder="e.g., firasat123"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
        className="text-black p-2 rounded"
      />
      <button
        onClick={joinRoom}
        className="mt-4 px-4 py-2 bg-blue-500 rounded hover:bg-blue-600"
      >
        Join Room
      </button>
    </div>
  );
}
