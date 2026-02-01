// Canvas drawing manager
(function(global){

  function getCanvasCoordinates(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }
  class CanvasManager {
    constructor(canvas, cursorCanvas, emitFn) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.cursorCanvas = cursorCanvas;
      this.cursorCtx = cursorCanvas.getContext('2d');
      this.pixelRatio = window.devicePixelRatio || 1;
      this.isDrawing = false;
      this.currentSegments = [];
      this.emit = emitFn; // (type, data)
      this.strokes = new Map(); // strokeId -> stroke
      this.undoStack = []; // local undo stack
      this.redoStack = []; // local redo stack
      this.cursors = new Map(); // userId -> {x, y, color}
      this.lastPos = null;
      
      // Tool and style
      this.tool = 'brush'; // 'brush' or 'eraser'
      this.color = '#000000';
      this.width = 4;
      
      // Color pool for user cursors
      this.colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
      this.userColorMap = new Map();

      // Now that internal state/maps are initialized, setup sizing and listeners
      this.resize();
      window.addEventListener('resize', ()=>this.resize());
    }

    resize(){
      
      const rect = this.canvas.getBoundingClientRect();
      // Set the actual pixel dimensions
      this.canvas.width = Math.floor(rect.width);
      this.canvas.height = Math.floor(rect.height);
      
      // Set CSS dimensions to match
      this.canvas.style.width = rect.width + 'px';
      this.canvas.style.height = rect.height + 'px';
      
      this.cursorCanvas.width = Math.floor(rect.width);
      this.cursorCanvas.height = Math.floor(rect.height);
      this.cursorCanvas.style.width = rect.width + 'px';
      this.cursorCanvas.style.height = rect.height + 'px';
      this.redrawAll();
    }

    setStyle(color, width){ this.color = color; this.width = width; }

    setTool(tool){ this.tool = tool; }

    pointerDown(e){
      this.isDrawing = true;
      const pos = getCanvasCoordinates(e, this.canvas);
      this.lastPos = pos;
      this.currentSegments = [];
      this.emit('user_status', { status: 'drawing' });
      // Draw initial point
      console.log('[Canvas] pointerDown', pos, 'tool=', this.tool, 'color=', this.color, 'width=', this.width);
      this.drawSegment({ start: pos, end: pos }, this.color, this.width, true);
    }

    pointerMove(e){
      const pos = getCanvasCoordinates(e, this.canvas);
      if (this.isDrawing && this.lastPos) {
        const seg = { start: this.lastPos, end: pos };
        this.currentSegments.push(seg);
        this.drawSegment(seg, this.color, this.width, true);
        console.log('[Canvas] pointerMove draw segment', seg);
        // throttle emit with requestAnimationFrame
        if (!this._scheduled) {
          this._scheduled = true;
          requestAnimationFrame(()=>{
            this._scheduled = false;
            if (this.currentSegments.length) {
              this.emit('drawing_step', { segments: this.currentSegments.slice(), style: { color: this.color, width: this.width } });
              this.currentSegments = [];
            }
          });
        }
      } else {
        this.emit('cursor', { x: pos.x, y: pos.y });
        // show cursor movement debug
        // console.log('[Canvas] pointerMove cursor', pos);
      }
      this.lastPos = pos;
    }

    pointerUp(e){
      if (!this.isDrawing) return;
      const pos = getCanvasCoordinates(e, this.canvas);
      console.log('[Canvas] pointerUp', pos, 'segments:', this.currentSegments.length);
      // commit final stroke to server
      const stroke = { 
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, 
        segments: this.currentSegments, 
        style: { 
          color: this.tool === 'eraser' ? 'ERASER' : this.color, 
          width: this.width 
        },
        tool: this.tool
      };
      this.emit('commit_stroke', stroke);
      this.undoStack.push(stroke.id); // track for local undo
      this.redoStack = []; // clear redo stack on new stroke
      this.currentSegments = [];
      this.isDrawing = false;
      this.emit('user_status', { status: 'idle' });
    }

    drawSegment(seg, color='black', width=4, immediate=false){
      // Draw a smoothed segment using quadratic curve for better aesthetics
      try {
        const ctx = this.ctx;
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Handle eraser tool
        if (this.tool === 'eraser') {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.strokeStyle = 'rgba(0,0,0,1)';
          ctx.lineWidth = width;
        } else {
          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = color;
          ctx.lineWidth = width;
        }

        ctx.beginPath();
        // simple smoothing: use midpoint as control point
        const sx = seg.start.x, sy = seg.start.y;
        const ex = seg.end.x, ey = seg.end.y;
        const cx = (sx + ex) / 2;
        const cy = (sy + ey) / 2;
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(cx, cy, ex, ey);
        ctx.stroke();
        ctx.restore();
      } catch (err) {
        console.error('drawSegment error', err);
      }
    }

    applyRemoteStep({ segments, style, userId }){
      for (const s of segments) this.drawSegment(s, style.color, style.width);
    }

    commitStroke(stroke){
      // draw stroke fully and cache it
      this.strokes.set(stroke.id, stroke);
      const drawColor = stroke.style.color;
      for (const s of stroke.segments) this.drawSegment(s, drawColor, stroke.style.width);
    }

    removeStroke(strokeId){
      // Remove from cache and redraw all strokes
      this.strokes.delete(strokeId);
      this.redrawAll();
    }

    popUndo(){
      // Local undo - remove last stroke
      if (this.undoStack.length > 0) {
        const strokeId = this.undoStack.pop();
        this.redoStack.push(strokeId);
        this.emit('undo');
        return strokeId;
      }
      return null;
    }

    popRedo(){
      // Local redo - restore last undone stroke
      if (this.redoStack.length > 0) {
        const strokeId = this.redoStack.pop();
        this.undoStack.push(strokeId);
        this.emit('redo', strokeId);
        return strokeId;
      }
      return null;
    }

    clearCanvas(){
      this.strokes.clear();
      this.undoStack = [];
      this.redoStack = [];
      this.clear();
      this.emit('canvas_cleared');
    }

    exportCanvas(){
      return this.canvas.toDataURL('image/png');
    }

    redrawAll(){
      // Clear and replay all stored strokes
      this.clear();
      for (const stroke of this.strokes.values()) {
        for (const s of stroke.segments) this.drawSegment(s, stroke.style.color, stroke.style.width);
      }
    }

    setCursorPosition(userId, x, y){
      if (!this.cursors.has(userId)) {
        this.cursors.set(userId, {});
        // assign color to user
        if (!this.userColorMap.has(userId)) {
          const colorIdx = this.userColorMap.size % this.colors.length;
          this.userColorMap.set(userId, this.colors[colorIdx]);
        }
      }
      this.cursors.get(userId).x = x;
      this.cursors.get(userId).y = y;
      this.drawCursors();
    }

    clear(){
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawCursors(){
      // Clear cursor layer and redraw all cursors
      const rect = this.cursorCanvas.getBoundingClientRect();
      this.cursorCtx.clearRect(0, 0, rect.width, rect.height);
      
      for (const [userId, pos] of this.cursors.entries()) {
        if (pos.x !== undefined && pos.y !== undefined) {
          const color = this.userColorMap.get(userId) || '#999';
          this.drawCursor(pos.x, pos.y, color, userId);
        }
      }
    }

    drawCursor(x, y, color, userId){
      const ctx = this.cursorCtx;
      ctx.save();
      // Draw a small circle for cursor
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      // Draw border
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Draw label
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#333';
      ctx.font = '10px Arial';
      ctx.fillText(userId.slice(0, 8), x + 8, y - 4);
      ctx.restore();
    }
  }

  global.CanvasManager = CanvasManager;
  global.getCanvasCoordinates = getCanvasCoordinates;
})(window);
