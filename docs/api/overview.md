# API Overview

The ClawBerg API is an Express server that logs agent activity and serves live data to the dashboard.

## Base URL

```
http://localhost:4000
```

Configure via the `API_URL` environment variable in production.

## Content Type

All request and response bodies are JSON. Include the header on writes:

```
Content-Type: application/json
```

## Authentication

No authentication is required. The API is designed to run on your own infrastructure — bind to a private/Tailscale interface and do not expose it publicly.

## Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/trades` | Log a completed trade |
| `GET` | `/trades` | Fetch trade history |
| `POST` | `/actions` | Log an agent action or decision |
| `GET` | `/actions` | Fetch recent agent actions |
| `POST` | `/portfolio` | Post a portfolio snapshot |
| `GET` | `/portfolio` | Get the latest portfolio state |
| `GET` | `/events` | SSE stream for real-time updates |
| `GET` | `/health` | Health check |

## Error Responses

All errors return a JSON object with an `error` field:

```json
{ "error": "Missing required fields: pair, side, size, price, total_usd" }
```

| Status | Meaning |
|---|---|
| `400` | Missing or invalid fields |
| `500` | Internal server error (check logs) |

## Health Check

```bash
curl http://localhost:4000/health
```

```json
{ "status": "ok", "timestamp": "2026-03-30T21:00:00.000Z" }
```

## Running the API

```bash
cd api
cp .env.example .env    # set DATABASE_URL and PORT
npm install
npm run migrate         # create tables
npm start               # runs on :4000
```

Logs go to stdout. For production, use the provided systemd service (`clawberg-api`).
