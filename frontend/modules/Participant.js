import { useState, useEffect } from 'react';

export default function useParticipant(socketRef, roomId, userId, router) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isHostPresent, setIsHostPresent] = useState(true);

  // Initialize participant state
  useEffect(() => {
    if (!socketRef.current) return;

    // Listen for host actions
    socketRef.current.on("participant-muted", (targetUserId) => {
      if (targetUserId === userId) {
        setIsMuted(true);
      }
    });

    socketRef.current.on("participant-unmuted", (targetUserId) => {
      if (targetUserId === userId) {
        setIsMuted(false);
      }
    });

    socketRef.current.on("removed-from-room", () => {
      alert("You have been removed from the room by the host");
      router.push('/');
    });

    socketRef.current.on("host-left", () => {
      setIsHostPresent(false);
      // Wait for new host assignment
      socketRef.current.on("host-changed", (newHostId) => {
        setIsHostPresent(true);
      });
    });

    socketRef.current.on("meeting-ended", () => {
      alert("The meeting has ended");
      router.push('/');
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.off("participant-muted");
        socketRef.current.off("participant-unmuted");
        socketRef.current.off("removed-from-room");
        socketRef.current.off("host-left");
        socketRef.current.off("host-changed");
        socketRef.current.off("meeting-ended");
      }
    };
  }, [socketRef.current, userId, router]);

  // Participant control functions
  const toggleMute = () => {
    if (socketRef.current) {
      const newMuteState = !isMuted;
      socketRef.current.emit("toggle-mute", { userId, isMuted: newMuteState });
      setIsMuted(newMuteState);
    }
  };

  const toggleVideo = () => {
    if (socketRef.current) {
      const newVideoState = !isVideoEnabled;
      socketRef.current.emit("toggle-video", { userId, isVideoEnabled: newVideoState });
      setIsVideoEnabled(newVideoState);
    }
  };

  const leaveMeeting = () => {
    if (socketRef.current) {
      socketRef.current.emit("leave-meeting", { roomId, userId });
      router.push('/');
    }
  };

  return {
    isMuted,
    isVideoEnabled,
    isHostPresent,
    toggleMute,
    toggleVideo,
    leaveMeeting
  };
} 