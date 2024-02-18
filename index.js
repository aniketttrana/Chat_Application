const express = require("express");
const app = express();
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Maintain a dictionary of message lists for each room
let messagesByRoom = {};
// Maintain a dictionary of last active timestamps for each room
let lastActiveByRoom = {};


io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);
// 
  socket.on("join_room", (room) => {
    socket.join(room);
    console.log(`User with ID: ${socket.id} joined room: ${room}`);
    // Create a new message list for the room if it doesn't exist
    if (!messagesByRoom[room]) {
      messagesByRoom[room] = [];
    }
    // Send existing messages for the room to the new user
    socket.emit("initial_messages", messagesByRoom[room]);
    // Update last active timestamp for the room
    lastActiveByRoom[room] = Date.now();
  });
// 
  socket.on("send_message", (data) => {
    // Add the new message to the room's message list
    messagesByRoom[data.room].push(data);
    // Broadcast the message to all users in the room
    io.to(data.room).emit("receive_message", data);
    // Update last active timestamp for the room
    lastActiveByRoom[data.room] = Date.now();
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
    // Check if the user was in any room and if the room has no more users, update last active timestamp
    Object.keys(socket.rooms).forEach((room) => {
      if (room !== socket.id && io.sockets.adapter.rooms.get(room)?.size === 0) {
        lastActiveByRoom[room] = Date.now();
      }
    });
  });

  socket.on("logout", () => {
    console.log("User disconnected", socket.id);
    Object.keys(socket.rooms).forEach((room) => {
      if (room !== socket.id && io.sockets.adapter.rooms.get(room)?.size === 1) {
        delete messagesByRoom[room];
        delete lastActiveByRoom[room];
        console.log(`Messages deleted for room: ${room}`);
      }
    });
  });
  
  });


// Periodically check for empty rooms and delete them
setInterval(() => {
  Object.keys(lastActiveByRoom).forEach((room) => {
    const roomSize = io.sockets.adapter.rooms.get(room)?.size || 0;
    if (roomSize === 0 && Date.now() - lastActiveByRoom[room] > 5000) {
      delete messagesByRoom[room];
      delete lastActiveByRoom[room];
      console.log(`Messages deleted for room: ${room}`);
    }
  });
}, 5000); // Check every 5 seconds

server.listen(3001, () => {
  console.log("SERVER RUNNING");
});