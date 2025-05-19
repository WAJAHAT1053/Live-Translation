import { useState, useEffect } from 'react';
import useHost from './Host';
import useParticipant from './Participant';

export default function useRoomManager(socketRef, roomId, userId, router) {
  const [isHost, setIsHost] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);

  // Initialize room and determine role
  useEffect(() => {
    if (!socketRef.current || !roomId || !userId) return;

    socketRef.current.emit("check-room", roomId, (response) => {
      if (response.error) {
        setError(response.error);
        return;
      }

      const { exists, isHost: userIsHost } = response;
      setIsHost(userIsHost);
      setIsInitialized(true);

      if (userIsHost) {
        console.log("👑 Initializing as host");
        socketRef.current.emit("initialize-host", { roomId, userId });
      } else {
        console.log("👥 Initializing as participant");
        socketRef.current.emit("join-as-participant", { roomId, userId });
      }
    });

    // Listen for role changes
    socketRef.current.on("role-changed", (newRole) => {
      setIsHost(newRole === "host");
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.off("role-changed");
      }
    };
  }, [socketRef.current, roomId, userId]);

  // Initialize appropriate role-based hooks
  const hostControls = useHost(socketRef, roomId, userId, router);
  const participantControls = useParticipant(socketRef, roomId, userId, router);

  return {
    isHost,
    isInitialized,
    error,
    ...(isHost ? hostControls : participantControls)
  };
} 