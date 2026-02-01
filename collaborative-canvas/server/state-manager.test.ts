import state from '../server/state-manager';

describe('StateManager', () => {
  const testRoom = 'test-room-' + Date.now();

  beforeEach(() => {
    // Clear room before each test
    state.clearRoom(testRoom);
  });

  test('should add a stroke', () => {
    const stroke = {
      id: 'stroke-1',
      segments: [{ start: { x: 0, y: 0 }, end: { x: 10, y: 10 } }],
      style: { color: '#000', width: 4 },
      userId: 'user-1'
    };

    state.addStroke(testRoom, stroke);
    const history = state.getHistory(testRoom);

    expect(history).toHaveLength(1);
    expect(history[0].id).toBe('stroke-1');
    expect(history[0].seq).toBe(1);
  });

  test('should assign monotonic sequence numbers', () => {
    const stroke1 = { id: 's1', segments: [], style: { color: '#000', width: 4 }, userId: 'u1' };
    const stroke2 = { id: 's2', segments: [], style: { color: '#000', width: 4 }, userId: 'u2' };

    state.addStroke(testRoom, stroke1);
    state.addStroke(testRoom, stroke2);

    const history = state.getHistory(testRoom);
    expect(history[0].seq).toBe(1);
    expect(history[1].seq).toBe(2);
  });

  test('should undo last stroke by user', () => {
    const s1 = { id: 's1', segments: [], style: { color: '#000', width: 4 }, userId: 'u1' };
    const s2 = { id: 's2', segments: [], style: { color: '#000', width: 4 }, userId: 'u2' };
    const s3 = { id: 's3', segments: [], style: { color: '#000', width: 4 }, userId: 'u1' };

    state.addStroke(testRoom, s1);
    state.addStroke(testRoom, s2);
    state.addStroke(testRoom, s3);

    const removed = state.undoLastByUser(testRoom, 'u1');
    expect(removed?.id).toBe('s3');

    const history = state.getHistory(testRoom);
    expect(history).toHaveLength(2);
    expect(history[1].id).toBe('s2');
  });

  test('should restore stroke on redo', () => {
    const stroke = { id: 's1', segments: [], style: { color: '#000', width: 4 }, userId: 'u1' };

    state.addStroke(testRoom, stroke);
    const removed = state.undoLastByUser(testRoom, 'u1');
    expect(removed?.id).toBe('s1');

    const restored = state.restoreStroke(testRoom, 's1');
    expect(restored?.id).toBe('s1');

    const history = state.getHistory(testRoom);
    expect(history).toHaveLength(1);
  });

  test('should clear room', () => {
    const s1 = { id: 's1', segments: [], style: { color: '#000', width: 4 }, userId: 'u1' };
    const s2 = { id: 's2', segments: [], style: { color: '#000', width: 4 }, userId: 'u2' };

    state.addStroke(testRoom, s1);
    state.addStroke(testRoom, s2);
    expect(state.getHistory(testRoom)).toHaveLength(2);

    state.clearRoom(testRoom);
    expect(state.getHistory(testRoom)).toHaveLength(0);
  });

  test('should get stroke by id', () => {
    const stroke = { id: 's1', segments: [], style: { color: '#000', width: 4 }, userId: 'u1' };

    state.addStroke(testRoom, stroke);
    const found = state.getStroke(testRoom, 's1');
    expect(found?.id).toBe('s1');
  });
});
