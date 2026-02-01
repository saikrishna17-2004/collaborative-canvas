class Rooms {
  map: Map<string, { clients: Set<string> }>;
  constructor() {
    this.map = new Map();
  }

  ensure(room: string) {
    if (!this.map.has(room)) this.map.set(room, { clients: new Set() });
    return this.map.get(room)!;
  }

  addClient(room: string, clientId: string) {
    const r = this.ensure(room);
    r.clients.add(clientId);
  }

  removeClient(room: string, clientId: string) {
    if (!this.map.has(room)) return;
    const r = this.map.get(room)!;
    r.clients.delete(clientId);
    if (r.clients.size === 0) this.map.delete(room);
  }
}

export default new Rooms();
