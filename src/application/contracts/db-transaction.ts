export interface DbTransaction {
  // Runs `work` in a transaction that repositories used inside it join. Commits when it resolves,
  // rolls back and rethrows when it rejects
  transaction: <T>(work: () => Promise<T>) => Promise<T>
}
