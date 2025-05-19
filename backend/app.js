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

// Data structure to store room information: { roomId: { users: Set<userId>, hostId: userId } }
const rooms = new Map();

// ✅ Handle socket connections
io.on("connection", (socket) => {
  console.log(`⚡ New user connected: ${socket.id}`);

  socket.on("join-room", (roomId, userId) => {
    socket.join(roomId);
    console.log(`🟢 ${userId} joining room ${roomId}`);

    // Store user and room info on the socket
    socket.userId = userId;
    socket.roomId = roomId;

    // Initialize room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, { users: new Set(), hostId: null });
      console.log(`✨ Room ${roomId} created.`);
    }

    const room = rooms.get(roomId);

    // Add user to the room's user list
    room.users.add(userId);
    console.log(`➕ ${userId} added to room ${roomId}. Current users: ${Array.from(room.users).join(', ')}`);

    // If no host, set the joining user as host
    if (!room.hostId) {
      room.hostId = userId;
      console.log(`👑 ${userId} is now the host of room ${roomId}`);
      // Emit to all in the room (including the new host)
      io.to(roomId).emit("set-host", room.hostId);
    } else {
       // If host already exists, just inform the new user about the current host
       socket.emit("set-host", room.hostId);
    }

    // Inform others in the room about the new user
    socket.to(roomId).emit("user-connected", userId);
    console.log(`🔌 Broadcasting 'user-connected' for ${userId} in ${roomId}`);


    // Handle user disconnection
    socket.on("disconnect", () => {
      console.log(`🔴 ${socket.userId} disconnected from room ${socket.roomId}`);
      if (socket.roomId && rooms.has(socket.roomId)) {
        const room = rooms.get(socket.roomId);
        // Remove user from the room's user list
        room.users.delete(socket.userId);
        console.log(`➖ ${socket.userId} removed from room ${socket.roomId}. Remaining users: ${Array.from(room.users).join(', ')}`);

        // If the disconnected user was the host and there are other users left, assign a new host
        if (room.hostId === socket.userId && room.users.size > 0) {
          const newHostId = room.users.values().next().value; // Get the first user in the set
          room.hostId = newHostId;
          console.log(`👑 Host ${socket.userId} left. ${newHostId} is the new host of room ${socket.roomId}`);
          io.to(socket.roomId).emit("set-host", newHostId);
        } else if (room.users.size === 0) {
          // If no users left, remove the room
          rooms.delete(socket.roomId);
          console.log(`🧹 Room ${socket.roomId} is empty and has been removed.`);
        }

        // Inform others in the room about the disconnection
        socket.to(socket.roomId).emit("user-disconnected", socket.userId);
         console.log(`🔌 Broadcasting 'user-disconnected' for ${socket.userId} in ${socket.roomId}`);
      }
    });
  });

  // Handle kick request from host
  socket.on('kick-user', (targetUserId) => {
      console.log(`🥾 Received kick request from ${socket.userId} in room ${socket.roomId} to kick ${targetUserId}`);
      if (socket.roomId && rooms.has(socket.roomId)) {
          const room = rooms.get(socket.roomId);
          // Check if the requester is the host
          if (room.hostId === socket.userId) {
              console.log(`✅ Kick request validated from host ${socket.userId}`);
              // Find the socket of the user to kick
              const targetSocketId = Array.from(io.sockets.sockets.entries()).find(([_, sock]) => sock.userId === targetUserId && sock.roomId === socket.roomId)?.[0];

              if (targetSocketId) {
                  const targetSocket = io.sockets.sockets.get(targetSocketId);
                   if(targetSocket) {
                       console.log(`Removing ${targetUserId} (socket: ${targetSocketId}) from room ${socket.roomId}`);
                       // Inform the kicked user and the room
                       targetSocket.emit('user-kicked', targetUserId);
                       io.to(socket.roomId).emit('user-kicked', targetUserId); // Also broadcast for others to update UI

                       // Disconnect the kicked user's socket
                       targetSocket.disconnect(true); // Use `true` to close the underlying connection

                       // The disconnect handler will clean up the room state
                   } else {
                        console.warn(`⚠️ Target socket for ${targetUserId} not found.`);
                   }
              } else {
                  console.warn(`⚠️ Target user ${targetUserId} not found in room ${socket.roomId}.`);
              }
          } else {
              console.warn(`❌ Kick request denied: ${socket.userId} is not the host of room ${socket.roomId}.`);
          }
      } else {
          console.warn(`⚠️ Kick request for room ${socket.roomId} failed: Room not found.`);
      }
  });

  // Handle request for host ID
  socket.on('request-host-id', (roomId) => {
      console.log(`👑 Received host ID request from ${socket.userId} for room ${roomId}`);
      if (roomId && rooms.has(roomId)) {
          const room = rooms.get(roomId);
          if (room.hostId) {
              console.log(`✅ Sending host ID ${room.hostId} to ${socket.userId} for room ${roomId}.`);
              socket.emit('set-host', room.hostId); // Send host ID back to the requester
          } else {
              console.log(`ℹ️ Room ${roomId} has no host yet.`);
              // Optionally, could emit a different event or nothing if no host
          }
      } else {
          console.warn(`⚠️ Host ID request for room ${roomId} failed: Room not found.`);
      }
  });
});

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`🚀Socket.io server running at http://localhost:${PORT}`);
});
