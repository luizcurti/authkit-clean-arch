// The data changed after it was read; nothing was written
export class ConcurrentModificationError extends Error {
  constructor () {
    super('The resource was modified concurrently')
    this.name = 'ConcurrentModificationError'
  }
}
