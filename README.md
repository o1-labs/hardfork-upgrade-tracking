# Hardfork Upgrade Tracking

This project provides a simple server to track the upgrade status of nodes in a network. It exposes a web-based dashboard to visualize the upgrade progress and an API for nodes to submit their status.

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

You can run the server in development mode, which will automatically restart on file changes:

```bash
npm run dev
```

The server will start on `http://localhost:3000`.

For production, build the project first and then start the server:

```bash
npm run build
npm run start
```

## 3. Viewing the UI

Once the server is running, you can view the dashboard by opening your web browser and navigating to:

[http://localhost:3000/](http://localhost:3000/)

The dashboard displays the current upgrade progress of the network.

## 4. Submitting Data

Nodes can submit their status by sending a `POST` request to the `/submit/stats` endpoint.

### Endpoint

`POST /submit/stats`

### Request Body

The request body must be a JSON object with the following structure:

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
### Example `curl` command

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

### Other API Endpoints
- `GET /submit/stats`: gets all stats
- `GET /submit/stats/:peerId`: gets stats for a specific peer
