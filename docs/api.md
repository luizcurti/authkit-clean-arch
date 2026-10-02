# API

All routes live under `/api`. The full contract is the [OpenAPI spec](../src/main/docs/swagger.json), served as Swagger UI at `/api-docs` outside production. The [Postman collection](api/collection.postman_collection.json) exercises every endpoint (`npm run test:api`).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/login/facebook` | — | Exchange a Facebook access token for an access token (15 min JWT) and a refresh token (7 days) |
| POST | `/api/login/refresh` | — | Rotate a refresh token into a new pair |
| POST | `/api/logout` | — | Revoke the refresh token's session; always `204` |
| PUT | `/api/users/picture` | Bearer | Upload or replace the profile picture (multipart field `picture`, PNG/JPG, 5 MB) |
| DELETE | `/api/users/picture` | Bearer | Remove the picture; returns initials |
| GET | `/api/health` | — | Liveness |
| GET | `/api/health/detailed` | `OPS_TOKEN` | Database latency, memory and runtime info |
| GET | `/api/metrics` | `OPS_TOKEN` | Prometheus metrics |

Both picture routes answer `409 Conflict` when another request changed the picture after this one read it; nothing is saved and the client can retry. The replaced object is deleted from storage shortly after the change commits, not during the request.

`OPS_TOKEN` endpoints are open outside production when no token is configured, and return `404` in production without one.

## Errors

Every error is JSON with the request's correlation id, which also appears in the `X-Request-Id` response header and in the logs:

```json
{ "error": "unauthorized", "requestId": "b1e6c8b0-…" }
```

| Status | When |
|--------|------|
| `400` | Missing field, field of the wrong type, malformed JSON body, invalid upload (no file or another field name, type, size, content not matching the declared type, malformed multipart) |
| `401` | Bad Facebook token (including one whose email is already linked to another Facebook identity), unknown/expired/reused refresh token, or a missing/invalid access token on a protected route (with a `WWW-Authenticate: Bearer` challenge) |
| `404` | Unknown route; on the picture routes, a valid access token whose user no longer exists |
| `409` | The profile picture was changed concurrently; nothing was saved, retry |
| `413` | JSON body over 100 KB |
| `429` | Rate limit: 100 req/min per client, 10 req/min on login, refresh and logout (defaults, see `RATE_LIMIT_PER_MINUTE` in [operations](operations.md)) |
| `500` | Unexpected error, never with internal details |
| `502` | Facebook unavailable after retries |

## Example

```bash
curl -X POST http://localhost:8080/api/login/facebook -H "Content-Type: application/json" -d '{"token":"<facebook token>"}'
# {"accessToken":"eyJ…","refreshToken":"rt_…"}

curl -X POST http://localhost:8080/api/login/refresh -H "Content-Type: application/json" -d '{"refreshToken":"rt_…"}'

curl -X PUT http://localhost:8080/api/users/picture -H "Authorization: Bearer <accessToken>" -F "picture=@avatar.png"
# {"pictureUrl":"http://localhost:9090/authkit-pictures/1_<uuid>.png"}
```
