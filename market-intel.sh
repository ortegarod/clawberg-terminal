#!/bin/bash
# Market Intelligence — VWAP + PRISM sentiment layer
# Usage: ./market-intel.sh [BTC|ETH]
# Combines Kraken VWAP analysis with PRISM Fear&Greed + cross-venue data

source $HOME/.cargo/env

PAIR=${1:-BTC}
PRISM="https://strykr-prism.up.railway.app"

# Kraken pair mapping
case $PAIR in
  BTC) KRAKEN_PAIR="BTCUSD"; KRAKEN_KEY="XXBTZUSD"; FUTURES="PF_XBTUSD" ;;
  ETH) KRAKEN_PAIR="ETHUSD"; KRAKEN_KEY="XETHZUSD"; FUTURES="PF_ETHUSD" ;;
  *) echo "Unknown pair: $PAIR"; exit 1 ;;
esac

echo "🔍 Fetching data for $PAIR..."

# Run in parallel
VWAP_DATA=$(~/repos/financial-agent/vwap.sh $KRAKEN_PAIR 60 24 2>/dev/null)
FEAR_GREED=$(curl -s "$PRISM/market/fear-greed" 2>/dev/null)
PRISM_PRICE=$(curl -s "$PRISM/crypto/price/$PAIR" 2>/dev/null)
FUNDING=$(curl -s "$PRISM/dex/$PAIR/funding/all" 2>/dev/null)

# Parse and combine
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  $PAIR Market Intelligence"
echo "  $(date -u '+%Y-%m-%d %H:%M UTC')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# VWAP stats
echo "$VWAP_DATA" | jq -r '"
📊 VWAP Analysis (24h, 1h candles)
  Price:        $\(.current_price)
  VWAP:         $\(.vwap | floor)
  σ position:   \(.sigma_position | . * 100 | round / 100)σ
  1σ band:      $\(.vwap_1sigma_lower | floor) — $\(.vwap_1sigma_upper | floor)
  2σ band:      $\(.vwap_2sigma_lower | floor) — $\(.vwap_2sigma_upper | floor)
  Signal:       \(.summary)"'

# PRISM price (cross-venue consensus)
echo "$PRISM_PRICE" | jq -r '"
🌐 Cross-Venue Price (PRISM)
  Price:        $\(.price_usd | floor)
  24h change:   \(.change_24h_pct | . * 100 | round / 100)%
  Sources:      \(.sources | join(", "))
  Confidence:   \(.confidence)"'

# Fear & Greed
echo "$FEAR_GREED" | jq -r '"
🧠 Market Sentiment
  Fear & Greed: \(.value)/100 (\(.label))"'

# Funding rates
echo "$FUNDING" | jq -r '"
💸 Cross-Venue Funding Rates
  \(.funding_rates | to_entries | map("  \(.key): \(.value // "n/a")") | join("\n"))"'

# Final recommendation
SIGMA=$(echo "$VWAP_DATA" | jq -r '.sigma_position')
FG=$(echo "$FEAR_GREED" | jq -r '.value')

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
python3 -c "
sigma = $SIGMA
fg = $FG

if sigma <= -2:
    signal = '🟢 STRONG BUY — deep discount + check sentiment'
elif sigma <= -1:
    signal = '🟡 WATCH — discount zone'
    if fg < 30:
        signal = '🟢 BUY — discount zone + fear = opportunity'
    elif fg > 70:
        signal = '⚠️  CAUTION — discount but greed is high'
elif sigma >= 2:
    signal = '🔴 AVOID — overextended'
    if fg > 70:
        signal = '🔴 AVOID — overextended + greed = danger'
else:
    signal = '⚪ NEUTRAL — wait for better entry'

print(f'  COMBINED SIGNAL: {signal}')
print(f'  (VWAP σ={sigma:.2f}, F&G={fg})')
"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
