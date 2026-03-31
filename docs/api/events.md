# Events (SSE)

Real-time updates via Server-Sent Events. The dashboard subscribes here and receives live pushes whenever the agent logs a trade, action, or portfolio update.

## `GET /events`

Opens an SSE stream. The connection stays open until the client disconnects. A `:heartbeat` comment is sent every 30 seconds to keep the connection alive through proxies.

### Event Types

| Event | Triggered by | Payload |
|---|---|---|
| `connected` | On subscribe | `{"status": "connected"}` |
| `trade` | `POST /trades` | Full trade record |
| `action` | `POST /actions` | Full action record |
| `portfolio` | `POST /portfolio` | Full portfolio snapshot |

### Browser (EventSource)

```js
const es = new EventSource('http://localhost:4000/events');

es.addEventListener('connected', e => {
  console.log('Connected to ClawBerg stream');
});

es.addEventListener('trade', e => {
  const trade = JSON.parse(e.data);
  console.log('New trade:', trade.pair, trade.side, trade.size, '@', trade.price);
});

es.addEventListener('action', e => {
  const action = JSON.parse(e.data);
  console.log('Agent action:', action.action_type, '—', action.summary);
});

es.addEventListener('portfolio', e => {
  const portfolio = JSON.parse(e.data);
  console.log('Portfolio updated. Total:', portfolio.total_usd);
});

es.onerror = e => {
  console.error('SSE error:', e);
  // EventSource will auto-reconnect
};
```

### curl

```bash
curl -N http://localhost:4000/events
```

Output:

```
event: connected
data: {"status":"connected"}

event: trade
data: {"id":42,"created_at":"2026-03-30T21:07:00.000Z","pair":"TSLAx/USD","side":"buy",...}

:heartbeat
```

### Notes

- **Clients reconnect automatically** — `EventSource` handles reconnection with exponential backoff
- **No replay** — only events that occur after subscribing are delivered
- **CORS is open** — `Access-Control-Allow-Origin: *` is set on the response
- **Multiple subscribers** — any number of clients can connect simultaneously
