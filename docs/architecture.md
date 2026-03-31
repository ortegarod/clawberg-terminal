# Architecture

FinPal is a four-layer stack. Each layer does one thing.

## System Diagram

```
┌─────────────────────────────────────────────┐
│              AI Agent (OpenClaw)            │
│                                             │
│  Stage 1: Market Intelligence               │
│    ./market-intel.sh BTC                    │
│    PRISM API (fear & greed, funding rates)  │
│                                             │
│  Stage 2–4: Reflect + Decide                │
│    kraken paper/live order ...              │
│                                             │
│  Logging                                    │
│    POST /actions  →  FinPal API           │
│    POST /trades   →  FinPal API           │
│    POST /portfolio→  FinPal API           │
└───────────────────┬─────────────────────────┘
                    │ HTTP
         ┌──────────▼──────────┐
         │   FinPal API      │  Port 4000 (Express)
         │   /trades           │
         │   /actions          │
         │   /portfolio        │
         │   /events (SSE)     │
         └──────────┬──────────┘
                    │ pg
         ┌──────────▼──────────┐
         │     PostgreSQL      │
         │   trades            │
         │   agent_actions     │
         │   portfolio_snapshots│
         └──────────┬──────────┘
                    │ SSE (real-time)
         ┌──────────▼──────────┐
         │  Dashboard (Next.js)│  Port 3000
         │  Portfolio view     │
         │  Trade history      │
         │  Agent activity log │
         └─────────────────────┘
```

## Components

### `vwap.sh` + `market-intel.sh`

Shell scripts that pull live OHLC data from Kraken's public API, compute VWAP + σ band positioning, and query Fear & Greed and cross-venue funding rates. No database, no dependencies beyond `curl` and `jq`.

- `./vwap.sh BTCUSD 60 24` — 24h VWAP, 1h candles, σ position
- `./market-intel.sh BTC` — VWAP + Fear & Greed + perp/spot funding spread

### Kraken CLI

Trade execution and paper trading. The agent uses this directly for order placement, paper account management, and live market data.

- **Source:** [github.com/krakenfx/kraken-cli](https://github.com/krakenfx/kraken-cli)
- **No API key needed** for market data and paper trading
- **API key required** for live order placement

### PRISM API

Asset resolution and market-wide signals. Resolves natural language asset names to canonical tickers and provides cross-exchange context.

- **Base URL:** `https://strykr-prism.up.railway.app`
- **Used for:** Fear & Greed index, asset name resolution, cross-venue prices

### FinPal API (Express + PostgreSQL)

The logging and state layer. The agent writes here; the dashboard reads from here.

- **Port:** 4000
- **Three write endpoints:** `/trades`, `/actions`, `/portfolio`
- **Real-time:** SSE stream at `/events` — dashboard subscribes and gets live pushes
- **Database:** PostgreSQL with three tables (see [schema](#database-schema) below)

### Dashboard (Next.js)

Read-only view of the agent's activity. Displays portfolio positions, trade history, and agent action log. Connects to the SSE stream for live updates without polling.

- **Port:** 3000
- **Live updates:** EventSource → `/events`
- **No writes** — display only

## Database Schema

```sql
-- Every trade the agent executes
CREATE TABLE trades (
  id             SERIAL PRIMARY KEY,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  pair           VARCHAR(50)  NOT NULL,
  side           VARCHAR(10)  NOT NULL,   -- buy | sell
  size           NUMERIC      NOT NULL,
  price          NUMERIC      NOT NULL,
  total_usd      NUMERIC      NOT NULL,
  strategy       VARCHAR(100),            -- e.g. "VWAP entry", "DCA"
  sigma_at_entry NUMERIC,                 -- σ position at time of trade
  tx_hash        VARCHAR(100),            -- on-chain proof (nullable)
  order_id       VARCHAR(100),            -- Kraken order ID (nullable)
  status         VARCHAR(20)  DEFAULT 'filled'
);

-- Agent reasoning steps, decisions, alerts
CREATE TABLE agent_actions (
  id          SERIAL PRIMARY KEY,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  action_type VARCHAR(50) NOT NULL,       -- analyze|trade|rebalance|alert|chat
  summary     TEXT        NOT NULL,       -- human-readable description
  data        JSONB                       -- raw signal data (σ, F&G, etc.)
);

-- Portfolio state after each trade or rebalance
CREATE TABLE portfolio_snapshots (
  id         SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  total_usd  NUMERIC NOT NULL,
  cash_usd   NUMERIC NOT NULL,
  positions  JSONB   NOT NULL,            -- [{pair, size, value_usd, entry_price, pnl_pct}]
  pnl_usd    NUMERIC,
  pnl_pct    NUMERIC
);
```

## Tech Stack

| Layer | Technology |
|---|---|
| Agent Runtime | [OpenClaw](https://openclaw.ai) |
| Execution | [Kraken CLI](https://github.com/krakenfx/kraken-cli) |
| Market Data | [Strykr PRISM API](https://prism.strykr.ai) |
| Agent Identity | [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) on Base |
| API | Express + PostgreSQL |
| Dashboard | Next.js + Tailwind |
| Real-time | Server-Sent Events (SSE) |
| Docs | VitePress |

## On-Chain Reputation (ERC-8004)

Every trade logged via `POST /trades` contributes to the agent's on-chain reputation score on Base. Five metrics are tracked:

| Metric | ERC-8004 Tag | Description |
|---|---|---|
| Sharpe Ratio | `sharpeRatio` | Risk-adjusted return |
| Max Drawdown | `maxDrawdown` | Worst peak-to-trough loss |
| Win Rate | `winRate` | % of profitable trades |
| Excess Return | `excessReturn` | Return above benchmark |
| Annualized Return | `annualizedReturn` | Yearly return normalized |

This is your agent's permanent, verifiable trading record. The dashboard displays current values; the chain stores history.
