-- Financial Agent Dashboard Schema

CREATE TABLE IF NOT EXISTS trades (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  pair VARCHAR(50) NOT NULL,
  side VARCHAR(10) NOT NULL,       -- buy | sell
  size NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  total_usd NUMERIC NOT NULL,
  strategy VARCHAR(100),           -- e.g. "VWAP entry", "DCA"
  sigma_at_entry NUMERIC,          -- σ position at time of trade
  tx_hash VARCHAR(100),            -- on-chain proof (nullable)
  order_id VARCHAR(100),           -- Kraken order ID (nullable)
  status VARCHAR(20) DEFAULT 'filled'
);

CREATE TABLE IF NOT EXISTS agent_actions (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  action_type VARCHAR(50) NOT NULL,  -- analyze | trade | rebalance | alert | chat
  summary TEXT NOT NULL,             -- human-readable description
  data JSONB                         -- raw data (VWAP, signals, etc.)
);

CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  total_usd NUMERIC NOT NULL,
  cash_usd NUMERIC NOT NULL,
  positions JSONB NOT NULL,          -- array of {pair, size, value_usd, entry_price, pnl_pct}
  pnl_usd NUMERIC,
  pnl_pct NUMERIC
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_trades_created_at ON trades(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_pair ON trades(pair);
CREATE INDEX IF NOT EXISTS idx_agent_actions_created_at ON agent_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_created_at ON portfolio_snapshots(created_at DESC);
