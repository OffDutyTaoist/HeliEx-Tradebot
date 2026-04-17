# HeliEx Tradebot

A TypeScript-based experimental trading bot and market-routing project focused on **safe execution, observable behavior, and venue-agnostic market intelligence**.

This project started as a HeliEx-focused execution bot and has expanded into a broader foundation for **multi-venue market scanning, normalization, route discovery, and supervised execution**.

---

## Disclaimer

This is an experimental project.

- Not financial advice
- Not production-ready
- You can, and probably will, lose money
- You are responsible for your own trades

The bot is intentionally built with multiple safety latches and degraded-mode handling to reduce the odds of doing something stupid at full speed.

Also, I am not responsible for your gam-gam's 401k, so maybe keep this away from it.

---

## Current Project Direction

The project currently has two overlapping layers:

### 1. Execution and Safety Layer
This is the original HeliEx-centered bot foundation.

It already includes:
- private API access
- order placement and cancellation proof
- reconciliation helpers
- dry-run execution
- strategy and veto hooks
- runtime safety controls
- outage and degraded-mode handling

### 2. Multi-Venue Market Intelligence Layer
This is the current active roadmap focus.

It is intended to:
- normalize assets and markets across venues
- ingest public market data from multiple exchanges
- build a graph of cross-venue trade paths
- discover viable route candidates
- support later slippage-aware simulation and execution decisions

In plain terms: the project is moving from **"can this bot trade safely?"** toward **"can this system understand markets across multiple venues before it trades at all?"**

---

## Design Philosophy

This project is built around a few core rules:

- Never trade blindly
- Fail safely
- Make degraded states explicit
- Test pieces in isolation before connecting them
- Prefer refusing a bad trade over forcing activity
- Keep the system observable through logs, snapshots, and structured output

---

## Current Venue State

Based on the working roadmap in `docs/roadmap.md`:

- **HeliEx**: unstable
- **Coinbase**: working
- **Robinhood**: deferred due to API issues
- **SafeTrade**: blocked by Cloudflare issues
- **AltQuick**: working
- **BTCPOP**: investigate as possible replacement data venue

The bot is being shaped to tolerate partial venue failure and continue operating in a degraded but visible state where possible.

---

## Current Active Roadmap

### Phase 0.5: Venue Adapter and Market Graph Foundation
**Status: active**

Current foundation work includes:
- canonical asset model
- canonical market model
- venue adapter interface
- public market data integration
- symbol normalization
- degraded venue handling
- market graph builder
- route candidate discovery
- route validation with target assets
- GRC/CURE venue coverage

This is the current center of gravity for the project.

### Phase 0.6
Planned near-term expansion:
- FreiExchange public adapter
- FreiExchange ticker and order book integration
- expanded route graph and comparison
- HeliEx liquidity validation proof when venue is healthy
- slippage-aware simulation for order-book venues

### Deferred Work
- SafeTrade anti-bot workaround
- Robinhood auth integration
- BTCPOP private/public integration when access is granted

---

## HeliEx Execution Track Status

The original execution-focused work is still important and remains part of the project.

### Phase 1: Private Read Access
**Status: complete enough**

- balances
- orders
- auth/signing

Optional later:
- own trade history endpoint
- normalized fills/trade history
- fee discovery
- deposit/withdraw capability discovery

### Phase 2: Smallest Possible Write Action
**Status: complete**

- tiny limit order placed
- visible in exchange state
- cancelled cleanly
- terminal state confirmed

### Phase 3: Reconciliation and Safety
**Status: strong**

- dry-run execution
- strategy split
- private veto layer
- reconciliation helpers
- reconciliation harness
- strategy harness
- spend cap
- stale trade rejection
- partial fill protection
- preflight output
- shared runtime config
- triple live latch

### Phase 3.5: Degraded-Mode / Outage Handling
**Status: complete first pass**

- normalize Cloudflare tunnel failures
- concise outage handling in execution
- concise outage handling in readiness

