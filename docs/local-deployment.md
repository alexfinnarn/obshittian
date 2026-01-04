# Local Deployment with Kamal

Deploy to the VPS from your local machine when CI/CD isn't working or for testing.

## Prerequisites

1. **Ruby** (3.0+)
2. **Docker** running locally
3. **SSH access** to the VPS (`ssh root@5.161.43.16` should work)

## Setup

Install Kamal:

```bash
gem install kamal
```

Create a GitHub Personal Access Token (PAT) for GHCR:

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with `write:packages` scope
3. Copy the token

## Deploy

**Important:** Kamal uses the git commit SHA as the image version tag. You must commit any changes before deploying, otherwise Kamal will reuse the old image:

```bash
git add -A && git commit -m "Your changes"
```

You do NOT need to push to GitHub - Kamal builds from your local files and pushes the Docker image directly to GHCR.

Set the required environment variables and deploy:

```bash
export KAMAL_REGISTRY_USERNAME=your_github_username
export KAMAL_REGISTRY_PASSWORD=your_github_pat
export BASIC_AUTH="username:password"
kamal deploy
```

Or in one line:

```bash
KAMAL_REGISTRY_USERNAME=your_github_username KAMAL_REGISTRY_PASSWORD=your_pat BASIC_AUTH="user:pass" kamal deploy
```

The `BASIC_AUTH` variable configures HTTP Basic Authentication at the proxy level. Format is `username:password`.

### First-Time Deployment

If Docker isn't installed on the VPS yet, run setup first:

```bash
KAMAL_REGISTRY_USERNAME=your_github_username KAMAL_REGISTRY_PASSWORD=your_pat BASIC_AUTH="user:pass" kamal setup
```

This installs Docker and kamal-proxy on the server. Then run `kamal deploy`.

## Other Useful Commands

```bash
kamal deploy          # Full deploy (build, push, deploy)
kamal redeploy        # Deploy without building (uses existing image)
kamal app logs        # View application logs
kamal app exec -i sh  # SSH into the running container
kamal rollback        # Rollback to previous version
```

## Troubleshooting

**Docker build fails:**
```bash
kamal build push      # Just build and push the image
```

**SSH issues:**
```bash
ssh root@5.161.43.16  # Test SSH connection
```

**Check what's running:**
```bash
kamal app details     # Show container status
kamal proxy logs      # View proxy logs
```
