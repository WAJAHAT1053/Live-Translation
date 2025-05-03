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

// ✅ Handle socket connections
io.on("connection", (socket) => {
  console.log(`⚡ New user connected: ${socket.id}`);

  socket.on("join-room", (roomId, userId) => {
    socket.join(roomId);
    console.log(`🟢 ${userId} joined room ${roomId}`);
    socket.to(roomId).emit("user-connected", userId);

    socket.on("disconnect", () => {
      console.log(`🔴 ${userId} disconnected`);
      socket.to(roomId).emit("user-disconnected", userId);
    });
  });
});

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`🚀 Socket.io server running at http://localhost:${PORT}`);
});
