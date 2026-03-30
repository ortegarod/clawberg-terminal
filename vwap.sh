#!/bin/bash
# VWAP + Standard Deviation Analysis
# Usage: ./vwap.sh BTCUSD [interval_minutes] [lookback_candles]
# Example: ./vwap.sh BTCUSD 60 24

source $HOME/.cargo/env

PAIR=${1:-BTCUSD}
INTERVAL=${2:-60}   # candle size in minutes
LOOKBACK=${3:-24}   # number of candles to analyze

# Map pair to Kraken internal name for OHLC response key
case $PAIR in
  BTCUSD) KEY="XXBTZUSD" ;;
  ETHUSD) KEY="XETHZUSD" ;;
  SOLUSD) KEY="SOLUSD" ;;
  *) KEY="$PAIR" ;;
esac

kraken ohlc $PAIR --interval $INTERVAL -o json 2>/dev/null | jq --arg key "$KEY" --argjson lookback "$LOOKBACK" '
  .[$key][-$lookback:] |
  
  # Each candle: [time, open, high, low, close, vwap, volume, count]
  # Compute rolling VWAP = sum(vwap * volume) / sum(volume)
  . as $candles |
  
  {
    pair: $key,
    interval_min: '"$INTERVAL"',
    candles_analyzed: ($candles | length),
    current_price: ($candles[-1][4] | tonumber),
    
    vwap: (
      ($candles | map(.[5] | tonumber) as $vwaps |
       $candles | map(.[6] | tonumber) as $vols |
       [ range($candles | length) | . as $i | $vwaps[$i] * $vols[$i] ] | add) /
      ($candles | map(.[6] | tonumber) | add)
    ),
    
    # Price std dev across candle closes
    std_dev: (
      ($candles | map(.[4] | tonumber)) as $closes |
      ($closes | add / length) as $mean |
      ([$closes[] | (. - $mean) * (. - $mean)] | add / length | sqrt)
    ),
    
    period_high: ($candles | map(.[2] | tonumber) | max),
    period_low:  ($candles | map(.[3] | tonumber) | min),
    total_volume: ($candles | map(.[6] | tonumber) | add)
  } |
  
  # Add derived fields
  . + {
    vwap_1sigma_upper: (.vwap + .std_dev),
    vwap_1sigma_lower: (.vwap - .std_dev),
    vwap_2sigma_upper: (.vwap + (2 * .std_dev)),
    vwap_2sigma_lower: (.vwap - (2 * .std_dev)),
    price_vs_vwap_pct: ((.current_price - .vwap) / .vwap * 100),
    sigma_position: ((.current_price - .vwap) / .std_dev)
  } |
  
  # Human readable summary
  . + {
    summary: (
      if .sigma_position > 2 then "⚠️  EXTENDED: price >2σ above VWAP — overextended, avoid buying"
      elif .sigma_position > 1 then "📈 ABOVE: price 1-2σ above VWAP — fair to slightly rich"
      elif .sigma_position > -1 then "✅ FAIR VALUE: price within 1σ of VWAP — neutral zone"
      elif .sigma_position > -2 then "🟡 DISCOUNT: price 1-2σ below VWAP — potential entry zone"
      else "🟢 DEEP DISCOUNT: price >2σ below VWAP — statistically cheap, high conviction entry"
      end
    )
  }
'
