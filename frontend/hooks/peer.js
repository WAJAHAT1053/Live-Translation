// frontend/hooks/peer.js
import Peer from "peerjs";

export default function setupPeer(
  roomId,
  socketRef,
  userId,
  localStreamRef,
  setRemoteStream,
  onTranscriptReceived,
  onLanguagePreferencesReceived,
  onAudioMessageReceived
) {
  console.log("🔧 Setting up peer with ID:", userId);

  const isLocal = window.location.hostname === "localhost";

  const peer = new Peer(userId, {
    host: isLocal ? "192.168.29.218" : "live-translation-zd2c.onrender.com",
    port: isLocal ? 9000 : 443,
    path: "/myapp",
    secure: !isLocal,
    debug: 3,
    config: {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:19302" },
      ],
      iceCandidatePoolSize: 10,
    },
  });

  const dataConnections = new Map();
  const audioChunks = new Map();

  const ensureDataConnection = (peerId) => {
    if (!dataConnections.has(peerId)) {
      const conn = peer.connect(peerId, { reliable: true, serialization: "json" });
      setupDataConnectionHandlers(conn);
      dataConnections.set(peerId, conn);
    }
    return dataConnections.get(peerId);
  };

  const setupDataConnectionHandlers = (conn) => {
    conn.on("open", () => {
      console.log("📡 Data connection open with:", conn.peer);
    });

    conn.on("data", (data) => {
      if (data.type === "transcript") {
        onTranscriptReceived(data.text);
      } else if (data.type === "language-preferences") {
        onLanguagePreferencesReceived(data.preferences);
      } else if (data.type === "audio-info") {
        audioChunks.set(data.messageId, {
          info: data,
          chunks: new Array(data.totalChunks),
          received: 0,
        });
      } else if (data.type === "audio-chunk") {
        const entry = audioChunks.get(data.messageId);
        if (entry) {
          entry.chunks[data.chunkIndex] = data.data;
          entry.received++;

          if (entry.received === entry.info.totalChunks) {
            const allChunks = [].concat(...entry.chunks);
            const buffer = new Uint8Array(allChunks).buffer;
            const audioBlob = new Blob([buffer], { type: "audio/mpeg" });

            const message = {
              audioBlob,
              fromLanguage: entry.info.fromLanguage,
              toLanguage: entry.info.toLanguage,
              sourceText: entry.info.sourceText,
              translatedText: entry.info.translatedText,
            };

            onAudioMessageReceived(message);
            audioChunks.delete(data.messageId);
          }
        }
      }
    });

    conn.on("close", () => {
      console.log("🚪 Data connection closed:", conn.peer);
      dataConnections.delete(conn.peer);
    });
  };

  peer.on("connection", (conn) => {
    setupDataConnectionHandlers(conn);
  });

  peer.on("open", (id) => {
    console.log("🔑 Peer open with ID:", id);
    socketRef.current.emit("ready", { roomId, userId: id });
  });

  peer.on("call", (call) => {
    console.log("📞 Incoming call from", call.peer);
    if (localStreamRef.current) {
      call.answer(localStreamRef.current);
      call.on("stream", (remoteStream) => {
        console.log("📺 Got remote stream from:", call.peer);
        setRemoteStream(remoteStream);
      });
    }
  });

  socketRef.current.on("user-connected", (remoteUserId) => {
    if (!peer.connections[remoteUserId]) {
      const call = peer.call(remoteUserId, localStreamRef.current);
      if (call) {
        call.on("stream", (remoteStream) => {
          console.log("📺 Received stream from:", remoteUserId);
          setRemoteStream(remoteStream);
        });
      }
    }
  });

  const sendTranscript = (peerId, text) => {
    const conn = ensureDataConnection(peerId);
    if (conn.open) {
      conn.send({ type: "transcript", text });
    }
  };

  const sendLanguagePreferences = (peerId, preferences) => {
    const conn = ensureDataConnection(peerId);
    if (conn.open) {
      conn.send({ type: "language-preferences", preferences });
    }
  };

  const sendAudioMessage = (peerId, message) => {
    const conn = ensureDataConnection(peerId);
    if (conn.open) {
      const messageId = Date.now().toString();
      const CHUNK_SIZE = 1024;

      const sendChunks = async () => {
        const buffer = new Uint8Array(await message.audioBlob.arrayBuffer());
        const chunks = [];

        for (let i = 0; i < buffer.length; i += CHUNK_SIZE) {
          chunks.push(Array.from(buffer.slice(i, i + CHUNK_SIZE)));
        }

        conn.send({
          type: "audio-info",
          messageId,
          totalChunks: chunks.length,
          fromLanguage: message.fromLanguage,
          toLanguage: message.toLanguage,
          sourceText: message.sourceText,
          translatedText: message.translatedText,
        });

        for (let idx = 0; idx < chunks.length; idx++) {
          conn.send({
            type: "audio-chunk",
            messageId,
            chunkIndex: idx,
            totalChunks: chunks.length,
            data: chunks[idx],
          });
          await new Promise((res) => setTimeout(res, 100)); // Throttle sending
        }
      };

      sendChunks();
    }
  };

  peer.sendTranscript = sendTranscript;
  peer.sendLanguagePreferences = sendLanguagePreferences;
  peer.sendAudioMessage = sendAudioMessage;

  return peer;
}
