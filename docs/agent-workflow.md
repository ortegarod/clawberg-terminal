# Agent Workflow

This page describes how an AI agent — running on OpenClaw or any compatible runtime — should use ClawBerg. The reasoning pipeline is adapted from [TradeMaster](https://github.com/TradeMaster-NTU/TradeMaster) (NTU, Apache 2.0), an open-source RL platform for quantitative trading. We borrowed their LLM reasoning architecture; we did not use their RL runtime.

## Overview

The agent does three things on every cycle:

1. **Gather intelligence** — market data, σ position, sentiment
2. **Reason** — reflect on past decisions, form a recommendation
3. **Act and log** — execute, then record everything via the ClawBerg API

## Reasoning Pipeline

Follow these four stages in order. Do not skip or merge stages.

### Stage 1 — Market Intelligence

Pull live signals and summarize them in plain English.

```bash
# VWAP + σ band (required)
./vwap.sh BTCUSD 60 24

# Full intel: VWAP + Fear & Greed + funding rates (preferred)
./market-intel.sh BTC

# Raw price/ticker
kraken ticker BTCUSD -o json
```

Produce a one-sentence summary before continuing:

> *"BTC is 1.2σ above VWAP with neutral sentiment (F&G: 52) and slightly positive funding — moderately extended."*

Then log it:

```bash
curl -X POST $API/actions -H "Content-Type: application/json" \
  -d '{
    "action_type": "analyze",
    "summary": "BTC 1.2σ above VWAP, F&G 52 neutral, funding +0.01%. Extended.",
    "data": {"pair": "BTCUSD", "sigma": 1.2, "fear_greed": 52, "funding_rate": 0.0001}
  }'
```

### Stage 2 — Low-Level Reflection (Price Movement)

State price movement explicitly across three timeframes before making any decision:

```
Short-term  (1d):  "an increase of 2.3%"
Medium-term (7d):  "a decrease of 4.1%"
Long-term  (14d):  "an increase of 11.2%"
```

This forces you to acknowledge trend direction. It's easy to miss a multi-day downtrend when the 1d is green.

### Stage 3 — High-Level Reflection (Past Decisions)

Look at your own trade history before deciding:

```bash
curl $API/trades?limit=20
```

Ask: what did I recommend last time? What happened after? What would I do differently?

Produce one improvement note:

> *"I entered BTC twice when σ was -0.8. Both times it drifted to -1.2 before reversing. I should wait for σ ≤ -1 before recommending entry."*

**Skip Stage 3 only if there is no trade history yet.**

### Stage 4 — Decision

Combine Stages 1–3 with what you know about the user (risk tolerance, current positions, available capital).

Produce a structured recommendation:

```
Recommendation: [BUY / SELL / HOLD / WAIT]
Asset:          [pair]
Size:           [$X or X units]
Rationale:      [2–3 sentences combining market intel, price movement, and reflection]
Confidence:     [LOW / MEDIUM / HIGH]
```

## Full Action Sequence

After a decision is confirmed, follow this exact sequence:

```
1. Analyze   → Stages 1–2 → POST /actions {action_type: "analyze"}
2. Reflect   → Stage 3    → check GET /trades history
3. Decide    → Stage 4    → form recommendation for user
4. Execute   → kraken order ... (after user confirms)
5. Log trade → POST /trades {pair, side, size, price, order_id}
6. Update    → POST /portfolio {total_usd, cash_usd, positions}
7. Log done  → POST /actions {action_type: "trade", what was executed + improvement note}
```

**Never skip steps 5–7.** The dashboard and on-chain reputation both depend on the API log being complete.

## Execution — Kraken CLI

```bash
# Paper trading (no API key needed)
kraken paper buy BTCUSD 0.1 -o json
kraken paper sell BTCUSD 0.05 -o json
kraken paper status -o json

# Live trading (requires API key)
kraken order buy BTCUSD 0.1 --type market -o json
kraken order buy TSLAx/USD 12.4 --type market --asset-class tokenized_asset -o json
kraken order buy EURUSD 1000 --type limit --price 1.0842 --asset-class forex -o json
```

Capture the `order_id` from the response — it goes into `POST /trades`.

## σ Signal Reference

VWAP σ position is the primary entry/exit signal:

| σ Position | Signal | Action |
|---|---|---|
| > +2 | Overextended | Avoid. Wait for mean reversion. |
| +1 to +2 | Slightly rich | Wait for better entry. |
| -1 to +1 | Fair value | Neutral zone. No strong signal. |
| -1 to -2 | Discount | Potential entry. Stage 3 check required. |
| < -2 | Deep discount | High conviction entry. Size up. |

Combine with Fear & Greed:
- σ ≤ -1 **and** F&G < 50 → strong entry candidate
- σ ≤ -2 → high conviction regardless of F&G
- σ ≥ +2 **and** F&G > 75 → alert for potential exit

## Asset Classes

ClawBerg supports all asset classes the Kraken CLI exposes:

| Class | Examples | Flag |
|---|---|---|
| Crypto | BTCUSD, ETHUSD | *(default)* |
| Tokenized stocks | TSLAx/USD, NVDAx/USD, SPYx/USD | `--asset-class tokenized_asset` |
| Forex | EURUSD, GBPUSD | `--asset-class forex` |
| Commodities | GLDx/USD (Gold), SLVx/USD (Silver) | `--asset-class tokenized_asset` |
| Futures | PF_XBTUSD | `--asset-class futures` |

## PRISM Asset Resolution

Use PRISM to resolve natural language to canonical tickers:

```bash
BASE="https://strykr-prism.up.railway.app"

# Resolve by name
curl "$BASE/asset/resolve?query=Tesla"        # → TSLAx/USD
curl "$BASE/asset/resolve?query=Gold"         # → GLDx/USD
curl "$BASE/asset/resolve?query=S&P 500"      # → SPYx/USD

# Sentiment
curl "$BASE/market/fear-greed"

# Cross-venue price
curl "$BASE/crypto/price/BTC"
```

## ERC-8004 Reputation Tags

Every trade logged via `POST /trades` feeds five on-chain reputation metrics:

| Metric | Tag |
|---|---|
| Sharpe Ratio | `sharpeRatio` |
| Max Drawdown | `maxDrawdown` |
| Win Rate | `winRate` |
| Excess Return | `excessReturn` |
| Annualized Return | `annualizedReturn` |

Incomplete logs degrade your agent's on-chain reputation. Log everything.
