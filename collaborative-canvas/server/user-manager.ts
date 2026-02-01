import { UserModel, UserRoomSessionModel, createOrUpdateUser, getUserData, createRoomSession, updateRoomSession, getRoomSessions, removeRoomSession, updateUserStatus } from './db';

export interface UserData {
  userId: string;
  username: string;
  color: string;
  status: string;
  lastSeen?: Date;
}

export interface RoomUserData extends UserData {
  cursorPos: { x: number; y: number };
  strokeCount: number;
  joinedAt: Date;
  socketId: string;
}

class UserManager {
  private activeUsers: Map<string, UserData> = new Map();
  private roomUsers: Map<string, Set<string>> = new Map();
  private userSockets: Map<string, string> = new Map();

  async initializeUser(userId: string, username: string, color: string): Promise<UserData> {
    try {
      const user = await createOrUpdateUser(userId, username, color);
      if (user) {
        const userData: UserData = {
          userId: user.userId,
          username: user.username,
          color: user.color,
          status: user.status,
          lastSeen: user.lastSeen
        };
        this.activeUsers.set(userId, userData);
        return userData;
      }
    } catch (err) {
      console.error('initializeUser error:', err);
    }
    
    // Fallback in-memory user
    const userData: UserData = { userId, username, color, status: 'active' };
    this.activeUsers.set(userId, userData);
    return userData;
  }

  async addUserToRoom(userId: string, roomId: string, socketId: string): Promise<RoomUserData | null> {
    try {
      let user = this.activeUsers.get(userId);
      if (!user) {
        const dbUser = await getUserData(userId);
        if (!dbUser) return null;
        user = {
          userId: dbUser.userId,
          username: dbUser.username,
          color: dbUser.color,
          status: dbUser.status,
          lastSeen: dbUser.lastSeen
        };
      }

      await createRoomSession(userId, roomId, socketId);
      
      if (!this.roomUsers.has(roomId)) {
        this.roomUsers.set(roomId, new Set());
      }
      this.roomUsers.get(roomId)!.add(userId);
      this.userSockets.set(userId, socketId);

      return {
        ...user,
        socketId,
        joinedAt: new Date(),
        strokeCount: 0,
        cursorPos: { x: 0, y: 0 }
      } as RoomUserData;
    } catch (err) {
      console.error('addUserToRoom error:', err);
      return null;
    }
  }

  async removeUserFromRoom(userId: string, roomId: string): Promise<void> {
    try {
      await removeRoomSession(userId, roomId);
      
      if (this.roomUsers.has(roomId)) {
        this.roomUsers.get(roomId)!.delete(userId);
        if (this.roomUsers.get(roomId)!.size === 0) {
          this.roomUsers.delete(roomId);
        }
      }
      this.userSockets.delete(userId);
    } catch (err) {
      console.error('removeUserFromRoom error:', err);
    }
  }

  async getRoomUsers(roomId: string): Promise<RoomUserData[]> {
    try {
      const sessions = await getRoomSessions(roomId);
      const result: RoomUserData[] = [];

      for (const session of sessions) {
        let user = this.activeUsers.get(session.userId);
        if (!user) {
          const dbUser = await getUserData(session.userId);
          if (dbUser) {
            user = {
              userId: dbUser.userId,
              username: dbUser.username,
              color: dbUser.color,
              status: dbUser.status,
              lastSeen: dbUser.lastSeen
            };
          }
        }
        if (user) {
          result.push({
            userId: user.userId,
            username: user.username,
            color: user.color,
            status: user.status,
            lastSeen: user.lastSeen,
            socketId: session.socketId || '',
            joinedAt: session.joinedAt || new Date(),
            strokeCount: session.strokeCount || 0,
            cursorPos: (session.cursorPos as any) || { x: 0, y: 0 }
          });
        }
      }
      return result;
    } catch (err) {
      console.error('getRoomUsers error:', err);
      return [];
    }
  }

  async updateUserActivity(userId: string, roomId: string, data: any): Promise<void> {
    try {
      await updateRoomSession(userId, roomId, data);
      
      if (this.activeUsers.has(userId)) {
        const user = this.activeUsers.get(userId)!;
        user.lastSeen = new Date();
      }
    } catch (err) {
      console.error('updateUserActivity error:', err);
    }
  }

  async setUserStatus(userId: string, status: string): Promise<void> {
    try {
      await updateUserStatus(userId, status);
      
      if (this.activeUsers.has(userId)) {
        this.activeUsers.get(userId)!.status = status;
      }
    } catch (err) {
      console.error('setUserStatus error:', err);
    }
  }

  getActiveUsers(): UserData[] {
    return Array.from(this.activeUsers.values());
  }

  getRoomUserIds(roomId: string): string[] {
    const users = this.roomUsers.get(roomId);
    return users ? Array.from(users) : [];
  }

  getUser(userId: string): UserData | undefined {
    return this.activeUsers.get(userId);
  }
}

export default new UserManager();
