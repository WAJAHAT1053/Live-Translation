const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

app.use(cors());

const io = new Server(server, {
  cors: {
    origin: "*", // ✅ Change this to your frontend URL in production
    methods: ["GET", "POST"]
  }
});

// Room management
const rooms = new Map();

io.on("connection", (socket) => {
  console.log(`⚡ New user connected: ${socket.id}`);

  socket.on("join-room", (roomId, userId) => {
    // Initialize room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        host: userId,
        participants: new Set([userId]),
        maxParticipants: 4
      });
      console.log(`🏠 Created new room ${roomId} with host ${userId}`);
    } else {
      const room = rooms.get(roomId);
      // Check if room is full
      if (room.participants.size >= room.maxParticipants) {
        socket.emit("room-full");
        return;
      }
      // Add participant
      room.participants.add(userId);
      console.log(`👥 ${userId} joined room ${roomId} as participant`);
    }

    socket.join(roomId);
    socket.to(roomId).emit("user-connected", userId);
    
    // Send room info to the joining user
    const room = rooms.get(roomId);
    socket.emit("room-info", {
      isHost: room.host === userId,
      hostId: room.host,
      participants: Array.from(room.participants)
    });

    socket.on("disconnect", () => {
      console.log(`🔴 ${userId} disconnected`);
      const room = rooms.get(roomId);
      if (room) {
        room.participants.delete(userId);
        
        // If host left, assign new host
        if (room.host === userId && room.participants.size > 0) {
          const newHost = Array.from(room.participants)[0];
          room.host = newHost;
          io.to(roomId).emit("host-changed", newHost);
          console.log(`👑 New host assigned: ${newHost}`);
        }
        
        // Clean up empty room
        if (room.participants.size === 0) {
          rooms.delete(roomId);
          console.log(`🗑️ Room ${roomId} deleted (empty)`);
        }
      }
      socket.to(roomId).emit("user-disconnected", userId);
    });

    // Host controls
    socket.on("mute-participant", (targetUserId) => {
      const room = rooms.get(roomId);
      if (room && room.host === userId) {
        io.to(roomId).emit("participant-muted", targetUserId);
      }
    });

    socket.on("remove-participant", (targetUserId) => {
      const room = rooms.get(roomId);
      if (room && room.host === userId) {
        room.participants.delete(targetUserId);
        io.to(targetUserId).emit("removed-from-room");
        io.to(roomId).emit("participant-removed", targetUserId);
      }
    });
  });
});

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`🚀Socket.io server running at http://localhost:${PORT}`);
});
