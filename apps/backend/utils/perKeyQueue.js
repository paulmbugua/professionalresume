// utils/perKeyQueue.js
export class PerKeyQueue {
  constructor() {
    this._chains = new Map(); // key -> Promise chain
  }
  enqueue(key, task) {
    const prev = this._chains.get(key) || Promise.resolve();
    const next = prev
      .then(() => task())
      .finally(() => {
        // if no newer tasks chained, clear
        if (this._chains.get(key) === next) this._chains.delete(key);
      });
    this._chains.set(key, next);
    return next;
  }
  // optional: to serialize globally, use a constant key like '__GLOBAL__'
}
