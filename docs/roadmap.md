Phase 0.5: venue adapter and market graph foundation

Status: now
  • canonical asset model
  • canonical market model
  • venue adapter interface
  • public market data integration
  • symbol normalization
  • market graph builder
  • route candidate discovery

Supported venue roles
  • Robinhood: reference / major market venue
  • Coinbase: reference / major market venue
  • SafeTrade: GRC execution + market data venue
  • AltQuick: CURE market data venue
  • HeliEx: optional direct GRC/CURE execution venue

First implementation target
  • define canonical assets and markets
  • add read-only venue adapter contract
  • add market scanner service
  • implement SafeTrade public market data adapter first
  • implement AltQuick public market data adapter second

Venue credential status
  • SafeTrade keys loaded, public market data path blocked by Cloudflare
  • AltQuick keys loaded, public API endpoint unresolved

Phase 1: private read access

Status: complete enough
  • balances ✅
  • orders ✅
  • auth/signing ✅

Optional later
  • own trade history endpoint
  • normalized fills/trade history
  • fee discovery
  • deposit/withdraw capability discovery

Phase 2: smallest possible write action

Status: complete
  • tiny limit order placed ✅
  • visible in exchange state ✅
  • cancelled cleanly ✅
  • terminal state confirmed ✅

Phase 3: reconciliation and safety

Status: strong
  • dry-run execution ✅
  • strategy split ✅
  • private veto layer ✅
  • reconciliation helpers ✅
  • reconciliation harness ✅
  • strategy harness ✅
  • spend cap ✅
  • stale trade rejection ✅
  • partial fill protection ✅
  • preflight output ✅
  • shared runtime config ✅
  • triple live latch ✅

Phase 3.5: degraded-mode / outage handling

Status: complete first pass
  • normalize Cloudflare tunnel failures ✅
  • concise outage handling in execution ✅
  • concise outage handling in readiness ✅

Expand with
  • rate-limit normalization
  • auth failure normalization
  • malformed response normalization
  • market unavailable normalization

Phase 4: supervised live micro-trade

Status: ready to execute
  • venue-scoped live test mode
  • single-cycle only
  • no loop
  • no retries
  • forced cancel after timeout
  • maxConcurrentOrders = 1

Add before first live run
  • entry geometry output
  • timed cancel logic
  • TEST MODE banner

Phase 4.5: live validation & telemetry

Status: immediately after first live test
  • execution outcome classification
  • placement latency tracking
  • cancel latency tracking
  • order lifecycle timeline
  • exchange echo verification
  • explicit LIVE TEST MODE output

Phase 5: private strategy hardening

Status: started
  • private strategy module exists ✅
  • score veto exists ✅

5A venue-local strategy
  • classify local market regimes
  • adapt thresholds per regime
  • passive / semi-aggressive / opportunistic entry styles

5B cross-venue route intelligence
  • implied cross-price calculation
  • route viability scoring
  • liquidity-aware path rejection
  • separate signal validity from execution desirability

Phase 6: operator tooling / sustained automation

Status: later
  • looped readiness / scanner mode
  • alerting
  • service supervision
  • persistent cooldown/state
  • richer order lifecycle handling
  • kill switch
  • pause switch

Phase 7: interface layer (future GUI / Python bridge)

Status: lightweight start now
  • structured JSON output
  • command flags:
      --once
      --sample
      --live-test
      --venue=<name>
      --scan-routes
      --jsonl
  • clean core / CLI separation
  • machine-readable event stream