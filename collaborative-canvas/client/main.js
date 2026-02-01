window.addEventListener('load', ()=>{
  const canvasEl = document.getElementById('canvas');
  const cursorCanvasEl = document.getElementById('cursor-layer');
  const colorEl = document.getElementById('color');
  const widthEl = document.getElementById('width');
  const undoBtn = document.getElementById('undo');
  const redoBtn = document.getElementById('redo');
  const brushToolBtn = document.getElementById('brush-tool');
  const eraserToolBtn = document.getElementById('eraser-tool');
  const clearBtn = document.getElementById('clear-btn');
  const saveBtn = document.getElementById('save-btn');
  const colorSwatches = document.querySelectorAll('.color-swatch');
  const usersList = document.getElementById('users-list');
  const chatMessages = document.getElementById('chat-messages');
  const chatInput = document.getElementById('chat-input');
  const chatSend = document.getElementById('chat-send');
  const status = document.getElementById('status');

  // Simple room from query or default
  const params = new URLSearchParams(location.search);
  const room = params.get('room') || 'default';

  const manager = new CanvasManager(canvasEl, cursorCanvasEl, (type, data)=>{
    ws.emit(type, data);
  });

  function setStatus(s){ status.textContent = s }

  const ws = WS.connect(room, {
    onconnect: (id)=> { setStatus('Connected'); console.log('Connected with ID:', id); },
    onhistory: (history)=>{
      manager.clear();
      for (const stroke of history) manager.commitStroke(stroke);
      console.log('Loaded history with', history.length, 'strokes');
    },
    ondrawingstep: (data)=> manager.applyRemoteStep(data),
    oncommit: (stroke)=>{ manager.commitStroke(stroke); console.log('Remote stroke committed'); },
    oncursor: (data)=>{ manager.setCursorPosition(data.userId, data.pos.x, data.pos.y); },
    onstrokeremoved: (data)=>{ manager.removeStroke(data.strokeId); console.log('Stroke removed:', data.strokeId); },
    onuserjoin: (data)=>{ console.log('User joined:', data.userId); },
    onuserleft: (data)=>{ console.log('User left:', data.userId); },
    onuserlist: (users)=>{ updateUserList(users, manager); },
    onchatmsg: (msg)=>{ addChatMessage(msg); },
    oncanvascleared: ()=>{ manager.strokes.clear(); manager.redrawAll(); },
    onuserstatus: (data)=>{ updateUserStatus(data.userId, data.status, manager); }
  });

  canvasEl.addEventListener('pointerdown', (e)=>{ manager.pointerDown(e); canvasEl.setPointerCapture(e.pointerId); });
  canvasEl.addEventListener('pointermove', (e)=> manager.pointerMove(e));
  canvasEl.addEventListener('pointerup', (e)=>{ manager.pointerUp(e); canvasEl.releasePointerCapture(e.pointerId); });
  canvasEl.addEventListener('pointercancel', (e)=>{ manager.pointerUp(e); });

  colorEl.addEventListener('change', ()=> manager.setStyle(colorEl.value, widthEl.value));
  widthEl.addEventListener('change', ()=> manager.setStyle(colorEl.value, widthEl.value));
  undoBtn.addEventListener('click', ()=> manager.popUndo());
  redoBtn.addEventListener('click', ()=> manager.popRedo());
  
  clearBtn.addEventListener('click', ()=> {
    if (confirm('Clear canvas for all users?')) {
      manager.clearCanvas();
    }
  });

  saveBtn.addEventListener('click', ()=> {
    const link = document.createElement('a');
    link.href = manager.exportCanvas();
    link.download = `drawing-${Date.now()}.png`;
    link.click();
  });

  colorSwatches.forEach(swatch => {
    swatch.addEventListener('click', ()=> {
      const color = swatch.getAttribute('data-color');
      colorEl.value = color;
      manager.setStyle(color, widthEl.value);
    });
  });
  
  brushToolBtn.addEventListener('click', ()=> {
    manager.setTool('brush');
    brushToolBtn.classList.add('active');
    eraserToolBtn.classList.remove('active');
    colorEl.disabled = false;
  });
  
  eraserToolBtn.addEventListener('click', ()=> {
    manager.setTool('eraser');
    eraserToolBtn.classList.add('active');
    brushToolBtn.classList.remove('active');
    colorEl.disabled = true;
  });

  chatInput.addEventListener('keypress', (e)=> {
    if (e.key === 'Enter') sendChat();
  });
  chatSend.addEventListener('click', ()=> sendChat());

  function sendChat(){
    const msg = chatInput.value.trim();
    if (msg) {
      ws.emit('chat_message', { text: msg });
      chatInput.value = '';
    }
  }

  // initialize style
  manager.setStyle(colorEl.value, widthEl.value);
  setStatus('Ready');
});

function setStatus(s){ document.getElementById('status').textContent = s; }

function updateUserList(userIds, manager) {
  const list = document.getElementById('users-list');
  list.innerHTML = '';
  for (const uid of userIds) {
    const color = manager.userColorMap.get(uid) || '#999';
    const item = document.createElement('div');
    item.className = 'user-item';
    item.id = `user-${uid}`;
    item.innerHTML = `<div class="user-color" style="background-color:${color}"></div><span>${uid.slice(0, 8)}</span><span class="user-status"></span>`;
    list.appendChild(item);
  }
}

function updateUserStatus(userId, status, manager) {
  const userEl = document.getElementById(`user-${userId}`);
  if (userEl) {
    const statusEl = userEl.querySelector('.user-status');
    statusEl.textContent = status === 'drawing' ? '✏️' : '';
  }
}

function addChatMessage(msg) {
  const container = document.getElementById('chat-messages');
  const msgEl = document.createElement('div');
  msgEl.className = 'chat-msg';
  msgEl.innerHTML = `<div class="chat-user">${msg.userId.slice(0, 8)}</div><div class="chat-text">${escapeHtml(msg.text)}</div>`;
  container.appendChild(msgEl);
  container.scrollTop = container.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
