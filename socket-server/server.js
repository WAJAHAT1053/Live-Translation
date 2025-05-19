const { Server } = require("socket.io");
const express = require("express");
const http = require("http");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Later restrict to your Vercel domain
    methods: ["GET", "POST"]
  }
});

// Room management
const rooms = new Map();

io.on("connection", (socket) => {
  console.log("🔌 User connected:", socket.id);

  // Check room status and determine role
  socket.on("check-room", (roomId, callback) => {
    const room = rooms.get(roomId);
    if (!room) {
      callback({ exists: false, isHost: true });
    } else {
      callback({ 
        exists: true, 
        isHost: room.host === socket.id,
        participants: Array.from(room.participants)
      });
    }
  });

  // Initialize host
  socket.on("initialize-host", ({ roomId, userId }) => {
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        host: userId,
        participants: new Set([userId]),
        maxParticipants: 4
      });
      console.log(`🏠 Created new room ${roomId} with host ${userId}`);
    }
    socket.join(roomId);
    socket.emit("role-changed", "host");
  });

  // Join as participant
  socket.on("join-as-participant", ({ roomId, userId }) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit("error", "Room does not exist");
      return;
    }

    if (room.participants.size >= room.maxParticipants) {
      socket.emit("room-full");
      return;
    }

    room.participants.add(userId);
    socket.join(roomId);
    socket.emit("role-changed", "participant");
    socket.to(roomId).emit("participant-joined", userId);
    console.log(`👥 ${userId} joined room ${roomId} as participant`);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("❌ Disconnected:", socket.id);
    
    // Find and update all rooms this user was in
    for (const [roomId, room] of rooms.entries()) {
      if (room.participants.has(socket.id)) {
        room.participants.delete(socket.id);
        
        // If host left, assign new host
        if (room.host === socket.id && room.participants.size > 0) {
          const newHost = Array.from(room.participants)[0];
          room.host = newHost;
          io.to(roomId).emit("host-changed", newHost);
          io.to(newHost).emit("role-changed", "host");
          console.log(`👑 New host assigned: ${newHost}`);
        }
        
        // Clean up empty room
        if (room.participants.size === 0) {
          rooms.delete(roomId);
          console.log(`🗑️ Room ${roomId} deleted (empty)`);
        } else {
          io.to(roomId).emit("participant-left", socket.id);
        }
      }
    }
  });

  // Host controls
  socket.on("mute-participant", (targetUserId) => {
    const room = findUserRoom(socket.id);
    if (room && room.host === socket.id) {
      io.to(room.id).emit("participant-muted", targetUserId);
    }
  });

  socket.on("unmute-participant", (targetUserId) => {
    const room = findUserRoom(socket.id);
    if (room && room.host === socket.id) {
      io.to(room.id).emit("participant-unmuted", targetUserId);
    }
  });

  socket.on("remove-participant", (targetUserId) => {
    const room = findUserRoom(socket.id);
    if (room && room.host === socket.id) {
      room.participants.delete(targetUserId);
      io.to(targetUserId).emit("removed-from-room");
      io.to(room.id).emit("participant-removed", targetUserId);
    }
  });

  socket.on("end-meeting", (roomId) => {
    const room = rooms.get(roomId);
    if (room && room.host === socket.id) {
      io.to(roomId).emit("meeting-ended");
      rooms.delete(roomId);
    }
  });

  // Participant controls
  socket.on("toggle-mute", ({ userId, isMuted }) => {
    const room = findUserRoom(socket.id);
    if (room) {
      io.to(room.id).emit("participant-mute-state-changed", { userId, isMuted });
    }
  });

  socket.on("toggle-video", ({ userId, isVideoEnabled }) => {
    const room = findUserRoom(socket.id);
    if (room) {
      io.to(room.id).emit("participant-video-state-changed", { userId, isVideoEnabled });
    }
  });

  socket.on("leave-meeting", ({ roomId, userId }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.participants.delete(userId);
      io.to(roomId).emit("participant-left", userId);
    }
  });
});

// Helper function to find a user's room
function findUserRoom(userId) {
  for (const [roomId, room] of rooms.entries()) {
    if (room.participants.has(userId)) {
      return { id: roomId, ...room };
    }
  }
  return null;
}

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`✅ Socket.IO server running on port ${PORT}`);
});
