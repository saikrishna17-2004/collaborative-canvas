# Architecture

## Overview

**Server**: Express + Socket.io
- Serves static client files from `/client`
- Acts as real-time message broker for room-based collaboration
- Maintains per-room stroke history and enforces order

**Client**: Vanilla JavaScript
- Renders drawing canvas with native 2D context
- Uses `requestAnimationFrame` for throttled event emission
- Maintains local stroke cache for fast undo/redo

## Data Flow

### Drawing Workflow
1. **Local Input** → Pointer events captured, segments accumulated in `currentSegments[]`
2. **Throttling** → `requestAnimationFrame` triggers batch emit of `drawing_step`
3. **Server Relay** → Server forwards `drawing_step` to all clients in room (except sender)
4. **Remote Render** → Other clients apply segments to canvas immediately
5. **Commit** → On `pointerup`, stroke with ID sent via `commit_stroke` to server
6. **Persistence** → Server adds stroke to room history, broadcasts to all clients

### Undo/Redo Flow
1. **User clicks Undo** → Client calls `manager.popUndo()`, emits `undo` event
2. **Server processes** → Finds last stroke by user, removes from history
3. **Broadcast** → Server sends `stroke_removed` event with stroke ID
4. **Client redraw** → All clients delete stroke from cache, call `redrawAll()` to replay remaining
5. **Redo available** → Stroke ID pushed to `redoStack[]`; clicking redo broadcasts to restore it

### Cursor Sync
1. **Throttled** → `oncursor` event on pointer move (not during drawing)
2. **Server broadcasts** → Relays cursor position to all other clients
3. **Overlay render** → Client draws color circle on separate `#cursor-layer` canvas
4. **User labels** → Shows first 8 chars of socket ID with assigned color

### User Management
1. **Join event** → New client emits `join` with room name
2. **Server broadcasts** → Sends `user_list` with all connected socket IDs in room
3. **Color assignment** → Client assigns next color from pool to new user
4. **Live panel** → Right sidebar updates with color-coded user list

## State Management

### Server-Side (state-manager.js)
- **Rooms**: Map of room → {strokes: [], strokeIndex: {}}
- **strokeIndex**: Fast O(1) lookup by stroke ID for removal
- **undoLastByUser()**: Linear search from end to find user's most recent stroke
- **getHistory()**: Cloned array sent to new clients on join

### Client-Side (CanvasManager)
- **strokes**: Map of ID → stroke for redraw on undo
- **undoStack**: Array of stroke IDs for local undo tracking
- **redoStack**: Array of stroke IDs restored on undo, cleared on new stroke
- **cursors**: Map of userId → {x, y} for ghost cursor rendering

## Conflict Resolution

**Strategy**: Order-based, commutative rendering
- All clients maintain identical stroke order (sourced from server)
- Overlapping strokes blend naturally (composite modes respect paint order)
- No operational transforms (OT) or conflict detection needed
- Eraser strokes remove pixels in draw order (later erasers override earlier)

**Trade-offs**:
- ✅ Simplicity: Pure append-only history
- ✅ Consistency: All clients see same result
- ❌ Latency: Takes ~50-100ms for stroke to appear on other clients
- ❌ Causality: If Alice and Bob draw simultaneously, order depends on network timing

## Performance Considerations

### Network Efficiency
- **Batching**: Path segments grouped by `requestAnimationFrame` (~16ms)
- **Undo broadcast**: Only stroke ID sent, not full redraw commands
- **Cursor throttle**: Cursor events separate from drawing to reduce frequency

### Canvas Rendering
- **Local draw**: Immediate on pointer move (satisfying UX)
- **Remote draw**: Via `drawing_step`, same frequency as local (~60fps potential)
- **Redraw on undo**: O(n) replay of remaining strokes (acceptable for < 1000 strokes)

### Scalability Limits
- ~100 concurrent users per room (Socket.io handles)
- ~10,000 strokes before redraw performance degrades
- Browser memory: ~50MB per 1,000 complex strokes

## Extension Points

**Add text tool**: Store text segments with font/size metadata, render via `ctx.fillText()`
**Add selection**: Track bounding boxes, emit `select` events, highlight on overlay canvas
**Add layers**: Map strokes to layer IDs, redraw per-layer on visibility toggle
**Persistence**: Add MongoDB to store strokes, replay on server restart
**Playback**: Record timestamp per stroke, replay at original speed
