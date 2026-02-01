class StateManager {
  constructor() {
    this.rooms = new Map(); // room -> {strokes: [], strokeIndex: {}, seqCounter: 0, removedMap: {}}
  }

  ensureRoom(room) {
    if (!this.rooms.has(room)) this.rooms.set(room, { strokes: [], strokeIndex: {} });
    return this.rooms.get(room);
  }

  addStroke(room, stroke) {
    const r = this.ensureRoom(room);
    // assign a monotonic sequence number per room to keep ordering
    r.seqCounter = (r.seqCounter || 0) + 1;
    stroke.seq = r.seqCounter;
    r.strokes.push(stroke);
    r.strokeIndex[stroke.id] = stroke;
  }

  getHistory(room) {
    const r = this.ensureRoom(room);
    return r.strokes.slice();
  }

  removeStroke(room, strokeId) {
    const r = this.ensureRoom(room);
    const idx = r.strokes.findIndex(s => s.id === strokeId);
    if (idx !== -1) {
      const removed = r.strokes.splice(idx, 1)[0];
      delete r.strokeIndex[strokeId];
      // keep a copy for redo
      r.removedMap = r.removedMap || {};
      r.removedMap[strokeId] = removed;
      return removed;
    }
    return null;
  }

  undoLastByUser(room, userId) {
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

  getStroke(room, strokeId) {
    const r = this.ensureRoom(room);
    return r.strokeIndex[strokeId] || (r.removedMap && r.removedMap[strokeId]) || null;
  }

  restoreStroke(room, strokeId) {
    const r = this.ensureRoom(room);
    if (r.removedMap && r.removedMap[strokeId]) {
      const stroke = r.removedMap[strokeId];
      // restore at end with a new seq to preserve causal order
      r.seqCounter = (r.seqCounter || 0) + 1;
      stroke.seq = r.seqCounter;
      r.strokes.push(stroke);
      r.strokeIndex[stroke.id] = stroke;
      delete r.removedMap[strokeId];
      return stroke;
    }
    return null;
  }

  clearRoom(room) {
    const r = this.ensureRoom(room);
    r.strokes = [];
    r.strokeIndex = {};
    r.removedMap = {};
    r.seqCounter = 0;
  }

  clearRoom(room) {
    const r = this.ensureRoom(room);
    r.strokes = [];
    r.strokeIndex = {};
  }
}

module.exports = new StateManager();
