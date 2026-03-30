# FinAgent — Agent Skill

This file tells your AI agent how to use FinAgent. Read it once and your agent knows everything it needs.

---

## What This App Does

FinAgent gives your agent three tools:

1. **Kraken CLI** — executes trades across crypto, tokenized stocks (xStocks), and forex
2. **PRISM API** — resolves asset names, provides sentiment and cross-venue market data
3. **FinAgent API** — logs what your agent does so the dashboard can display it

---

## Tool 1: Kraken CLI

Market data and trade execution. No API key needed for market data and paper trading.

```bash
# Market data
kraken ticker BTCUSD -o json
kraken ohlc BTCUSD --interval 60 -o json      # 1h candles

# VWAP + σ analysis (built-in script)
./vwap.sh BTCUSD 60 24                         # 24h lookback, 1h candles
./market-intel.sh BTC                          # VWAP + Fear&Greed + funding

# Paper trading
kraken paper buy BTCUSD 0.1 -o json
kraken paper status -o json

# Live trading (requires API keys)
kraken order buy TSLAx/USD 12.4 --type market --asset-class tokenized_asset -o json
```

Full CLI reference: `~/kraken-cli/CONTEXT.md`

---

## Tool 2: PRISM API

Resolves asset names to canonical tickers and provides market-wide data.

```bash
BASE="https://strykr-prism.up.railway.app"

# Resolve "Tesla" → TSLAx/USD
curl "$BASE/asset/resolve?query=Tesla"

# Fear & Greed index
curl "$BASE/market/fear-greed"

# Cross-venue price
curl "$BASE/crypto/price/BTC"
```

---

## Tool 3: FinAgent API

Log everything your agent does. This is what powers the dashboard.

```bash
BASE="http://localhost:4000"

# Log analysis step
curl -X POST $BASE/actions -H "Content-Type: application/json" \
  -d '{"action_type":"analyze","summary":"TSLAx at -0.8σ. Recommending $3k entry.","data":{"sigma":-0.8}}'

# Log completed trade
curl -X POST $BASE/trades -H "Content-Type: application/json" \
  -d '{"pair":"TSLAx/USD","side":"buy","size":12.4,"price":241.80,"total_usd":3000,"order_id":"XXXX"}'

# Update portfolio state
curl -X POST $BASE/portfolio -H "Content-Type: application/json" \
  -d '{"total_usd":15000,"cash_usd":12000,"positions":[{"pair":"TSLAx/USD","size":12.4,"value_usd":3000,"entry_price":241.80,"pnl_pct":0}]}'
```

Full API reference: [docs/API.md](docs/API.md)

---

## Standard Workflow

Every time your agent acts, follow this sequence:

```
1. Analyze    → ./vwap.sh + ./market-intel.sh → POST /actions (action_type: "analyze")
2. Decide     → form a recommendation for the user
3. Execute    → kraken order ... (after user confirms)
4. Log trade  → POST /trades (with order_id from Kraken)
5. Update     → POST /portfolio (current state after trade)
6. Log action → POST /actions (action_type: "trade", what was done + why)
```

---

## σ Signal Reference

| σ Position | Signal |
|---|---|
| > +2 | Overextended — avoid |
| +1 to +2 | Slightly rich — wait |
| -1 to +1 | Fair value — neutral |
| -1 to -2 | Discount — potential entry |
| < -2 | Deep discount — high conviction |
