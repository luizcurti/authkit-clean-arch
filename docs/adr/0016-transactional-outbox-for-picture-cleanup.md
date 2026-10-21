# 0016 — Transactional outbox for deleting replaced pictures, compare-and-set picture changes

## Status
Accepted. Supersedes the picture-deletion part of [ADR-0015](0015-private-picture-storage-and-s3mock.md).

## Context
Changing a profile picture touches two systems that cannot share a transaction: PostgreSQL (`users.picture_key`) and the object storage (S3). After ADR-0015 the flow was: upload the new object, `UPDATE` the profile, delete the previous object, return. The controller was wrapped in a database transaction, so the order really was:

1. upload the new object, holding a pooled connection while the upload ran
2. `UPDATE` the profile, not committed yet
3. delete the previous object from S3
4. commit

A rollback after step 3, from a failed commit or any later 5xx, put the profile back on the previous key, whose object was already gone. The picture broke, and the new object was orphaned because nothing referenced it. This is the general problem of external side effects inside a database transaction: rolling the transaction back does not undo them.

A second, independent problem was concurrency. Two picture changes for the same user both read the same current key. Both deleted it, and the first request's new object was overwritten in the profile without ever being deleted.

## Decision
- **No transaction around the request.** `PUT` and `DELETE /users/picture` are no longer wrapped by `DbTransactionController`. The upload happens first, with no connection held, under a fresh random key that nothing references yet.
- **Compare-and-set save.** `SaveUserPicture.savePicture` takes the key the use case read (`replacedPictureKey`) and runs `UPDATE … WHERE id = $1 AND picture_key IS NOT DISTINCT FROM $replaced`. It returns `false` when the profile changed in between. The use case then deletes its own upload and throws `ConcurrentModificationError`, which maps to `409 Conflict`. Of N concurrent changes, exactly one wins (tested against real PostgreSQL).
- **Transactional outbox for the deletion.** In the same short transaction as that `UPDATE`, the repository inserts a `ProfilePictureReplaced { pictureKey }` row into `outbox_events`. The deletion is scheduled if and only if the change commits.
- **Worker.** `ProcessOutboxEvents` claims a batch and deletes each object, marking the event processed.
  - It runs in-process every `OUTBOX_POLL_INTERVAL_SECONDS` (default 10, 1 in docker-compose) and as a one-off job (`npm run outbox:process`).
  - Claiming is one statement, `UPDATE … WHERE id IN (SELECT … FOR UPDATE SKIP LOCKED) RETURNING`. It leases the events (1 minute, measured on the database clock) and counts the attempt. Concurrent workers get disjoint batches, and an event whose worker died is retried when its lease expires.
  - A failed event keeps its lease as the retry delay and is given up after 5 attempts. It stays in the table with `last_error` for inspection.
- **Repositories can open their own transaction** (`PgRepository.transaction`), and a transaction already open in the same async context is joined rather than nested.

## Consequences
- **No broken pictures.** The previous object is deleted only after the change is durable. A failed or refused save deletes only the new upload, which nothing references.
- **Deletion is eventual.** The response returns before the previous object is gone: about one poll interval later, longer if S3 is failing. The Postman collection polls for the 404 instead of expecting it immediately.
- **At-least-once delivery.** A worker can delete an object and crash before marking the event processed. Handlers must be idempotent. Deleting a missing S3 key succeeds, so a redelivery is harmless.
- **One orphan case remains.** If the process dies between the upload and the save, the new object is never referenced or deleted. Closing it would require recording the upload *before* it happens (a pending-upload event, or a bucket lifecycle rule for unreferenced keys). That was judged not worth it for this project.
- **A new `409`.** Clients changing the picture from two places at once see a `409 Conflict` and can retry. Previously the last writer won silently and leaked an object.
- **A foundation for events.** `outbox_events` is a general mechanism. Publishing domain events to a broker (SNS/SQS, Kafka) would be another handler in the same worker, with the same delivery guarantees.
- **pg-mem cannot run the claim** (no `SKIP LOCKED`), so claiming, leasing and the concurrent compare-and-set are tested in `tests/postgres/outbox.pg.test.ts`.
