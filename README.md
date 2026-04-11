# HeliEx Tradebot
A TypeScript-based experimental trading bot for the HeliEx exchange.
This project focuses on building a **safe, testable, and observable trading system** before attempting any real automated trading.
---
## Disclaimer

This is an experimental project.
- Not financial advice
- Not production-ready
- You can (and probably will) lose money
- You are responsible for your own trades
The bot is intentionally designed with multiple safety layers to prevent accidental live execution.
Also, I am not responsible for your gam-gam's 401k, so maybe keep this away from it.
---
## Project Goals
- Build a **modular trading bot architecture**
- Emphasize **safety, observability, and testing**
- Separate:
  - market data
  - signal generation
  - strategy logic
  - execution logic
- Support **dry-run simulation before live trading**
- Handle **exchange outages and degraded states gracefully**
---
## Design Philosophy
This bot is built around a few core principles:
- **Never trade blindly**
- **Fail safely**
- **Test everything in isolation**
- **Make state visible** through logs, snapshots, and signals
- **Refuse bad trades instead of forcing action**
---
## Architecture Overview
### Core Components
- **Market Layer**
  - Fetches order book and trades
  - Builds normalized `MarketSnapshot`
- **Signal Layer (`signals.ts`)**
  - Evaluates whether market conditions are tradable
  - Produces:
    - `state` such as `candidate`, `illiquid`, or `too_tight`
    - `score`
    - `reasons`
- **Strategy Layer**
  - `BaseStrategy`: generic logic
  - `PrivateStrategy`: user-defined overrides and risk controls
- **Execution Layer**
  - Builds an `ExecutionPlan`
  - Handles:
    - placing orders
    - replacing stale orders
    - respecting cooldowns
    - enforcing caps
- **Reconciliation Layer**
  - Interprets exchange order states
  - Distinguishes between:
    - open
    - partial
    - cancelled
- **Runtime Config**
  - Centralized safety controls for:
    - dry-run mode
    - trading enabled
    - live confirmation
    - max order size
---
## Safety Features
The bot will only place live trades if **all conditions are met**:
- `dryRun = false`
- `TRADING_ENABLED=true`
- `LIVE_CONFIRMATION=true`
Additional protections include:
- Max GRC per order cap
- Cooldown between actions
- Partial-fill protection
- Strategy veto layer
- Readiness checks before trading
- Exchange outage detection
---

## Testing Tools
### Dry Run Execution

`npm run run:execution`

Simulates a full trading cycle without placing orders.

### Live Readiness Check

`npm run live:readiness`

Outputs:
    • PASS/FAIL checks 
    • Whether the bot is safe to trade 
    • Final verdict: LIVE READY: yes/no 
    
### Strategy Testing

`npm run test:strategy`

Tests decision logic against mock scenarios.

### Reconciliation Testing

`npm run test:reconciliation`

Validates order state classification.

### Private API Test

`npm run test:private`

Verifies balances and order access.

### Trade Flow Test

`npm run test:trade`

Places and cancels a small test order.

## Logging and Analysis

Market and signal data can be logged to JSONL.

### Analysis Tool

`npm run analyze`

Provides:

    • average spread 
    • signal distribution 
    • score statistics 
    • candidate frequency 

### Exchange Behavior Handling

The bot detects and handles exchange outages, including:

    • Cloudflare tunnel failures 
    • HTTP 530 errors 
    • HTML error responses instead of JSON 
    
In these cases:

    • Execution aborts cleanly 
    • Readiness returns LIVE READY: no 
    • No trading actions are attempted 

## Roadmap

### Phase 1: Private Read Access ✅
    • balances 
    • orders 
    • authentication 
### Phase 2: Minimal Trade Proof ✅
    • place tiny limit order 
    • confirm it appears 
    • cancel it 
### Phase 3: Reconciliation and Safety ✅
    • signal evaluation 
    • strategy testing 
    • execution planning 
    • safety gates 
### Phase 3.5: Outage Handling ✅
    • exchange availability detection 
    • graceful failure modes 
### Phase 4: Supervised Live Trading 🔜
    • single-cycle manual execution 
    • extremely small orders 
    • operator verification 
### Phase 5: Strategy Refinement
    • adapt to real market conditions 
    • improve scoring logic 
    • private strategy development 
### Phase 6: Automation and Tooling
    • looped execution 
    • alerting 
    • monitoring 
    • long-term state tracking 

Setup

### Install dependencies:

`npm install`

### Create a .env file:

`HELIX_API_KEY=your_key
HELIX_API_SECRET=your_secret
TRADING_ENABLED=false
LIVE_CONFIRMATION=false`

## Usage Philosophy

### This bot is not designed to:

    • chase trades 
    • force activity 
    • maximize short-term profit 
    
### It is designed to:

    • observe 
    • evaluate 
    • act only when conditions are acceptable 

## Future Direction

### Potential future additions:

    • Python-based analysis tools 
    • backtesting engine 
    • statistical signal tuning 
    • improved liquidity modeling 
    • multi-order strategies 

### Author

Eric S. Hamilton

Built as a learning and experimental project.
