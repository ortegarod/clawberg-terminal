'use client';

import { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const PAGE_SIZE = 20;

function formatUsd(value) {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

function formatTime(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function truncateAddress(addr) {
  if (!addr) return '—';
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function EmptyState({ message }) {
  return (
    <div className="py-12 text-center text-muted">
      {message}
    </div>
  );
}

export default function TradesPage() {
  const [trades, setTrades] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pairFilter, setPairFilter] = useState('');
  const [sideFilter, setSideFilter] = useState('');
  const [availablePairs, setAvailablePairs] = useState([]);
  const [connected, setConnected] = useState(false);

  // Fetch trades
  useEffect(() => {
    async function fetchTrades() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          limit: PAGE_SIZE.toString(),
          offset: (page * PAGE_SIZE).toString(),
        });
        if (pairFilter) params.set('pair', pairFilter);
        if (sideFilter) params.set('side', sideFilter);

        const res = await fetch(`${API_URL}/trades?${params}`);
        const data = await res.json();

        setTrades(data.trades || []);
        setTotal(data.total || 0);

        // Extract unique pairs for filter
        if (page === 0 && !pairFilter && !sideFilter) {
          const pairs = [...new Set((data.trades || []).map((t) => t.pair))];
          setAvailablePairs(pairs);
        }
      } catch (err) {
        console.error('Failed to fetch trades:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchTrades();
  }, [page, pairFilter, sideFilter]);

  // SSE connection for real-time updates
  useEffect(() => {
    const eventSource = new EventSource(`${API_URL}/events`);

    eventSource.addEventListener('connected', () => {
      setConnected(true);
    });

    eventSource.addEventListener('trade', (e) => {
      const trade = JSON.parse(e.data);
      // Only add to current view if we're on page 0 and filters match
      if (page === 0) {
        const matchesPair = !pairFilter || trade.pair === pairFilter;
        const matchesSide = !sideFilter || trade.side === sideFilter;
        if (matchesPair && matchesSide) {
          setTrades((prev) => [trade, ...prev].slice(0, PAGE_SIZE));
          setTotal((prev) => prev + 1);
        }
      }
      // Add pair to available pairs if new
      if (!availablePairs.includes(trade.pair)) {
        setAvailablePairs((prev) => [...prev, trade.pair]);
      }
    });

    eventSource.onerror = () => {
      setConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [page, pairFilter, sideFilter, availablePairs]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handlePairChange = (e) => {
    setPairFilter(e.target.value);
    setPage(0);
  };

  const handleSideChange = (e) => {
    setSideFilter(e.target.value);
    setPage(0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium">Trade History</h1>
          <p className="text-muted text-sm mt-1">
            {total} total trades
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${connected ? 'bg-accent status-dot-live' : 'bg-muted'}`}
          />
          <span className="text-sm text-muted">{connected ? 'Live' : 'Disconnected'}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted">Pair:</label>
          <select
            value={pairFilter}
            onChange={handlePairChange}
            className="bg-bg border border-border px-3 py-1.5 text-sm focus:outline-none focus:border-accent"
          >
            <option value="">All</option>
            {availablePairs.map((pair) => (
              <option key={pair} value={pair}>
                {pair}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted">Side:</label>
          <select
            value={sideFilter}
            onChange={handleSideChange}
            className="bg-bg border border-border px-3 py-1.5 text-sm focus:outline-none focus:border-accent"
          >
            <option value="">All</option>
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
        </div>
      </div>

      {/* Trades Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="text-muted">Loading...</span>
        </div>
      ) : trades.length === 0 ? (
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
                <th>Total</th>
                <th>Strategy</th>
                <th>Sigma</th>
                <th>Order ID</th>
                <th>Proof</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr key={trade.id}>
                  <td className="text-muted whitespace-nowrap">{formatTime(trade.created_at)}</td>
                  <td className="font-medium">{trade.pair}</td>
                  <td className={trade.side === 'buy' ? 'text-buy' : 'text-sell'}>
                    {trade.side.toUpperCase()}
                  </td>
                  <td>{Number(trade.size).toFixed(6)}</td>
                  <td>{formatUsd(trade.price)}</td>
                  <td>{formatUsd(trade.total_usd)}</td>
                  <td className="text-muted">{trade.strategy || '—'}</td>
                  <td className="text-muted">
                    {trade.sigma_at_entry !== null ? `${Number(trade.sigma_at_entry).toFixed(2)}σ` : '—'}
                  </td>
                  <td className="text-muted">{trade.order_id || '—'}</td>
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
                  <td>
                    <span className={`text-xs uppercase ${trade.status === 'filled' ? 'text-accent' : 'text-muted'}`}>
                      {trade.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-4 py-2 border border-border text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:border-accent transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-muted">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-4 py-2 border border-border text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:border-accent transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
