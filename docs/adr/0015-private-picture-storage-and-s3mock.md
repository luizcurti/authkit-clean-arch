# 0015 — Private picture storage: keys not URLs, no ACLs, CDN or pre-signed URLs, S3Mock locally

## Status
Accepted. The deletion of the previous object is superseded by [ADR-0016](0016-transactional-outbox-for-picture-cleanup.md): it is now scheduled through a transactional outbox instead of done best-effort in the request.

## Context
Profile pictures were uploaded with `ACL: 'public-read'`, and the resulting public S3 URL was stored in `users.picture_url`. Several things were wrong:

- **The ACL fails on new buckets.** Since April 2023, new buckets have ACLs disabled (Object Ownership = `BucketOwnerEnforced`), so `PutObject` with an ACL fails with `AccessControlListNotSupported`. Public buckets are also something AWS actively discourages.
- **Rollback deleted the wrong key.** The upload used `<key>.<ext>`, but the rollback after a failed save deleted `<key>`. The uploaded object was never removed, and the unit test asserted the wrong key.
- **Objects were orphaned.** Replacing a picture, or deleting it with `DELETE /users/picture`, cleared the database reference but left the object in the bucket.
- **Keys were guessable.** They were built from local time with one-second precision (`UniqueId`).
- **S3 never ran in CI.** The S3 adapter only ran against real AWS with real credentials, so none of the above could be caught there.

## Decision
- **Store the key.** `users.picture_key` (migration `StorePictureKey`, which recovers the key from existing URLs) holds the object key. The URL is resolved when it is handed out, by a new `GetFileUrl` port. Deleting the previous object needs the key, and how files are served can then change without a data migration.
- **No ACLs, private bucket.** `getUrl` returns `S3_PUBLIC_BASE_URL/<key>` when a CDN is configured: CloudFront with Origin Access Control in front of the private bucket. Otherwise it returns a pre-signed `GetObject` URL valid for one hour.
- **Random keys.** Keys are `<userId>_<crypto.randomUUID()>.<ext>`.
- **No orphans.**
  - A failed save deletes exactly the key that was uploaded.
  - After a successful replace or remove, the previous object is deleted. This is best-effort: the profile change is already saved, so a storage error is swallowed rather than failing the request. The worst case is the orphan that previously always happened.
  - Picture changes are not wrapped in a DB transaction. The change is a single `UPDATE`, and deleting the previous object inside a transaction that could still roll back would leave the profile pointing at a deleted object.
- **S3-compatible endpoint via env.** `S3_ENDPOINT` and `S3_FORCE_PATH_STYLE` are configurable, and docker-compose and CI run **Adobe S3Mock** (`adobe/s3mock`, Apache-2.0).
  - CI runs the adapter's integration test against it (upload, download through the signed URL, delete, then 404).
  - The Postman collection (`npm run test:api`) uploads, replaces and deletes a real picture through the running container, and verifies the previous object is gone.

## Why S3Mock rather than LocalStack
Current LocalStack images refuse to start without a `LOCALSTACK_AUTH_TOKEN` (an account at localstack.cloud). That defeats the point of a stack anyone can clone and run. S3Mock needs no account, starts in about 3 seconds, and covers the S3 API this project uses.

## Consequences
- **Works on default S3 buckets.** Pictures are no longer world-readable by bucket policy, and no object is left behind on any of the three paths.
- **Pre-signed URLs expire.** Without a CDN, the `pictureUrl` returned on upload is valid for one hour. A client that displays the picture later needs a fresh URL. There is no profile-read endpoint yet; production should set `S3_PUBLIC_BASE_URL`.
- **S3Mock does not enforce `BucketOwnerEnforced`.** It accepts an ACL, so it would not have caught the ACL failure itself. That is pinned by the adapter's unit test, which asserts no ACL is sent. The orphan bugs, on the other hand, fail the new contract checks against S3Mock. The rollback key is checked by the use-case unit test, which now compares the deleted key with the uploaded one.
