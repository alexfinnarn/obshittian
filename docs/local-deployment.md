# Local Deployment with Kamal

This is a maintainer-focused guide for manual VPS deploys when the normal GitHub Actions path is not enough.

For local development and vault setup, use the [developer guide](developer-guide.md).

## Current Deployment Shape

`config/deploy.yml` defines the deployed service:

- host: `notes.finnarn.com`
- server: `5.161.43.16`
- image: `ghcr.io/alexfinnarn/editor`
- app port: `3000`
- vault volume mounted at `/app/vault`
- deployed `VAULT_PATH`: `/app/vault`

The deployment uses HTTP Basic Auth when `AUTH_USERNAME` and `AUTH_PASSWORD` are configured.

## Prerequisites

1. Ruby 3.0+
2. Docker running locally
3. SSH access to `root@5.161.43.16`
4. A GitHub token that can push to GHCR

Install Kamal:

```bash
gem install kamal
```

Create a GitHub Personal Access Token with `write:packages` scope for GHCR.

## Deploy

Kamal tags images from the current git commit SHA. Commit the exact repo state you want to deploy before running deployment commands.

Set the required environment variables:

```bash
export KAMAL_REGISTRY_USERNAME=your_github_username
export KAMAL_REGISTRY_PASSWORD=your_github_pat
export AUTH_USERNAME=your_username
export AUTH_PASSWORD=your_password
```

Run the deploy:

```bash
kamal deploy
```

One-line variant:

```bash
KAMAL_REGISTRY_USERNAME=your_github_username KAMAL_REGISTRY_PASSWORD=your_pat AUTH_USERNAME=user AUTH_PASSWORD=pass kamal deploy
```

## First-Time Server Setup

If Docker and kamal-proxy are not installed on the VPS yet:

```bash
KAMAL_REGISTRY_USERNAME=your_github_username KAMAL_REGISTRY_PASSWORD=your_pat AUTH_USERNAME=user AUTH_PASSWORD=pass kamal setup
```

Then run `kamal deploy`.

## Health Checks and Auth

- `/up` is the health endpoint used by `kamal-proxy`
- `src/hooks.server.ts` bypasses Basic Auth for `/up`
- local development skips auth entirely when `AUTH_USERNAME` and `AUTH_PASSWORD` are unset

If health checks fail after deploy, inspect `/up` behavior and proxy logs first.

## Useful Commands

```bash
kamal deploy
kamal redeploy
kamal app logs
kamal app exec -i sh
kamal app details
kamal proxy logs
kamal rollback
kamal build push
```

## Quick Troubleshooting

SSH access:

```bash
ssh root@5.161.43.16
```

Container status:

```bash
kamal app details
```

Proxy and app logs:

```bash
kamal proxy logs
kamal app logs
```
