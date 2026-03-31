'use client';

import { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function MarketTicker({ symbol, price, change, decimals = 2 }) {
  const isPos = change >= 0;
  const fmt = (v, d) =>
    v == null ? '—' : new Intl.NumberFormat('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
  return (
    <span className="flex items-baseline gap-1.5 whitespace-nowrap">
      <span className="text-muted text-xs">{symbol}</span>
      <span className="font-medium">${fmt(price, decimals)}</span>
      <span className={`text-xs ${isPos ? 'text-positive' : 'text-negative'}`}>
        {isPos ? '+' : ''}{change != null ? change.toFixed(2) : '—'}%
      </span>
    </span>
  );
}

function FearGreedBadge({ value, label }) {
  if (value == null) return null;
  let color = '#888';
  if (value <= 25) color = '#ff5f56';
  else if (value <= 45) color = '#ff9f43';
  else if (value <= 55) color = '#888';
  else if (value <= 75) color = '#00d4aa';
  else color = '#00ff88';
  return (
    <span className="flex items-baseline gap-1.5 whitespace-nowrap">
      <span className="text-muted text-xs">F&amp;G</span>
      <span className="font-medium" style={{ color }}>{value}</span>
      <span className="text-xs text-muted">{label}</span>
    </span>
  );
}

function MarketBar({ market }) {
  if (!market) {
    return (
      <div className="border border-border px-4 py-2 text-muted text-xs">
        Fetching market data…
      </div>
    );
  }

  const crypto = market.crypto?.prices || {};
  const stocks = market.stocks?.quotes || {};
  const fg = market.fear_greed;
  const updatedAt = market.timestamp ? new Date(market.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : null;

  return (
    <div className="border border-border px-4 py-2 flex items-center justify-between overflow-x-auto gap-6">
      <div className="flex items-center gap-6 flex-wrap">
        {/* Crypto */}
        {['BTC', 'ETH', 'SOL'].map(sym => {
          const d = crypto[sym];
          return d?.price_usd != null
            ? <MarketTicker key={sym} symbol={sym} price={d.price_usd} change={d.change_24h_pct} decimals={sym === 'BTC' ? 0 : 2} />
            : null;
        })}

        {/* Divider */}
        <span className="text-border">|</span>

        {/* Fear & Greed */}
        <FearGreedBadge value={fg?.value} label={fg?.label} />

        {/* Divider */}
        <span className="text-border">|</span>

        {/* xStocks */}
        {['NVDA', 'SPY', 'GLD'].map(sym => {
          const d = stocks[sym];
          return d?.price_usd != null
            ? <MarketTicker key={sym} symbol={sym} price={d.price_usd} change={d.change} decimals={2} />
            : null;
        })}
      </div>
      {updatedAt && (
        <span className="text-muted text-xs flex-shrink-0">Updated {updatedAt}</span>
      )}
    </div>
  );
}

function formatUsd(value) {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value) {
  if (value === null || value === undefined) return '—';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${Number(value).toFixed(2)}%`;
}

function formatTime(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncateAddress(addr) {
  if (!addr) return '—';
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function ActionBadge({ type }) {
  const badgeClass = {
    analyze: 'badge-analyze',
    trade: 'badge-trade',
    rebalance: 'badge-rebalance',
    alert: 'badge-alert',
    chat: 'badge-chat',
  }[type] || 'badge-chat';

  return <span className={`badge ${badgeClass}`}>{type}</span>;
}

function StatCard({ label, value, subValue, isPositive }) {
  return (
    <div className="border border-border p-4">
      <div className="text-muted text-xs uppercase tracking-wider mb-1">{label}</div>
      <div className="text-xl font-medium">{value}</div>
      {subValue !== undefined && (
        <div className={`text-sm mt-1 ${isPositive === true ? 'text-positive' : isPositive === false ? 'text-negative' : 'text-muted'}`}>
          {subValue}
        </div>
      )}
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="py-12 text-center text-muted">
      {message}
    </div>
  );
}

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState(null);
  const [trades, setTrades] = useState([]);
  const [actions, setActions] = useState([]);
  const [market, setMarket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch initial data
  useEffect(() => {
    async function fetchData() {
      try {
        const [portfolioRes, tradesRes, actionsRes, marketRes] = await Promise.all([
          fetch(`${API_URL}/portfolio`),
          fetch(`${API_URL}/trades?limit=10`),
          fetch(`${API_URL}/actions?limit=10`),
          fetch(`${API_URL}/market/snapshot`),
        ]);

        const portfolioData = await portfolioRes.json();
        const tradesData = await tradesRes.json();
        const actionsData = await actionsRes.json();
        const marketData = await marketRes.json();

        setPortfolio(portfolioData.portfolio);
        setTrades(tradesData.trades || []);
        setActions(actionsData.actions || []);
        setMarket(marketData);
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();

    // Refresh market data every 60s (prices change; SSE covers the rest)
    const marketInterval = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/market/snapshot`);
        const data = await res.json();
        setMarket(data);
      } catch (err) {
        console.error('Market refresh failed:', err);
      }
    }, 60000);

    return () => clearInterval(marketInterval);
  }, []);

  // SSE connection for real-time updates
  useEffect(() => {
    const eventSource = new EventSource(`${API_URL}/events`);

    eventSource.addEventListener('connected', () => {
      setConnected(true);
    });

    eventSource.addEventListener('trade', (e) => {
      const trade = JSON.parse(e.data);
      setTrades((prev) => [trade, ...prev].slice(0, 10));
    });

    eventSource.addEventListener('action', (e) => {
      const action = JSON.parse(e.data);
      setActions((prev) => [action, ...prev].slice(0, 10));
    });

    eventSource.addEventListener('portfolio', (e) => {
      const portfolioData = JSON.parse(e.data);
      setPortfolio(portfolioData);
    });

    eventSource.addEventListener('market', (e) => {
      const marketData = JSON.parse(e.data);
      setMarket(marketData);
    });

    eventSource.onerror = () => {
      setConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-muted">Loading...</span>
      </div>
    );
  }

  const positions = portfolio?.positions || [];
  const pnlUsd = portfolio?.pnl_usd;
  const pnlPct = portfolio?.pnl_pct;
  const isPnlPositive = pnlUsd !== null && pnlUsd !== undefined ? pnlUsd >= 0 : undefined;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium">Portfolio Overview</h1>
          <p className="text-muted text-sm mt-1">
            Agent: <span className="text-text">FinPal-001</span>
            <span className="mx-2">·</span>
            Wallet: <span className="text-text">{truncateAddress('0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D')}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${connected ? 'bg-accent status-dot-live' : 'bg-muted'}`}
          />
          <span className="text-sm text-muted">{connected ? 'Live' : 'Disconnected'}</span>
        </div>
      </div>

      {/* Market Bar */}
      <MarketBar market={market} />

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Total Value"
          value={portfolio ? formatUsd(portfolio.total_usd) : '—'}
        />
        <StatCard
          label="Cash"
          value={portfolio ? formatUsd(portfolio.cash_usd) : '—'}
        />
        <StatCard
          label="P&L (USD)"
          value={pnlUsd !== null && pnlUsd !== undefined ? formatUsd(pnlUsd) : '—'}
          isPositive={isPnlPositive}
        />
        <StatCard
          label="P&L (%)"
          value={pnlPct !== null && pnlPct !== undefined ? formatPercent(pnlPct) : '—'}
          isPositive={isPnlPositive}
        />
      </div>

      {/* Positions Table */}
      <section>
        <h2 className="text-lg font-medium mb-4">Positions</h2>
        {positions.length === 0 ? (
          <div className="border border-border">
            <EmptyState message="No positions yet" />
          </div>
        ) : (
          <div className="border border-border overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Pair</th>
                  <th>Size</th>
                  <th>Value</th>
                  <th>Entry Price</th>
                  <th>P&L %</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((pos, i) => (
                  <tr key={i}>
                    <td className="font-medium">{pos.pair}</td>
                    <td>{Number(pos.size).toFixed(6)}</td>
                    <td>{formatUsd(pos.value_usd)}</td>
                    <td>{formatUsd(pos.entry_price)}</td>
                    <td className={pos.pnl_pct >= 0 ? 'text-positive' : 'text-negative'}>
                      {formatPercent(pos.pnl_pct)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent Trades */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Recent Trades</h2>
          <a href="/trades" className="text-sm text-accent">
            View all →
          </a>
        </div>
        {trades.length === 0 ? (
          <div className="border border-border">
            <EmptyState message="No trades yet" />
          </div>
        ) : (
          <div className="border border-border overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Pair</th>
                  <th>Side</th>
                  <th>Size</th>
                  <th>Price</th>
                  <th>Strategy</th>
                  <th>Proof</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => (
                  <tr key={trade.id}>
                    <td className="text-muted">{formatTime(trade.created_at)}</td>
                    <td className="font-medium">{trade.pair}</td>
                    <td className={trade.side === 'buy' ? 'text-buy' : 'text-sell'}>
                      {trade.side.toUpperCase()}
                    </td>
                    <td>{Number(trade.size).toFixed(6)}</td>
                    <td>{formatUsd(trade.price)}</td>
                    <td className="text-muted">{trade.strategy || '—'}</td>
                    <td>
                      {trade.tx_hash ? (
                        <a
                          href={`https://etherscan.io/tx/${trade.tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent"
                        >
                          {truncateAddress(trade.tx_hash)}
                        </a>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Agent Activity */}
      <section>
        <h2 className="text-lg font-medium mb-4">Agent Activity</h2>
        {actions.length === 0 ? (
          <div className="border border-border">
            <EmptyState message="No activity yet" />
          </div>
        ) : (
          <div className="border border-border divide-y divide-border">
            {actions.map((action) => (
              <div key={action.id} className="px-4 py-3 flex items-start gap-4">
                <span className="text-muted text-sm whitespace-nowrap">
                  {formatTime(action.created_at)}
                </span>
                <ActionBadge type={action.action_type} />
                <span className="flex-1">{action.summary}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
