import mongoose from 'mongoose';

const strokeSchema = new mongoose.Schema({
  id: String,
  roomId: String,
  segments: [{ start: { x: Number, y: Number }, end: { x: Number, y: Number } }],
  style: { color: String, width: Number },
  tool: String,
  userId: String,
  seq: Number,
  createdAt: { type: Date, default: Date.now }
});

const roomSchema = new mongoose.Schema({
  roomId: { type: String, unique: true },
  seqCounter: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  userId: { type: String, unique: true },
  username: String,
  color: String,
  status: { type: String, default: 'active' },
  lastRoom: String,
  lastSeen: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const userRoomSessionSchema = new mongoose.Schema({
  userId: String,
  roomId: String,
  socketId: String,
  joinedAt: { type: Date, default: Date.now },
  lastActivity: { type: Date, default: Date.now },
  strokeCount: { type: Number, default: 0 },
  cursorPos: { x: Number, y: Number }
});

export const StrokeModel = mongoose.model('Stroke', strokeSchema);
export const RoomModel = mongoose.model('Room', roomSchema);
export const UserModel = mongoose.model('User', userSchema);
export const UserRoomSessionModel = mongoose.model('UserRoomSession', userRoomSessionSchema);

export async function connectDB() {
  const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/collaborative-canvas';
  try {
    await mongoose.connect(mongoUrl);
    console.log('MongoDB connected:', mongoUrl);
  } catch (err) {
    console.error('MongoDB connection failed, using in-memory store only:', err);
  }
}

export async function loadRoomStrokes(roomId: string) {
  try {
    const strokes = await StrokeModel.find({ roomId }).sort({ seq: 1 });
    return strokes.map((doc: any) => ({
      id: doc.id,
      segments: doc.segments,
      style: doc.style,
      tool: doc.tool,
      userId: doc.userId,
      seq: doc.seq
    }));
  } catch (err) {
    console.error('loadRoomStrokes error:', err);
    return [];
  }
}

export async function saveStroke(roomId: string, stroke: any) {
  try {
    const doc = new StrokeModel({ ...stroke, roomId });
    await doc.save();
  } catch (err) {
    console.error('saveStroke error:', err);
  }
}

export async function deleteStroke(roomId: string, strokeId: string) {
  try {
    await StrokeModel.deleteOne({ roomId, id: strokeId });
  } catch (err) {
    console.error('deleteStroke error:', err);
  }
}

export async function clearRoom(roomId: string) {
  try {
    await StrokeModel.deleteMany({ roomId });
    await RoomModel.updateOne({ roomId }, { seqCounter: 0, updatedAt: new Date() });
  } catch (err) {
    console.error('clearRoom error:', err);
  }
}

// User management functions
export async function createOrUpdateUser(userId: string, username: string, color: string) {
  try {
    const user = await UserModel.findOneAndUpdate(
      { userId },
      { userId, username, color, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    return user;
  } catch (err) {
    console.error('createOrUpdateUser error:', err);
    return null;
  }
}

export async function getUserData(userId: string) {
  try {
    return await UserModel.findOne({ userId });
  } catch (err) {
    console.error('getUserData error:', err);
    return null;
  }
}

export async function createRoomSession(userId: string, roomId: string, socketId: string) {
  try {
    const session = new UserRoomSessionModel({ userId, roomId, socketId });
    await session.save();
    return session;
  } catch (err) {
    console.error('createRoomSession error:', err);
    return null;
  }
}

export async function updateRoomSession(userId: string, roomId: string, data: any) {
  try {
    const session = await UserRoomSessionModel.findOneAndUpdate(
      { userId, roomId },
      { ...data, lastActivity: new Date() },
      { new: true }
    );
    return session;
  } catch (err) {
    console.error('updateRoomSession error:', err);
    return null;
  }
}

export async function getRoomSessions(roomId: string) {
  try {
    return await UserRoomSessionModel.find({ roomId });
  } catch (err) {
    console.error('getRoomSessions error:', err);
    return [];
  }
}

export async function removeRoomSession(userId: string, roomId: string) {
  try {
    await UserRoomSessionModel.deleteOne({ userId, roomId });
  } catch (err) {
    console.error('removeRoomSession error:', err);
  }
}

export async function updateUserStatus(userId: string, status: string) {
  try {
    const user = await UserModel.findOneAndUpdate(
      { userId },
      { status, updatedAt: new Date() },
      { new: true }
    );
    return user;
  } catch (err) {
    console.error('updateUserStatus error:', err);
    return null;
  }
}
