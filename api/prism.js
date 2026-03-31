/**
 * Strykr PRISM client — unified market data
 * https://strykr-prism.up.railway.app
 * No API key required for current tier.
 */

const PRISM_BASE = 'https://strykr-prism.up.railway.app';

async function prismGet(path) {
  const res = await fetch(`${PRISM_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`PRISM ${path} returned ${res.status}`);
  }
  return res.json();
}

async function prismPost(path, body) {
  const res = await fetch(`${PRISM_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`PRISM POST ${path} returned ${res.status}`);
  }
  return res.json();
}

// ── Crypto ──────────────────────────────────────────────────────────────────

/** Single crypto price with confidence score */
async function cryptoPrice(symbol) {
  return prismGet(`/crypto/price/${symbol.toUpperCase()}`);
}

/** Batch crypto prices — parallel individual calls (PRISM batch is POST-restricted) */
async function cryptoPrices(symbols) {
  const results = await Promise.all(
    symbols.map(s => cryptoPrice(s).catch(err => ({ symbol: s.toUpperCase(), error: err.message })))
  );
  // Return as { prices: { BTC: {...}, ETH: {...} } } for consistency
  const prices = {};
  for (const r of results) {
    if (r.symbol) prices[r.symbol] = r;
  }
  return { prices };
}

// ── Stocks / xStocks ────────────────────────────────────────────────────────

/** Single stock quote */
async function stockQuote(symbol) {
  return prismGet(`/stocks/${symbol.toUpperCase()}/quote`);
}

/** Batch stock quotes — PRISM expects raw array */
async function stockQuotes(symbols) {
  return prismPost('/stocks/batch/quotes', symbols.map(s => s.toUpperCase()));
}

// ── Market Sentiment ────────────────────────────────────────────────────────

/** Fear & Greed Index — { value, label } */
async function fearGreed() {
  return prismGet('/market/fear-greed');
}

/** Full market overview (crypto + tradfi) */
async function marketOverview() {
  return prismGet('/market/overview');
}

/** Trending crypto */
async function trending() {
  return prismGet('/crypto/trending');
}

// ── DeFi / Derivatives ──────────────────────────────────────────────────────

/** Cross-venue funding rates for a symbol */
async function fundingRates(symbol) {
  return prismGet(`/dex/${symbol.toUpperCase()}/funding/all`);
}

/** Cross-venue open interest for a symbol */
async function openInterest(symbol) {
  return prismGet(`/dex/${symbol.toUpperCase()}/oi/all`);
}

/** Hyperliquid funding for a symbol */
async function hyperliquidFunding(symbol) {
  return prismGet(`/dex/hyperliquid/${symbol.toUpperCase()}/funding`);
}

// ── Commodities / Forex ─────────────────────────────────────────────────────

/** All commodity prices (includes GOLD, OIL, etc.) */
async function commodities() {
  return prismGet('/commodities');
}

/** Forex rates */
async function forex() {
  return prismGet('/forex');
}

// ── Composed snapshots (used by ClawBerg heartbeat + dashboard) ──────────────

/**
 * Full ClawBerg market snapshot — everything the agent needs in one shot.
 * Returns: { crypto, stocks, fear_greed, funding, timestamp }
 */
async function clawbergSnapshot() {
  const [cryptoData, stockData, fg, btcFunding, ethFunding] = await Promise.allSettled([
    cryptoPrices(['BTC', 'ETH', 'SOL']),
    stockQuotes(['NVDA', 'SPY', 'GLD']),
    fearGreed(),
    fundingRates('BTC'),
    fundingRates('ETH'),
  ]);

  const pick = (result, fallback = null) =>
    result.status === 'fulfilled' ? result.value : fallback;

  return {
    timestamp: new Date().toISOString(),
    crypto: pick(cryptoData),
    stocks: pick(stockData),
    fear_greed: pick(fg),
    funding: {
      BTC: pick(btcFunding),
      ETH: pick(ethFunding),
    },
  };
}

module.exports = {
  cryptoPrice,
  cryptoPrices,
  stockQuote,
  stockQuotes,
  fearGreed,
  marketOverview,
  trending,
  fundingRates,
  openInterest,
  hyperliquidFunding,
  commodities,
  forex,
  clawbergSnapshot,
};
