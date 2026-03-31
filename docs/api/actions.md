# Actions

Log agent reasoning steps, decisions, and alerts. This is your agent's activity log — everything it analyzed, decided, and why.

## `POST /actions`

Log an agent action. This creates a record in `agent_actions` and broadcasts an `action` event to all SSE subscribers.

### Request Body

| Field | Type | Required | Notes |
|---|---|---|---|
| `action_type` | string | ✅ | See type reference below |
| `summary` | string | ✅ | Human-readable description |
| `data` | object | — | Raw signal data (σ, F&G, etc.) |

### `action_type` Values

| Value | When to Use |
|---|---|
| `"analyze"` | Market intelligence step — VWAP, σ, sentiment |
| `"trade"` | After executing a trade — what was done and why |
| `"rebalance"` | Portfolio rebalancing decision |
| `"alert"` | σ threshold crossed, anomaly detected |
| `"chat"` | Agent response to a user message |

### Examples

**Analysis step:**

```bash
curl -X POST http://localhost:4000/actions \
  -H "Content-Type: application/json" \
  -d '{
    "action_type": "analyze",
    "summary": "TSLAx at -0.8σ below VWAP. F&G: 49 (neutral). Recommending $3k entry.",
    "data": {
      "pair": "TSLAx/USD",
      "sigma": -0.8,
      "fear_greed": 49,
      "vwap": 241.50,
      "price": 239.80
    }
  }'
```

**Post-trade log:**

```bash
curl -X POST http://localhost:4000/actions \
  -H "Content-Type: application/json" \
  -d '{
    "action_type": "trade",
    "summary": "Bought 12.4 TSLAx at $241.80. Entry at -0.8σ. Improvement: will wait for σ ≤ -1 on next entry.",
    "data": {
      "pair": "TSLAx/USD",
      "order_id": "OQCLML-XXXXX-YYYYY",
      "sigma_at_entry": -0.8,
      "improvement": "Wait for σ ≤ -1 before entry"
    }
  }'
```

**Alert:**

```bash
curl -X POST http://localhost:4000/actions \
  -H "Content-Type: application/json" \
  -d '{
    "action_type": "alert",
    "summary": "BTC crossed -2σ. Deep discount signal. Fear & Greed: 31 (fear).",
    "data": {"pair": "BTCUSD", "sigma": -2.1, "fear_greed": 31}
  }'
```

### Response `201`

```json
{
  "id": 17,
  "created_at": "2026-03-30T21:10:00.000Z",
  "action_type": "analyze",
  "summary": "TSLAx at -0.8σ below VWAP. F&G: 49 (neutral). Recommending $3k entry.",
  "data": {
    "pair": "TSLAx/USD",
    "sigma": -0.8,
    "fear_greed": 49,
    "vwap": 241.5,
    "price": 239.8
  }
}
```

---

## `GET /actions`

Fetch recent agent actions, most recent first.

### Query Parameters

| Param | Type | Default | Notes |
|---|---|---|---|
| `limit` | integer | `20` | Max records to return |

### Example

```bash
curl "http://localhost:4000/actions?limit=10"
```

### Response `200`

```json
{
  "actions": [
    {
      "id": 17,
      "created_at": "2026-03-30T21:10:00.000Z",
      "action_type": "analyze",
      "summary": "TSLAx at -0.8σ below VWAP. Recommending $3k entry.",
      "data": { "pair": "TSLAx/USD", "sigma": -0.8 }
    }
  ]
}
```
