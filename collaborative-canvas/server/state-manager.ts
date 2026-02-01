export interface Point { x: number; y: number }
export interface Segment { start: Point; end: Point }
export interface Stroke {
  id: string;
  segments: Segment[];
  style: { color: string; width: number };
  tool?: string;
  userId?: string;
  seq?: number;
}

type RoomState = {
  strokes: Stroke[];
  strokeIndex: Record<string, Stroke>;
  seqCounter?: number;
  removedMap?: Record<string, Stroke>;
};

class StateManager {
  rooms: Map<string, RoomState>;
  constructor() {
    this.rooms = new Map();
  }

  ensureRoom(room: string): RoomState {
    if (!this.rooms.has(room)) this.rooms.set(room, { strokes: [], strokeIndex: {} });
    return this.rooms.get(room)!;
  }

  addStroke(room: string, stroke: Stroke) {
    const r = this.ensureRoom(room);
    r.seqCounter = (r.seqCounter || 0) + 1;
    stroke.seq = r.seqCounter;
    r.strokes.push(stroke);
    r.strokeIndex[stroke.id] = stroke;
  }

  getHistory(room: string) {
    const r = this.ensureRoom(room);
    return r.strokes.slice();
  }

  removeStroke(room: string, strokeId: string) {
    const r = this.ensureRoom(room);
    const idx = r.strokes.findIndex(s => s.id === strokeId);
    if (idx !== -1) {
      const removed = r.strokes.splice(idx, 1)[0];
      delete r.strokeIndex[strokeId];
      r.removedMap = r.removedMap || {};
      r.removedMap[strokeId] = removed;
      return removed;
    }
    return null;
  }

  undoLastByUser(room: string, userId: string) {
    const r = this.ensureRoom(room);
    for (let i = r.strokes.length - 1; i >= 0; i--) {
      if (r.strokes[i].userId === userId) {
        const removed = r.strokes.splice(i, 1)[0];
        delete r.strokeIndex[removed.id];
        r.removedMap = r.removedMap || {};
        r.removedMap[removed.id] = removed; // store for possible redo
        return removed;
      }
    }
    return null;
  }

  getStroke(room: string, strokeId: string) {
    const r = this.ensureRoom(room);
    return r.strokeIndex[strokeId] || (r.removedMap && r.removedMap[strokeId]) || null;
  }

  restoreStroke(room: string, strokeId: string) {
    const r = this.ensureRoom(room);
    if (r.removedMap && r.removedMap[strokeId]) {
      const stroke = r.removedMap[strokeId];
      r.seqCounter = (r.seqCounter || 0) + 1;
      stroke.seq = r.seqCounter;
      r.strokes.push(stroke);
      r.strokeIndex[stroke.id] = stroke;
      delete r.removedMap[strokeId];
      return stroke;
    }
    return null;
  }

  clearRoom(room: string) {
    const r = this.ensureRoom(room);
    r.strokes = [];
    r.strokeIndex = {} as Record<string, Stroke>;
    r.removedMap = {};
    r.seqCounter = 0;
  }
}

export default new StateManager();
