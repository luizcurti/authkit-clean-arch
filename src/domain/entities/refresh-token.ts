export const RefreshToken = {
  expirationInMs: 7 * 24 * 60 * 60 * 1000,
  // A replay within this window is a concurrent refresh: rejected without revoking the family (ADR-0013)
  reuseGraceInMs: 5 * 1000
}
