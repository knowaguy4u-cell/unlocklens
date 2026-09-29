# UnlockLens

**Token unlock transparency for Solana — verified on-chain, not on trust.**

An Anchor program (`vesting-registry`) that stores vesting schedules as
on-chain PDAs, plus a dashboard that verifies token unlock claims against
Solana itself. Ships with a full case file on Streamflow ($STREAM): a real
700M-token burn whose unlock chart was never rebased.

Built for the Colosseum Crypto World's Fair 2026, Solana track.
**Staged locally — not submitted, not pushed.**

## Quick start (all commands verified on this machine)

### Dashboard

```bash
cd app
npm install
npm run dev      # → http://localhost:5173
```

Production build (verified PASS):

```bash
npm run build    # tsc --noEmit && vite build → app/dist/
npm run preview  # serves dist/ on :4173 — verified HTTP 200
```

### Live on-chain verification (no keypair, no spend — pure RPC reads)

```bash
node scripts/verify_streamflow.mjs
# reads the STREAM mint over public mainnet RPC,
# writes data/verified_snapshot.json — verified 3/3 checks PASS
```

### Anchor program

```bash
# needs Rust (rustup). BPF deploy needs the Solana toolchain.
cargo test   # unit tests for validation logic — no validator needed
cargo check  # type-check the program
```

Program ID in `programs/vesting-registry/src/lib.rs` is a documented
placeholder (`11111111111111111111111111111111`) — generate a keypair and
replace it at deploy, then update `app/src/config.ts` with the same
address.

## Repo map

```
unlocklens/
├── programs/vesting-registry/  # Anchor program
│   └── src/
│       ├── lib.rs               # register_schedule / update_released / close_schedule
│       └── validation.rs        # pure validation logic + unit tests
├── app/src/
│   ├── App.tsx                  # 4-tab dashboard
│   ├── solana.ts                # live mint verification (getTokenSupply, getParsedAccountInfo)
│   ├── caseData.ts              # Streamflow findings (sourced)
│   └── config.ts                # program ID placeholder, mint, RPC
├── data/
│   ├── streamflow_case.json     # machine-readable case file
│   └── verified_snapshot.json   # fresh RPC read (regenerate any time)
├── scripts/verify_streamflow.mjs
├── docs/ARCHITECTURE.md
├── docs/DEMO_SCRIPT.md          # 3-minute judge demo, beat by beat
└── video/
    ├── narration_script.txt
    ├── scenes/                  # 4 generated scenes
    ├── audio/                   # 4 TTS segments
    └── unlocklens_pitch.mp4     # final pitch video (~63s)
```

## The Streamflow case (exhibit A)

| Finding | Status |
|---|---|
| 700M STREAM burned Sep 2026 (tx 4rbViHbm…hchZNv) | Verified on-chain |
| Post-burn supply 299,999,952.33, mint + freeze authority null | Verified live via RPC |
| Unlock chart not rebased: 339.86M claimed vs 300M supply | Anomaly |
| Chart "now" 237.4M vs pie 61.96% (~185.9M) | Anomaly |
| ~40.3M unlocked-but-not-circulating unexplained | Anomaly |
| Vesting contract IDs for Investors 27.07% / Contributors 10.69% | Missing — the gap this registry closes |

One correction made mid-build and documented, not hidden: the recon
figure "supply 299,999,952" is the displayed/rounded value; the chain
holds 299,999,952.33. The verification checks the rounded figure and
shows the exact one.

## Trust boundaries

- Registry tab shows *illustrative* schedules until the program deploys —
  labeled as such, never presented as on-chain.
- If public RPC is unreachable, the verify tab shows an explicit error,
  never a silent fake.
- $0 spent, no accounts created, nothing pushed or published.
