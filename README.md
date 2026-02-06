# Hardfork Upgrade Tracking

This project provides a simple server to track the upgrade status of nodes in a network. It exposes a web-based dashboard to visualize the upgrade progress and an API for nodes to submit their status.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Setup](#1-setup)
- [Running the Project](#2-running-the-project)
  - [Development Mode](#development-mode)
  - [Production (Node.js)](#production-nodejs)
  - [Production (Docker)](#production-docker)
- [Viewing the UI](#3-viewing-the-ui)
- [API Reference](#4-api-reference)
  - [Dashboard](#dashboard)
  - [Node Stats](#node-stats)
  - [Block Producers](#block-producers)
  - [Valid Commits](#valid-commits)
- [Authentication](#5-authentication)
- [Testing](#6-testing)

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer)
- [npm](https://npmjs.com/)
- A [PostgreSQL](https://postgresql.org/) database. You can easily set one up for free on [Neon](https://neon.tech/).

## 1. Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/o1-labs/hardfork-upgrade-tracking
    cd hardfork-upgrade-tracking
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**

    Create a `.env` file by copying the example file:
    ```bash
    cp .env.example .env
    ```

    Edit the `.env` file and set the `DATABASE_URL` to your PostgreSQL connection string. For example:
    ```
    DATABASE_URL="postgresql://user:password@localhost:5432/hardfork_tracking?schema=public"
    ```
    You can also optionally change the `RELEASE_PERCENTAGE`.

4.  **Apply the database schema:**

    Run the following command to create the tables in your database:
    ```bash
    npx prisma db push
    ```

    Alternatively, you can use migrations:
    ```bash
    npx prisma migrate dev
    ```

## 2. Running the Project

### Development Mode

You can run the server in development mode, which will automatically restart on file changes:

```bash
npm run dev
```

The server will start on `http://localhost:3000`.

### Production (Node.js)

Build the project first and then start the server:

```bash
npm run build
npm run start
```

### Production (Docker)

Docker images are published to GitHub Container Registry at `ghcr.io/o1-labs/hardfork-upgrade-tracking`.

**Pull and run a pre-built image:**

```bash
docker run --rm -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:password@host:5432/db" \
  -e RELEASE_PERCENTAGE="65" \
  ghcr.io/o1-labs/hardfork-upgrade-tracking:latest
```

**Build locally using the Makefile:**

```bash
# Using Docker
make build

# Using Podman
make podman-build
```

**Run the locally built image:**

```bash
# Using Docker
DATABASE_URL="postgresql://user:password@host:5432/db" RELEASE_PERCENTAGE=65 make run

# Using Podman
DATABASE_URL="postgresql://user:password@host:5432/db" RELEASE_PERCENTAGE=65 make podman-run
```

The container automatically runs `prisma db push` on startup to apply the database schema.

**Demo environment with podman-compose:**

A complete demo environment with PostgreSQL and optional Mina node is available in the `demo/` directory:

```bash
cd demo

# Start tracker with postgres
podman-compose up -d

# Or include a Mina daemon that submits stats
podman-compose --profile with-mina up -d
```

See [demo/README.md](demo/README.md) for full instructions.

## 3. Viewing the UI

Once the server is running, you can view the dashboard by opening your web browser and navigating to:

[http://localhost:3000/](http://localhost:3000/)

The dashboard displays the current upgrade progress of the network, including:
- Percentage of active stake that has upgraded
- Total number of upgraded vs non-upgraded nodes
- Block producer upgrade status with stake percentages
- Export functionality to download data as CSV

## 4. API Reference

### Dashboard

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/` | No | HTML dashboard |

### Node Stats

Nodes submit their status to track upgrade progress across the network.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/submit/stats` | No | Submit node stats |
| `GET` | `/submit/stats` | No | Get all node stats |
| `GET` | `/submit/stats/:peerId` | No | Get stats for a specific peer |

#### Submit Node Stats

**Request Body:**

```json
{
  "max_observed_block_height": 8392,
  "commit_hash": "a1b2c3d4",
  "chain_id": "mainnet",
  "peer_id": "12D3KooWL7tVWT3LpBDv3p5bLNKm2w5V51s1A4Q4Zg4Q4Yq4b4Q4",
  "peer_count": 10,
  "timestamp": "2026-01-26T10:00:00.000Z",
  "block_producer_public_key": "B62q..."
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/submit/stats \
  -H "Content-Type: application/json" \
  -d '{
    "max_observed_block_height": 8392,
    "commit_hash": "a1b2c3d4",
    "chain_id": "mainnet",
    "peer_id": "12D3KooWL7tVWT3LpBDv3p5bLNKm2w5V51s1A4Q4Zg4Q4Yq4b4Q4",
    "peer_count": 10,
    "timestamp": "2026-01-26T10:00:00.000Z",
    "block_producer_public_key": "B62qrPN5Y5yq8kGE3FbVKbGTdTAJNdtNtS5sKqLYxhYGDzuDv2VRvgH"
  }'
```

#### Get All Stats

```bash
curl http://localhost:3000/submit/stats
```

#### Get Stats by Peer ID

```bash
curl http://localhost:3000/submit/stats/12D3KooWL7tVWT3LpBDv3p5bLNKm2w5V51s1A4Q4Zg4Q4Yq4b4Q4
```

### Block Producers

Block producer stake data is used to calculate the percentage of active stake that has upgraded.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/block-producers` | No | List all block producers |
| `GET` | `/block-producers/last-sync` | No | Get last CSV sync timestamp |
| `GET` | `/block-producers/:publicKey` | No | Get a specific block producer |
| `POST` | `/block-producers/upload` | Yes | Upload CSV data |

#### List All Block Producers

```bash
curl http://localhost:3000/block-producers
```

#### Get Last Sync Time

```bash
curl http://localhost:3000/block-producers/last-sync
```

#### Get Block Producer by Public Key

```bash
curl http://localhost:3000/block-producers/B62qrQKS9ghd91shs73TCmBJRW9GzvTJK443DPx2YbqcyoLc56g1ny9
```

#### Upload CSV

The CSV must have the following columns:
- `bp_public_key` - Block producer public key (B62...)
- `total_stake` - Total stake amount
- `num_delegators` - Number of delegators
- `is_active` - Whether BP is active (true/false)
- `percent_total_stake` - Percentage of total stake
- `percent_total_active_stake` - Percentage of active stake

```bash
curl -X POST http://localhost:3000/block-producers/upload \
  -H "Authorization: Bearer $CSV_UPLOAD_TOKEN" \
  -H "Content-Type: text/csv" \
  --data-binary @block_producers.csv
```

### Valid Commits

A node is considered "upgraded" if its `commit_hash` matches one of the valid commits in the database.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/valid-commits` | No | List all valid commits |
| `POST` | `/valid-commits` | Yes | Add commit(s) |
| `DELETE` | `/valid-commits/:hash` | Yes | Remove a commit |

#### List Valid Commits

```bash
curl http://localhost:3000/valid-commits
```

#### Add a Single Commit

```bash
curl -X POST http://localhost:3000/valid-commits \
  -H "Authorization: Bearer $CSV_UPLOAD_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"hash": "f1e40a7ef71c799b5af8821ff85aadb44f53a377", "label": "3.3.0-compatible"}'
```

#### Add Multiple Commits

```bash
curl -X POST http://localhost:3000/valid-commits \
  -H "Authorization: Bearer $CSV_UPLOAD_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"commits": [{"hash": "abc123", "label": "v1.0"}, {"hash": "def456"}]}'
```

#### Delete a Commit

```bash
curl -X DELETE http://localhost:3000/valid-commits/abc123 \
  -H "Authorization: Bearer $CSV_UPLOAD_TOKEN"
```

## 5. Authentication

Protected endpoints require a bearer token. Set the `CSV_UPLOAD_TOKEN` environment variable:

```bash
# In .env
CSV_UPLOAD_TOKEN="your-secret-token"
```

In production, this token should be stored in a secrets manager (e.g., GCP Secret Manager) and injected as an environment variable.

## 6. Testing

Run the test suite:

```bash
npm test
```

Tests cover:
- CSV parsing for block producer data
- Stake calculation logic with deduplication
- Upgrade check (commit hash validation)
- Template helper functions

Tests are automatically run in CI on every pull request and must pass before merging.
