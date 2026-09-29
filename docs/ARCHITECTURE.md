# UnlockLens — Architecture

**One-liner:** an on-chain vesting-schedule registry plus a dashboard that
verifies token unlock claims against Solana itself — because a vesting
company's unlock chart should be as checkable as its burn transaction.

## The problem (with receipts)

Streamflow ($STREAM) burned ~700M tokens in September 2026 — verifiable in
one RPC call (supply 299,999,952, mint + freeze authority null). But the
unlock chart on their foundation site was never rebased: it still promises
339,864,227 tokens against a 300M supply, disagrees with the pie next to it
(237.4M vs ~185.9M "now"), leaves ~40.3M unlocked-but-not-circulating
unexplained, and publishes no vesting contract IDs for the two largest
locked buckets (Investors 27.07%, Contributors 10.69%). Manual recon caught
this in hours; it will rot the moment the page updates. UnlockLens makes
the schedule itself on-chain and the checking automatic.

## Components

```
┌─────────────────────┐      RPC (reads)      ┌──────────────────────┐
│  vesting-registry   │◄──────────────────────│  UnlockLens dashboard │
│  Anchor program     │   getAccountInfo /    │  Vite + React + TS    │
│  3 instructions     │   getTokenSupply      │  4 tabs               │
│  PDA per schedule   │                       │                       │
└─────────────────────┘                       └──────────────────────┘
        ▲                                                  │
        │ register / update_released                       │ case data:
        │ (signed txs, authority-gated)                    │ data/streamflow_case.json
        │                                                  │ (verified 2026-09-28)
   teams / auditors                              verified_snapshot.json
                                                 (fresh RPC read)
```

### 1. `programs/vesting-registry` (Anchor, Rust)

One account type, three instructions:

| Instruction | Auth | Effect |
|---|---|---|
| `register_schedule` | anyone (permissionless) | Creates PDA `["vesting-schedule", mint, beneficiary]`; caller becomes reporting authority |
| `update_released` | authority only | Moves `released_amount` up — never down, never past `total_amount`; emits `ReleaseUpdated` |
| `close_schedule` | authority only | Retires the schedule, reclaims rent |

Validation lives in `src/validation.rs` — pure functions with unit tests
(`cargo test`, no validator needed): category range, non-zero total,
`start <= cliff < end`, monotonic capped releases, plus the linear-unlock
math the dashboard uses. Program ID in `lib.rs` is a documented
placeholder, replaced at deploy.

### 2. `app/` — dashboard (Vite + React + TypeScript)

Four tabs, zero backend:

- **Case File** — the Streamflow findings as cards, bar charts (chart claim
  vs supply; foundation pie), every figure sourced.
- **Live Verification** — one button reads the STREAM mint over public
  mainnet RPC and checks supply = 299,999,952, mint authority null, freeze
  authority null. This is the burn proof, re-runnable by any judge.
- **Registry** — the program's instruction set and what Streamflow's two
  largest buckets would look like registered (clearly labeled illustrative
  until the program deploys and real PDAs exist).
- **Methodology** — the five-step verification method, including the
  negative result (no contract IDs found — absence is the finding).

### 3. `data/` + `scripts/`

- `streamflow_case.json` — machine-readable case file (claims, pie
  snapshot, anomalies, missing data).
- `scripts/verify_streamflow.mjs` — standalone Node script performing the
  same mint read as the dashboard; writes `data/verified_snapshot.json`.
  Run any time to refresh the evidence.

## Why this is Solana-native (not web2 + wallet button)

1. The registry is a real Anchor program — schedules are PDAs, reads need
   no API key, writes are signature-gated by the program, events are
   indexable.
2. The dashboard's core verification is direct RPC reads
   (`getTokenSupply`, `getParsedAccountInfo`) — the same calls any auditor
   would make, embedded in the product.
3. The demo-able proof (burn verification) executes against mainnet-beta
   live during the pitch.

## Trust boundaries (honest)

- The program is `cargo check`/`cargo test` verified; BPF build + devnet
  deploy need the Solana toolchain on the deploy machine (documented in
  README).
- Registry tab shows illustrative schedules until a real program ID ships —
  labeled as such, never presented as on-chain.
- Dashboard RPC reads depend on public mainnet RPC availability; the UI
  degrades to an explicit error state, never a silent fake.
