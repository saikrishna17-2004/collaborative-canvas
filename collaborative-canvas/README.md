# Collaborative Canvas

Multi-user drawing application with real-time synchronization using HTML5 Canvas API and Socket.io.

## Features

### Core Drawing
- **Native Canvas API** – Pure 2D context rendering, no external drawing libraries
- **Brush Tool** – Smooth line drawing with adjustable color and stroke width
- **Eraser Tool** – Uses canvas `destination-out` compositing to remove pixels
- **Real-time Sync** – See other users' strokes appear as they draw (via `drawing_step` events)
- **High-frequency Event Throttling** – Uses `requestAnimationFrame` to batch path segments

### Collaboration
- **Ghost Cursors** – See where other users are pointing with color-coded indicators
- **User Indicators** – Online users panel showing connected participants with assigned colors
- **Room Isolation** – Join different rooms via `?room=name` query parameter
- **User Management** – Dynamic user list broadcasts on join/leave events

### State Management
- **Global History** – Server maintains stroke order across all clients
- **Undo/Redo** – Per-user undo removes only your strokes; redo restores them
- **Efficient Sync** – Undo broadcasts only stroke ID (not full redraw)
- **Conflict Resolution** – Strokes rendered in order; overlapping areas blend naturally

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Run server:

```bash
npm start
```

3. Open http://localhost:3000 in two browser windows (optionally add `?room=myroom`)

## Architecture

- **Server** (`server/server.js`) – Express + Socket.io event broker and history manager
- **State Manager** (`server/state-manager.js`) – Stroke history with fast lookup/removal by ID
- **Canvas Manager** (`client/canvas.js`) – Drawing logic, coordinate scaling, cursor tracking
- **WebSocket Client** (`client/websocket.js`) – Socket.io event handler wrapper
- **UI Controller** (`client/main.js`) – Tool binding, user list, undo/redo coordination

## How It Works

1. **Drawing**: Local mouse/touch moves create segments cached in memory; on pointerup, stroke committed to server
2. **Broadcasting**: Server relays strokes to all clients in room; each client redraws locally
3. **Undo**: Client emits `undo` event; server finds last stroke by user, removes it from history, broadcasts removal ID
4. **Cursors**: Cursor movements throttled via `oncursor` event; server broadcasts to room; clients draw colored dots on overlay canvas
5. **Users**: On join, server broadcasts user list; clients render in right sidebar with color dots

## Key Technical Details

- **Coordinate Mapping**: Canvas width/height scaled by `devicePixelRatio` to handle HiDPI displays
- **Eraser**: Tool metadata stored with stroke; client applies `ctx.globalCompositeOperation = 'destination-out'`
- **Cursor Layer**: Separate canvas overlay for real-time cursor positions (pointer-events: none)
- **Throttling**: Path segments batched via `requestAnimationFrame` to reduce network traffic
- **State Reconstruction**: On undo, full canvas redrawn from remaining strokes in `redrawAll()`
