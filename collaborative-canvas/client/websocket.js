// websocket wrapper using socket.io
(function(global){
  function connect(room, handlers){
    const socket = io();
    
    socket.on('connect', ()=>{
      // Allow custom user identification
      const username = localStorage.getItem('username') || `User-${socket.id.slice(0, 8)}`;
      const color = localStorage.getItem('userColor') || `#${Math.floor(Math.random() * 16777215).toString(16)}`;
      
      socket.emit('identify', { username, color });
      socket.emit('join', room);
      if (handlers.onconnect) handlers.onconnect(socket.id);
    });

    socket.on('connect_error', (err)=>{
      console.warn('socket connect_error', err);
      if (handlers.onconnecterror) handlers.onconnecterror(err);
    });

    socket.io.on('reconnect_attempt', ()=>{
      // will try to reconnect automatically
    });

    socket.on('reconnect', (attempt)=>{
      // re-join room and request fresh history
      const username = localStorage.getItem('username') || `User-${socket.id.slice(0, 8)}`;
      const color = localStorage.getItem('userColor') || `#${Math.floor(Math.random() * 16777215).toString(16)}`;
      socket.emit('identify', { username, color });
      socket.emit('join', room);
      if (handlers.onreconnect) handlers.onreconnect(attempt);
    });

    // Event handlers
    socket.on('user_identified', (data)=>{ if (handlers.onuseridentified) handlers.onuseridentified(data); });
    socket.on('history', (history)=>{ if (handlers.onhistory) handlers.onhistory(history); });
    socket.on('drawing_step', (data)=>{ if (handlers.ondrawingstep) handlers.ondrawingstep(data); });
    socket.on('commit_stroke', (stroke)=>{ if (handlers.oncommit) handlers.oncommit(stroke); });
    socket.on('cursor', (data)=>{ if (handlers.oncursor) handlers.oncursor(data); });
    socket.on('stroke_removed', (data)=>{ if (handlers.onstrokeremoved) handlers.onstrokeremoved(data); });
    socket.on('user_joined', (data)=>{ if (handlers.onuserjoin) handlers.onuserjoin(data); });
    socket.on('user_left', (data)=>{ if (handlers.onuserleft) handlers.onuserleft(data); });
    socket.on('user_list', (data)=>{ if (handlers.onuserlist) handlers.onuserlist(data); });
    socket.on('room_users_updated', (data)=>{ if (handlers.onroomusersupdate) handlers.onroomusersupdate(data); });
    socket.on('chat_message', (data)=>{ if (handlers.onchatmsg) handlers.onchatmsg(data); });
    socket.on('canvas_cleared', (data)=>{ if (handlers.oncanvascleared) handlers.oncanvascleared(data); });
    socket.on('user_status', (data)=>{ if (handlers.onuserstatus) handlers.onuserstatus(data); });

    return {
      emit: (ev, data)=>{
        try {
          if (socket && socket.connected) socket.emit(ev, data);
          else socket.emit(ev, data); // queueing handled by socket.io
        } catch (err) {
          console.error('emit error', err);
        }
      },
      socket,
      setUsername: (username) => {
        localStorage.setItem('username', username);
      },
      setUserColor: (color) => {
        localStorage.setItem('userColor', color);
      }
    };
  }

  global.WS = { connect };
})(window);
