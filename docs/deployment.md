# Deployment (AWS)

Pushes to `main` deploy the API to AWS through the `deploy` job in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml), after `quality`, `verify` and `infra` pass. It authenticates with GitHub OIDC, so no AWS access keys are stored in GitHub. Until it is configured, the job skips the AWS steps and stays green.

## Architecture

```
client ──HTTPS──▶ CloudFront ──HTTP──▶ ALB ──▶ ECS Fargate (Dockerfile) ──▶ RDS PostgreSQL 15
                                                     │                 └──▶ S3 (private picture bucket)
                                                     └──▶ Facebook Graph API
```

- **HTTPS without a domain:** CloudFront's default certificate fronts the ALB, so tokens never travel over plain HTTP. Nothing is cached. The ALB only admits CloudFront's origin-facing IP ranges ([`infra/cdn.tf`](../infra/cdn.tf), [`infra/network.tf`](../infra/network.tf)).
- **API** ([`infra/app.tf`](../infra/app.tf)): one Fargate task (0.25 vCPU, 512 MiB). It runs pending migrations, then starts — the `migrate` service pattern from `docker-compose.yml`. One task only: the rate limiter is in-process ([ADR-0008](adr/0008-in-memory-rate-limiting.md)). `TRUST_PROXY_HOPS=2` (CloudFront, then the ALB).
- **Database** ([`infra/database.tf`](../infra/database.tf)): RDS PostgreSQL 15 `db.t4g.micro`, not publicly accessible, reachable only from the task. RDS generates the master password and keeps it in Secrets Manager.
- **Secrets:** `JWT_SECRET` and `OPS_TOKEN` are generated; they, the Facebook credentials and the database password reach the container as ECS secrets (SSM SecureString / Secrets Manager), never as plain environment variables.
- **Pictures** ([`infra/storage.tf`](../infra/storage.tf)): private bucket, no ACLs ([ADR-0015](adr/0015-private-picture-storage-and-s3mock.md)). The task role grants `PutObject`/`GetObject`/`DeleteObject`, so **no S3 keys** are configured: `S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY` are optional in production and the SDK uses the task role. `S3_PUBLIC_BASE_URL` is unset, so picture URLs are pre-signed (1 hour).
- **Swagger UI** is on at `/api-docs` (`api_docs_enabled`), to try the API from a browser.

**Cost:** roughly US$50/month while it runs (RDS, the ALB, the Fargate task, three public IPv4 addresses); `db.t4g.micro` is free-tier eligible on new accounts. Use the Destroy workflow between tests.

## One-time setup

With admin credentials for the target AWS account and `gh` logged in:

```bash
scripts/bootstrap.sh
```

It applies [`bootstrap/`](../bootstrap) (remote-state bucket + the `authkit-github-deploy` IAM role, which only the `production` environment of this repo can assume), then creates the `production` GitHub environment with `AWS_DEPLOY_ROLE_ARN`, `TF_STATE_BUCKET` and `AWS_REGION`. Extra arguments go to `terraform apply`: `-var="aws_region=…"` (default `eu-west-2`), `-var="create_oidc_provider=true"` on an account without the GitHub OIDC provider.

### Facebook login (optional)

The API starts without real Facebook credentials (placeholders); only `POST /api/login/facebook` needs them. To enable it, create an app at [developers.facebook.com](https://developers.facebook.com/) (any Facebook account can), and add its **App ID** and **App Secret** from *App Settings → Basic* as **secrets** of the `production` environment:

```bash
gh secret set FB_CLIENT_ID --env production
gh secret set FB_CLIENT_SECRET --env production
```

The next deploy picks them up. To log in, get a user access token for your app (with the `email` permission) from the Graph API Explorer and `POST` it to `/api/login/facebook`.

## What a deploy does

1. Creates the ECR repository (a no-op after the first run), builds the `Dockerfile` and pushes it tagged with the commit SHA.
2. `terraform plan` + `apply` of [`infra/`](../infra) with S3 remote state (no backend block is committed; the job writes `infra/ci_backend.tf`), then waits for the ECS service to be stable (migrations included).
3. Seeds the fixture user (`npm run db:seed`) as a one-off ECS task inside the VPC, since the database is not reachable from the runner.
4. Smoke tests against the live API: health (public, and detailed with the generated `OPS_TOKEN`), `401` without a token, a fake Facebook token rejected, and the picture flow for the seeded user with a JWT signed by the deployed `JWT_SECRET` — upload to the real bucket, read it back through the pre-signed URL, remove it. The API and Swagger URLs are printed in the job summary.

The first deploy takes ~15 minutes (RDS and CloudFront).

## Tear down / recreate

**Actions → Destroy → Run workflow** on `main`, type `destroy`. It deletes every resource in `infra/`, the database and pictures included (no final snapshot); the `bootstrap/` resources are kept, so **Actions → CI → Run workflow** on `main` recreates it. A recreated stack has a new database and new generated secrets.

The deploy role's permissions ([`bootstrap/deploy_permissions.tf`](../bootstrap/deploy_permissions.tf)) are scoped by the `authkit` name prefix wherever AWS allows it, and to the deployment region for EC2, ELB, ECS and RDS; it can only attach the ECS task-execution managed policy to roles it creates and can't modify itself.
