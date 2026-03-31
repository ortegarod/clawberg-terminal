# Trades

Log every trade the agent executes and query trade history.

## `POST /trades`

Log a completed trade after execution on Kraken. This creates a record in `trades` and broadcasts a `trade` event to all SSE subscribers.

### Request Body

| Field | Type | Required | Notes |
|---|---|---|---|
| `pair` | string | ✅ | e.g. `"BTCUSD"`, `"TSLAx/USD"` |
| `side` | `"buy"` \| `"sell"` | ✅ | |
| `size` | number | ✅ | Units of the base asset |
| `price` | number | ✅ | Execution price |
| `total_usd` | number | ✅ | Total value in USD |
| `strategy` | string | — | e.g. `"VWAP entry"`, `"DCA"` |
| `sigma_at_entry` | number | — | σ position at time of trade |
| `tx_hash` | string | — | On-chain proof hash |
| `order_id` | string | — | Kraken order ID |
| `status` | string | — | Default: `"filled"` |

### Example

```bash
curl -X POST http://localhost:4000/trades \
  -H "Content-Type: application/json" \
  -d '{
    "pair": "TSLAx/USD",
    "side": "buy",
    "size": 12.4,
    "price": 241.80,
    "total_usd": 3000,
    "strategy": "VWAP entry",
    "sigma_at_entry": -0.8,
    "order_id": "OQCLML-XXXXX-YYYYY"
  }'
```

### Response `201`

```json
{
  "id": 42,
  "created_at": "2026-03-30T21:07:00.000Z",
  "pair": "TSLAx/USD",
  "side": "buy",
  "size": "12.4",
  "price": "241.8",
  "total_usd": "3000",
  "strategy": "VWAP entry",
  "sigma_at_entry": "-0.8",
  "tx_hash": null,
  "order_id": "OQCLML-XXXXX-YYYYY",
  "status": "filled"
}
```

---

## `GET /trades`

Fetch trade history, most recent first.

### Query Parameters

| Param | Type | Default | Notes |
|---|---|---|---|
| `pair` | string | — | Filter by trading pair |
| `side` | `"buy"` \| `"sell"` | — | Filter by side |
| `limit` | integer | `50` | Max records to return |
| `offset` | integer | `0` | Pagination offset |

### Examples

```bash
# All trades, latest 50
curl http://localhost:4000/trades

# Filter to BTC buys
curl "http://localhost:4000/trades?pair=BTCUSD&side=buy"

# Page 2 (50 per page)
curl "http://localhost:4000/trades?limit=50&offset=50"
```

### Response `200`

```json
{
  "trades": [
    {
      "id": 42,
      "created_at": "2026-03-30T21:07:00.000Z",
      "pair": "TSLAx/USD",
      "side": "buy",
      "size": "12.4",
      "price": "241.8",
      "total_usd": "3000",
      "strategy": "VWAP entry",
      "sigma_at_entry": "-0.8",
      "tx_hash": null,
      "order_id": "OQCLML-XXXXX-YYYYY",
      "status": "filled"
    }
  ],
  "total": 42,
  "limit": 50,
  "offset": 0
}
```
