# Quick Start Guide - Collaborative Drawing Canvas

## 🚀 Getting Started (30 seconds)

### 1. Start the Server
```bash
cd collaborative-canvas
npm start
```

The server will launch on **http://localhost:3000**

### 2. Open in Your Browser
Open **two browser windows** or tabs:
- Window 1: http://localhost:3000
- Window 2: http://localhost:3000

### 3. Start Drawing!
- Draw on one canvas
- See it appear **instantly** on the other
- Undo with **Ctrl+Z**
- See each other's **cursors in real-time**
- Chat with each other

---

## 📋 Project Structure

```
collaborative-canvas/
├── server/                 # Node.js + Socket.io backend
│   ├── server.ts          # Main server with event handlers
│   ├── state-manager.ts   # Undo/redo + stroke history
│   ├── rooms.ts           # Room isolation logic
│   ├── db.ts              # MongoDB persistence layer
│   └── state-manager.test.ts  # 6 Jest unit tests
├── client/                # Frontend (vanilla JS + HTML5 Canvas)
│   ├── index.html         # UI structure
│   ├── canvas.js          # Drawing engine
│   ├── main.js            # Event handlers
│   ├── websocket.js       # Socket.io wrapper
│   └── style.css          # Styling
├── package.json           # Dependencies + scripts
├── tsconfig.json          # TypeScript configuration
├── jest.config.js         # Test configuration
├── README.md              # Full documentation
├── ARCHITECTURE.md        # Technical deep-dive
└── COMPLETION_REPORT.md   # Phase 5 completion details
```

---

## 🔧 Available Commands

### Run Server
```bash
npm start
# Starts ts-node server on port 3000
```

### Development Mode (auto-reload)
```bash
npm run dev
# Uses nodemon to watch for changes
```

### Run Tests
```bash
npm test
# Runs Jest unit tests (6 tests, all passing)
```

### Run Tests with Watch
```bash
npm run test:watch
# Re-runs tests on file changes
```

### Build TypeScript
```bash
npm run build
# Compiles .ts files to dist/ directory
```

---

## 🎨 Features

### Drawing Tools
- **Brush**: Smooth freehand drawing
- **Eraser**: Remove parts of your drawing
- **Color Picker**: Choose any color
- **Preset Colors**: Quick color swatches
- **Brush Width**: Adjust line thickness

### Collaboration
- **Ghost Cursors**: See where other users are pointing
- **User List**: See who's online (color-coded)
- **Drawing Status**: See who's actively drawing (✏️)
- **Chat**: Send messages to other users
- **Room Isolation**: Each room has separate canvas

### State Management
- **Undo/Redo**: Undo only removes *your* strokes
- **Keyboard Shortcuts**: 
  - `Ctrl+Z` - Undo
  - `Ctrl+Shift+Z` - Redo
- **Clear Canvas**: Wipe everything (with confirmation)
- **Save Drawing**: Export as PNG

### Persistence (with MongoDB)
- **Auto-save**: Strokes saved to database
- **Reload History**: New users see previous drawings
- **Persistent Undo**: Undo operations cascade to DB
- **Fallback Mode**: Works without MongoDB too

---

## 💾 Database Setup (Optional)

### Using MongoDB Atlas (Cloud)
1. Create free account at https://www.mongodb.com/cloud/atlas
2. Create a cluster and get connection string
3. Create `.env` file in project root:
   ```
   MONGO_URL=mongodb+srv://user:password@cluster.mongodb.net/drawing
   PORT=3000
   ```
4. Restart server

### Using Local MongoDB
```bash
# Docker (easiest)
docker run -d -p 27017:27017 mongo

# or install locally and run
mongod
```

Then create `.env`:
```
MONGO_URL=mongodb://localhost:27017/drawing
PORT=3000
```

### Without Database
Server runs fine without MongoDB - uses in-memory store instead (drawings lost on restart).

---

## ✅ Verification

### Check Server is Running
```bash
# Should see: "Server listening on http://localhost:3000"
npm start
```

### Run Tests
```bash
npm test
# Should show: "6 passed, 6 total" ✅
```

### Verify TypeScript
```bash
npm run build
# Should compile with 0 errors
```

---

## 🐛 Troubleshooting

### Port 3000 Already in Use
```bash
# Kill process using port 3000, or change PORT in .env
```

### Module not found errors
```bash
# Reinstall dependencies
npm install
```

### Tests failing
```bash
# Make sure ts-jest is installed
npm install --save-dev ts-jest

# Run tests again
npm test
```

### MongoDB connection errors
- Normal if MongoDB isn't running
- Server will use in-memory storage instead
- Install MongoDB locally or use Atlas for persistence

---

## 📖 Documentation

- **[README.md](README.md)** - Full feature list and architecture
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Technical deep-dive (data structures, algorithms, conflict resolution)
- **[COMPLETION_REPORT.md](COMPLETION_REPORT.md)** - Phase 5 implementation details

---

## 🎯 What's Next?

### Immediate (Try These)
1. Open two windows and draw together
2. Use undo/redo to see per-user stroke removal
3. Clear canvas and watch all users see it cleared
4. Export your drawing as PNG
5. Chat with another user

### Future Enhancements
- Client-side TypeScript migration
- Text tool and shapes
- Layer system
- User authentication
- Drawing tutorials / examples
- Docker containerization
- CI/CD pipeline (GitHub Actions)

---

## 📞 Support

All code is fully documented with:
- Inline comments explaining complex logic
- Type definitions in TypeScript
- Unit tests demonstrating correct behavior
- Architecture documentation for design decisions

Check the documentation files above for detailed explanations.

---

**Happy drawing! 🎨**