Planned expansion:
- rate-limit normalization
- auth failure normalization
- malformed response normalization
- market unavailable normalization

### Phase 4: Supervised Live Micro-Trade
**Status: ready to execute**

- venue-scoped live test mode
- single-cycle only
- no loop
- no retries
- forced cancel after timeout
- `maxConcurrentOrders = 1`

Add before first live run:
- entry geometry output
- timed cancel logic
- TEST MODE banner

### Phase 4.5: Live Validation and Telemetry
**Status: immediately after first live test**

- execution outcome classification
- placement latency tracking
- cancel latency tracking
- order lifecycle timeline
- exchange echo verification
- explicit LIVE TEST MODE output

---

## Architecture Overview

### Market Layer
- venue adapters fetch public market data
- normalized asset and market models provide a shared internal shape
- market scanner gathers per-venue snapshots
- degraded venues are surfaced explicitly rather than silently ignored

### Graph and Route Layer
- market relationships are converted into graph edges
- route candidates can be explored across quote and bridge assets
- route validation can later reject weak or irrelevant paths

### Strategy Layer
- base strategy logic
- private strategy overrides
- score vetoes and execution desirability checks
- future venue-local and cross-venue route intelligence

### Execution Layer
- execution planning
- order submission and cancellation
- supervised live testing
- explicit safety latches before any live trade path is allowed

### Reconciliation Layer
- order state interpretation
- partial-fill awareness
- lifecycle verification against exchange state

### Interface and Tooling Layer
- CLI entrypoints
- structured JSON output
- machine-readable event streams
- future GUI and Python bridge support

---

## Available Scripts

### Market and Route Scanning
- `npm run scan:markets`
  - scan and normalize market data across currently supported venues

### Execution and Safety
- `npm run run:execution`
  - simulate a full execution cycle without placing live orders
- `npm run live:readiness`
  - perform readiness checks for supervised live execution
- `npm run test:private`
  - verify private API access such as balances and orders
- `npm run test:trade`
  - place and cancel a very small test order
- `npm run test:execution`
  - exercise execution logic in a controlled test path
- `npm run test:reconciliation`
  - validate order state classification and reconciliation logic
- `npm run test:strategy`
  - test decision logic against controlled scenarios

### Analysis
- `npm run analyze`
  - analyze logged market and signal behavior

---

## Safety Features

The bot will only place live trades if all required safety conditions are satisfied.

Current protections include:
- dry-run separation
- trading enable latch
- live confirmation latch
- spend caps
- stale trade rejection
- partial-fill protection
- strategy veto layer
- readiness checks before trading
- degraded venue detection
- concise outage handling

The project is intentionally biased toward doing nothing rather than doing something reckless.

---

## Setup

### Install dependencies

`npm install`

### Create a `.env` file

`HELIX_API_KEY=your_key`

`HELIX_API_SECRET=your_secret`

`TRADING_ENABLED=false`

`LIVE_CONFIRMATION=false`

Add any additional venue credentials only when that venue is actually being integrated.

---

## Near-Term Future Projection

Near-term development is expected to focus on:

- finishing the market graph builder
- improving route candidate discovery
- expanding venue coverage for GRC and CURE pairs
- adding FreiExchange as another public data venue
- comparing cross-venue route quality
- validating HeliEx liquidity only when the venue is healthy
- building slippage-aware simulation for order-book venues

After that, the project can more confidently decide whether a route is merely interesting, actually tradable, or worth supervised execution.

---

## Longer-Term Direction

Potential later additions include:

- richer route viability scoring
- venue-local strategy modes
- cross-venue implied price analysis
- persistent operator tooling
- looped readiness and scanner services
- service supervision and alerting
- Python-based analysis tools
- GUI or bridge layer for operator control

---

## Documentation

The working roadmap lives here:

- `docs/roadmap.md`

If the README and the roadmap ever disagree, the roadmap should be treated as the more current planning document.

---

## Author

Eric S. Hamilton  
OffDutyTaoist

Built as a learning project, a systems experiment, and a cautious step toward supervised algorithmic trading.