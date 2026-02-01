class Rooms {
  constructor() {
    this.map = new Map();
  }

  ensure(room) {
    if (!this.map.has(room)) this.map.set(room, { clients: new Set() });
    return this.map.get(room);
  }

  addClient(room, clientId) {
    const r = this.ensure(room);
    r.clients.add(clientId);
  }

  removeClient(room, clientId) {
    if (!this.map.has(room)) return;
    const r = this.map.get(room);
    r.clients.delete(clientId);
    if (r.clients.size === 0) this.map.delete(room);
  }
}

module.exports = new Rooms();
