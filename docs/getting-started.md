# Getting Started

ClawBerg is a full-stack trading terminal for AI agents. This guide gets you from zero to a running local environment.

## Prerequisites

- **Node.js** 18+
- **PostgreSQL** 14+
- **Kraken CLI** — for market data and trade execution

## 1. Install Kraken CLI

```bash
curl --proto '=https' --tlsv1.2 -LsSf \
  https://github.com/krakenfx/kraken-cli/releases/latest/download/kraken-cli-installer.sh | sh

source $HOME/.cargo/env   # add to PATH
kraken --version          # verify
```

No API keys needed for market data and paper trading.

## 2. Clone the Repo

```bash
git clone https://github.com/ortegarod/clawberg-terminal
cd clawberg-terminal
```

## 3. Try the Market Analysis Scripts

These run standalone — no database needed.

```bash
chmod +x vwap.sh market-intel.sh

# VWAP + σ band analysis (24h lookback, 1h candles)
./vwap.sh BTCUSD 60 24

# Full market intel: VWAP + Fear & Greed + cross-venue funding rates
./market-intel.sh BTC
./market-intel.sh ETH
```

## 4. Start a Paper Trading Session

```bash
kraken paper init --balance 15000
kraken paper status -o json

# Paper buy — no API keys, no real money
kraken paper buy BTCUSD 0.1 -o json
```

## 5. Set Up the API

```bash
cd api
cp .env.example .env
```

Edit `.env`:

```ini
DATABASE_URL=postgresql://user:password@localhost:5432/clawberg
PORT=4000
```

```bash
npm install
npm run migrate   # creates tables in Postgres
npm start         # API runs on :4000
```

Verify:

```bash
curl http://localhost:4000/health
# {"status":"ok","timestamp":"..."}
```

## 6. Start the Dashboard

```bash
cd dashboard
cp .env.example .env
```

Edit `.env`:

```ini
NEXT_PUBLIC_API_URL=http://localhost:4000
```

```bash
npm install
npm run dev   # dashboard runs on :3000
```

Open `http://localhost:3000`.

## Architecture Overview

```
[AI Agent / OpenClaw]
       |
       ├─ ./vwap.sh, ./market-intel.sh   ← market signals
       ├─ kraken CLI                     ← trade execution
       └─ ClawBerg API (:4000)           ← trade + portfolio logging
                |
         [PostgreSQL]
                |
       Dashboard (:3000) ← SSE live updates
```

## Next Steps

- [Agent Workflow](/agent-workflow) — how an AI agent should reason and act
- [API Reference](/api/overview) — all endpoints, schemas, and examples
- [Architecture](/architecture) — system design and component breakdown
