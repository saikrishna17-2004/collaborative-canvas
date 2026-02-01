import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import state from './state-manager';
import rooms from './rooms';
import userManager from './user-manager';
import { connectDB, loadRoomStrokes, saveStroke, deleteStroke, clearRoom as clearRoomDB } from './db';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const CLIENT_DIR = path.join(__dirname, '..', 'client');
app.use(express.static(CLIENT_DIR));

// REST API endpoints for user management
app.get('/api/users', (req, res) => {
  const activeUsers = userManager.getActiveUsers();
  res.json(activeUsers);
});

app.get('/api/rooms/:roomId/users', async (req, res) => {
  const roomUsers = await userManager.getRoomUsers(req.params.roomId);
  res.json(roomUsers);
});

// Initialize DB on startup
connectDB().catch(err => console.error('DB init error:', err));

io.on('connection', (socket) => {
  let joinedRoom = 'default';
  let userId = socket.id;
  let username = `User-${socket.id.slice(0, 8)}`;
  let userColor = `#${Math.floor(Math.random() * 16777215).toString(16)}`;

  socket.on('identify', async (data) => {
    username = data.username || `User-${socket.id.slice(0, 8)}`;
    userColor = data.color || userColor;
    
    // Initialize user in database and in-memory store
    const userData = await userManager.initializeUser(userId, username, userColor);
    socket.emit('user_identified', userData);
  });

  socket.on('join', async (roomName = 'default') => {
    joinedRoom = roomName;
    socket.join(joinedRoom);
    rooms.addClient(joinedRoom, socket.id);
    
    // Add user to room in user manager
    await userManager.addUserToRoom(userId, joinedRoom, socket.id);
    
    try {
      // Load strokes from DB if available
      const dbStrokes = await loadRoomStrokes(joinedRoom);
      if (dbStrokes.length > 0) {
        // populate in-memory state from DB
        for (const stroke of dbStrokes) {
          state.addStroke(joinedRoom, stroke);
        }
      }
    } catch (err) {
      console.error('Failed to load room strokes:', err);
    }
    
    // send history
    socket.emit('history', state.getHistory(joinedRoom));
    
    // Get and broadcast active users in room
    const activeUsers = await userManager.getRoomUsers(joinedRoom);
    io.to(joinedRoom).emit('room_users_updated', activeUsers);
    
    // Notify others
    const roomUsers = Array.from(io.sockets.adapter.rooms.get(joinedRoom) || []);
    io.to(joinedRoom).emit('user_list', roomUsers);
    io.to(joinedRoom).emit('user_joined', { userId, username, userColor });
    socket.emit('chat_message', { userId: 'System', text: `You joined as ${username} (${userId.slice(0, 8)})` });
  });

  socket.on('drawing_step', async (data) => {
    // Track user activity
    await userManager.updateUserActivity(userId, joinedRoom, { lastActivity: new Date() });
    socket.to(joinedRoom).emit('drawing_step', { ...data, userId, username, userColor });
  });

  socket.on('commit_stroke', async (stroke) => {
    try {
      stroke.userId = userId;
      state.addStroke(joinedRoom, stroke);
      // Persist to DB
      await saveStroke(joinedRoom, stroke);
      // Update user's stroke count
      await userManager.updateUserActivity(userId, joinedRoom, { strokeCount: { $inc: 1 } });
      io.to(joinedRoom).emit('commit_stroke', { ...stroke, username, userColor });
    } catch (err) {
      console.error('commit_stroke error', err);
      socket.emit('error', { message: 'Failed to commit stroke' });
    }
  });

  socket.on('redo', async (strokeId) => {
    try {
      const stroke = state.restoreStroke(joinedRoom, strokeId);
      if (stroke) {
        // Re-save to DB
        await saveStroke(joinedRoom, stroke);
        io.to(joinedRoom).emit('commit_stroke', stroke);
      }
    } catch (err) {
      console.error('redo error', err);
      socket.emit('error', { message: 'Failed to redo stroke' });
    }
  });

  socket.on('cursor', async (pos) => {
    await userManager.updateUserActivity(userId, joinedRoom, { cursorPos: pos });
    socket.to(joinedRoom).emit('cursor', { userId, username, userColor, pos });
  });

  socket.on('undo', async () => {
    const removed = state.undoLastByUser(joinedRoom, userId);
    if (removed) {
      // Remove from DB
      await deleteStroke(joinedRoom, removed.id);
      io.to(joinedRoom).emit('stroke_removed', { strokeId: removed.id, userId });
    }
  });

  socket.on('chat_message', (data) => {
    io.to(joinedRoom).emit('chat_message', { userId, text: data.text });
  });

  socket.on('canvas_cleared', async () => {
    state.clearRoom(joinedRoom);
    // Clear from DB
    await clearRoomDB(joinedRoom);
    io.to(joinedRoom).emit('canvas_cleared');
    io.to(joinedRoom).emit('chat_message', { userId: 'System', text: `${userId.slice(0, 8)} cleared the canvas` });
  });

  socket.on('user_status', async (data) => {
    await userManager.setUserStatus(userId, data.status);
    io.to(joinedRoom).emit('user_status', { userId, username, status: data.status });
  });

  socket.on('disconnect', async () => {
    rooms.removeClient(joinedRoom, socket.id);
    
    // Remove user from room
    await userManager.removeUserFromRoom(userId, joinedRoom);
    
    // Get updated users list
    const activeUsers = await userManager.getRoomUsers(joinedRoom);
    io.to(joinedRoom).emit('room_users_updated', activeUsers);
    
    io.to(joinedRoom).emit('user_left', { userId, username });
    const roomUsers = Array.from(io.sockets.adapter.rooms.get(joinedRoom) || []);
    io.to(joinedRoom).emit('user_list', roomUsers);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
