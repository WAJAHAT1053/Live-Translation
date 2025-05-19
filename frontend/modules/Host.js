import { useState, useEffect } from 'react';

export default function useHost(socketRef, roomId, userId, router) {
  const [participants, setParticipants] = useState([]);
  const [mutedParticipants, setMutedParticipants] = useState(new Set());

  // Initialize host controls
  useEffect(() => {
    if (!socketRef.current) return;

    // Listen for participant updates
    socketRef.current.on("participant-joined", (participantId) => {
      setParticipants(prev => [...prev, participantId]);
    });

    socketRef.current.on("participant-left", (participantId) => {
      setParticipants(prev => prev.filter(id => id !== participantId));
    });

    // Listen for mute status changes
    socketRef.current.on("participant-muted", (participantId) => {
      setMutedParticipants(prev => new Set([...prev, participantId]));
    });

    socketRef.current.on("participant-unmuted", (participantId) => {
      setMutedParticipants(prev => {
        const newSet = new Set(prev);
        newSet.delete(participantId);
        return newSet;
      });
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.off("participant-joined");
        socketRef.current.off("participant-left");
        socketRef.current.off("participant-muted");
        socketRef.current.off("participant-unmuted");
      }
    };
  }, [socketRef.current]);

  // Host control functions
  const muteParticipant = (targetUserId) => {
    if (socketRef.current) {
      socketRef.current.emit("mute-participant", targetUserId);
    }
  };

  const unmuteParticipant = (targetUserId) => {
    if (socketRef.current) {
      socketRef.current.emit("unmute-participant", targetUserId);
    }
  };

  const removeParticipant = (targetUserId) => {
    if (socketRef.current) {
      socketRef.current.emit("remove-participant", targetUserId);
    }
  };

  const endMeeting = () => {
    if (socketRef.current) {
      socketRef.current.emit("end-meeting", roomId);
      router.push('/');
    }
  };

  return {
    participants,
    mutedParticipants,
    muteParticipant,
    unmuteParticipant,
    removeParticipant,
    endMeeting
  };
} 