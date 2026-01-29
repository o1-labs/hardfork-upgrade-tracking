# Demo Environment

This directory contains Docker Compose configuration for running the hardfork-upgrade-tracking application locally with all dependencies.

## Prerequisites

- Podman and podman-compose (recommended), or
- Docker and Docker Compose

## Quick Start

### Base Environment (tracker + postgres)

```bash
# Start services (builds tracker locally)
podman-compose up -d

# View dashboard
open http://localhost:3000

# Check logs
podman-compose logs -f hardfork-tracker

# Stop services
podman-compose down
```

### Using a Pre-built Image

Skip local build and use a published image from GitHub Container Registry:

```bash
TRACKER_IMAGE=ghcr.io/o1-labs/hardfork-upgrade-tracking:latest podman-compose up -d --no-build
```

### With Mina Node

Start the environment with a Mina daemon that will submit stats to the tracker.

The daemon is configured with `--simplified-node-stats false` to send the complete status report required by the tracker.

```bash
# Using default devnet image (amd64)
podman-compose --profile with-mina up -d

# For Apple Silicon / ARM64
MINA_PLATFORM=linux/arm64 \
MINA_IMAGE=europe-west3-docker.pkg.dev/o1labs-192920/euro-docker-repo/mina-daemon:3.3.0-beta1-compatible-532a749-bookworm-devnet-arm64 \
podman-compose --profile with-mina up -d

# Using a custom Mina image
MINA_IMAGE=your-registry/mina-daemon:tag podman-compose --profile with-mina up -d

# Using a different peer list
MINA_PEER_LIST_URL=https://example.com/peers.txt podman-compose --profile with-mina up -d
```

## Configuration

Copy `.env.example` to `.env` to customize settings:

```bash
cp .env.example .env
```

Available environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `TRACKER_IMAGE` | `hardfork-tracker:local` | Tracker image (use pre-built: `ghcr.io/o1-labs/hardfork-upgrade-tracking:latest`) |
| `DATABASE_URL` | local postgres | PostgreSQL connection string |
| `RELEASE_PERCENTAGE` | `65` | Target percentage for upgrade completion |
| `MINA_IMAGE` | devnet 3.3.0-beta1 amd64 | Docker image for Mina daemon |
| `MINA_PLATFORM` | `linux/amd64` | Container platform (use `linux/arm64` for Apple Silicon) |
| `MINA_PEER_LIST_URL` | devnet bootnodes | URL for Mina peer list |

## Services

| Service | Port | Description |
|---------|------|-------------|
| `postgres` | 5432 | PostgreSQL database |
| `hardfork-tracker` | 3000 | Tracking dashboard and API |
| `mina-daemon` | - | Mina node (only with `--profile with-mina`) |

## Testing

```bash
# Verify tracker is running
curl http://localhost:3000/

# Submit test stats
curl -X POST http://localhost:3000/submit/stats \
  -H "Content-Type: application/json" \
  -d '{
    "max_observed_block_height": 100,
    "commit_hash": "test123",
    "chain_id": "devnet",
    "peer_id": "test-peer-id",
    "peer_count": 5,
    "timestamp": "2026-01-28T10:00:00.000Z"
  }'
```

## Cleanup

```bash
# Stop and remove containers
podman-compose down

# Also remove volumes (database data)
podman-compose down -v
```
