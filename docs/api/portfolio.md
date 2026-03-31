# Portfolio

Post portfolio snapshots after trades and fetch the current state.

## `POST /portfolio`

Post the current portfolio state. Call this after every trade or rebalance. Creates a record in `portfolio_snapshots` and broadcasts a `portfolio` event to SSE subscribers.

### Request Body

| Field | Type | Required | Notes |
|---|---|---|---|
| `total_usd` | number | ✅ | Total portfolio value in USD |
| `cash_usd` | number | ✅ | Uninvested cash in USD |
| `positions` | array | ✅ | Current open positions (see below) |
| `pnl_usd` | number | — | Unrealized + realized P&L in USD |
| `pnl_pct` | number | — | P&L as a percentage of initial capital |

### `positions` Array Shape

Each item in `positions`:

| Field | Type | Notes |
|---|---|---|
| `pair` | string | e.g. `"TSLAx/USD"` |
| `size` | number | Units held |
| `value_usd` | number | Current market value in USD |
| `entry_price` | number | Average entry price |
| `pnl_pct` | number | P&L % on this position |

### Example

```bash
curl -X POST http://localhost:4000/portfolio \
  -H "Content-Type: application/json" \
  -d '{
    "total_usd": 15000,
    "cash_usd": 12000,
    "positions": [
      {
        "pair": "TSLAx/USD",
        "size": 12.4,
        "value_usd": 3000,
        "entry_price": 241.80,
        "pnl_pct": 0.0
      }
    ],
    "pnl_usd": 0,
    "pnl_pct": 0.0
  }'
```

### Response `201`

```json
{
  "id": 8,
  "created_at": "2026-03-30T21:12:00.000Z",
  "total_usd": "15000",
  "cash_usd": "12000",
  "positions": [
    {
      "pair": "TSLAx/USD",
      "size": 12.4,
      "value_usd": 3000,
      "entry_price": 241.80,
      "pnl_pct": 0.0
    }
  ],
  "pnl_usd": "0",
  "pnl_pct": "0"
}
```

---

## `GET /portfolio`

Get the most recent portfolio snapshot.

### Example

```bash
curl http://localhost:4000/portfolio
```

### Response `200` — snapshot exists

```json
{
  "portfolio": {
    "id": 8,
    "created_at": "2026-03-30T21:12:00.000Z",
    "total_usd": "15000",
    "cash_usd": "12000",
    "positions": [
      {
        "pair": "TSLAx/USD",
        "size": 12.4,
        "value_usd": 3000,
        "entry_price": 241.80,
        "pnl_pct": 0.0
      }
    ],
    "pnl_usd": "0",
    "pnl_pct": "0"
  }
}
```

### Response `200` — no snapshots yet

```json
{ "portfolio": null }
```
