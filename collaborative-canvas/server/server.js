const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const state = require('./state-manager');
const rooms = require('./rooms');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const CLIENT_DIR = path.join(__dirname, '..', 'client');
app.use(express.static(CLIENT_DIR));

io.on('connection', (socket) => {
  let joinedRoom = 'default';
  let userId = socket.id;

  socket.on('join', (roomName = 'default') => {
    joinedRoom = roomName;
    socket.join(joinedRoom);
    rooms.addClient(joinedRoom, socket.id);
    // send history
    socket.emit('history', state.getHistory(joinedRoom));
    // broadcast user list
    const roomUsers = Array.from(io.sockets.adapter.rooms.get(joinedRoom) || []);
    io.to(joinedRoom).emit('user_list', roomUsers);
    io.to(joinedRoom).emit('user_joined', { userId });
    socket.emit('chat_message', { userId: 'System', text: `You joined the room as ${userId.slice(0, 8)}` });
  });

  socket.on('drawing_step', (data) => {
    socket.to(joinedRoom).emit('drawing_step', { ...data, userId });
  });

  socket.on('commit_stroke', (stroke) => {
    try {
      stroke.userId = userId;
      state.addStroke(joinedRoom, stroke);
      io.to(joinedRoom).emit('commit_stroke', stroke);
    } catch (err) {
      console.error('commit_stroke error', err);
      socket.emit('error', { message: 'Failed to commit stroke' });
    }
  });

  socket.on('cursor', (pos) => {
    socket.to(joinedRoom).emit('cursor', { userId, pos });
  });

  socket.on('undo', () => {
    const removed = state.undoLastByUser(joinedRoom, userId);
    if (removed) {
      // Broadcast only the removed stroke ID for efficient client-side handling
      io.to(joinedRoom).emit('stroke_removed', { strokeId: removed.id, userId });
    }
  });

  socket.on('redo', (strokeId) => {
    try {
      const stroke = state.restoreStroke(joinedRoom, strokeId);
      if (stroke) {
        io.to(joinedRoom).emit('commit_stroke', stroke);
      }
    } catch (err) {
      console.error('redo error', err);
      socket.emit('error', { message: 'Failed to redo stroke' });
    }
  });

  socket.on('chat_message', (data) => {
    io.to(joinedRoom).emit('chat_message', { userId, text: data.text });
  });

  socket.on('canvas_cleared', () => {
    state.clearRoom(joinedRoom);
    io.to(joinedRoom).emit('canvas_cleared');
    io.to(joinedRoom).emit('chat_message', { userId: 'System', text: `${userId.slice(0, 8)} cleared the canvas` });
  });

  socket.on('user_status', (data) => {
    io.to(joinedRoom).emit('user_status', { userId, status: data.status });
  });

  socket.on('disconnect', () => {
    rooms.removeClient(joinedRoom, socket.id);
    io.to(joinedRoom).emit('user_left', { userId });
    // broadcast updated user list
    const roomUsers = Array.from(io.sockets.adapter.rooms.get(joinedRoom) || []);
    io.to(joinedRoom).emit('user_list', roomUsers);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
