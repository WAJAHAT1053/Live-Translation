// frontend/hooks/useSocket.js
import { useEffect, useRef } from "react";
import io from "socket.io-client";

// Use dynamic server URL based on environment
const getSocketServerUrl = () => `http://${window.location.hostname}:5000`;

export default function useSocket(roomId, userId) {
  const socketRef = useRef();

  useEffect(() => {
    if (!roomId || !userId) return;

    const socketServerUrl = getSocketServerUrl();
    console.log("🔌 Connecting to socket server at:", socketServerUrl);

    socketRef.current = io(socketServerUrl, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true
    });

    socketRef.current.on("connect", () => {
      console.log("🔌 Socket connected");
      socketRef.current.emit("join-room", roomId, userId);
    });

    socketRef.current.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error);
    });

    socketRef.current.on("disconnect", (reason) => {
      console.log("🔌 Socket disconnected:", reason);
    });

    socketRef.current.on("reconnect", (attemptNumber) => {
      console.log("🔄 Socket reconnected after", attemptNumber, "attempts");
      socketRef.current.emit("join-room", roomId, userId);
    });

    socketRef.current.on("reconnect_error", (error) => {
      console.error("❌ Socket reconnection error:", error);
    });

    socketRef.current.on("reconnect_failed", () => {
      console.error("❌ Socket reconnection failed");
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [roomId, userId]);

  return socketRef;
}
