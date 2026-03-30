# FinAgent

Trustless AI financial advisor agent. Talk to your agent in plain language — it analyzes markets, executes trades across crypto, tokenized stocks, and forex via Kraken, and logs every action on-chain with verifiable proof.

Built for the [AI Trading Agents Hackathon](https://lablab.ai) — lablab.ai × Kraken × Surge, March 30 – April 12, 2026.

---

## What It Does

- **Analyze** — VWAP + σ band analysis, Fear & Greed, cross-venue funding rates
- **Execute** — Kraken CLI across crypto, xStocks (tokenized US equities), forex, futures
- **Verify** — ERC-8004 agent identity, EIP-712 signed trade intents, on-chain reputation
- **Display** — React dashboard showing live portfolio, trade history, agent activity

---

## Repo Structure

```
/
├── index.html          Landing page
├── vwap.sh             VWAP + σ analysis from live Kraken OHLC
├── market-intel.sh     VWAP + Fear&Greed + cross-venue funding rates
├── SKILL.md            How your AI agent uses this app
│
├── api/                Express backend (Postgres, SSE)
├── dashboard/          Next.js frontend
└── docs/
    └── API.md          Full API reference
```

---

## Quick Start

```bash
# Install Kraken CLI
curl --proto '=https' --tlsv1.2 -LsSf \
  https://github.com/krakenfx/kraken-cli/releases/latest/download/kraken-cli-installer.sh | sh

# Analyze market
chmod +x vwap.sh market-intel.sh
./vwap.sh BTCUSD 60 24
./market-intel.sh BTC

# Paper trade (no API keys needed)
kraken paper init --balance 15000
kraken paper buy BTCUSD 0.1
```

---

## Running the Full Stack

See [docs/API.md](docs/API.md) for API reference and setup instructions.

Requirements: Node.js 18+, PostgreSQL

```bash
# API (port 4000)
cd api && cp .env.example .env && npm install && npm run migrate && npm start

# Dashboard (port 3000)
cd dashboard && cp .env.example .env && npm install && npm run dev
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Execution | [Kraken CLI](https://github.com/krakenfx/kraken-cli) |
| Market Data | [Strykr PRISM API](https://prism.strykr.ai) |
| Agent Identity | ERC-8004 on Base |
| Trade Signing | EIP-712 + EIP-155 |
| Runtime | [OpenClaw](https://openclaw.ai) |

---

## Team

- **Kyro** — AI agent (OpenClaw runtime)
- **Rodrigo** — Human co-founder

---

## Resources

- [ERC-8004: Trustless Agents](https://eips.ethereum.org/EIPS/eip-8004) — Agent identity, reputation, and validation standard
- [Kraken CLI Announcement](https://blog.kraken.com/news/industry-news/announcing-the-kraken-cli) — *"Terminal-native agent environments like OpenClaw"*
- [Kraken CLI on GitHub](https://github.com/krakenfx/kraken-cli) — Source, docs, agent skill files
- [Strykr PRISM API](https://prism.strykr.ai) — Canonical data layer for financial agents
- [OpenClaw](https://openclaw.ai) — Agent runtime
