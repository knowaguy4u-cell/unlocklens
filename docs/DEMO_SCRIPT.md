# UnlockLens — Demo Script (3 minutes, judge interview / video)

## Setup (before recording)
1. `cd unlocklens/app && npm run dev` → open http://localhost:5173
2. Have `data/verified_snapshot.json` fresh: `node scripts/verify_streamflow.mjs`
3. Quiet room; screen-capture at 1080p.

## Beat 1 — The hook (0:00–0:30)
> "Streamflow builds vesting infrastructure on Solana. Last month they
> burned 700 million tokens — a serious trust move. But their own unlock
> chart still promises 339 million tokens against a 300 million supply.
> A vesting company's numbers should be checkable. So I built the checker."

Show: Case File tab, scroll the five finding cards.

## Beat 2 — The anomalies (0:30–1:15)
Click through, narrating each:
- **Chart vs supply bar:** "The chart's last point is bigger than the entire
  token supply. The chart was never rebased after the burn."
- **Pie bars:** "Locked 38%, unlocked 62% — but the two biggest locked
  buckets, Investors and Contributors, link to zero vesting contracts."
- **~40.3M card:** "62% unlocked minus 48.5% circulating — forty million
  tokens unlocked and unaccounted for, on the company's own numbers."

## Beat 3 — Live proof (1:15–2:00)
Switch to **Live Verification** tab. Click "Verify on-chain now."
> "This isn't a screenshot. It's reading the mint account from mainnet
> right now — supply 299,999,952, mint authority null, freeze authority
> null. The burn is real, and it takes one RPC call to prove it. That is
> the standard I want unlock schedules held to."

Wait for the CLAIM CONFIRMED badge. Point at the slot number — "fresh from
the chain, seconds ago."

## Beat 4 — The fix (2:00–2:45)
Switch to **Registry** tab.
> "UnlockLens is an Anchor program — one on-chain account per vesting
> schedule: who gets what, the cliff, the end date, and a released counter
> that can only move up. Anyone can register a schedule; only the declared
> authority can report releases. Had Streamflow's buckets lived here, the
> missing contract IDs wouldn't be missing — they'd be PDAs."

Show the instruction table. Note the honest label: "illustrative until
deployed."

## Beat 5 — Close (2:45–3:00)
Switch to **Methodology** tab.
> "Every claim on this page shows its method — including the negative
> results. UnlockLens doesn't ask you to trust token teams. It asks the
> chain, and shows its work. That's the whole product."

End on the tagline: "Verified on-chain, not on trust."

## If a judge asks…
- *"Is the program deployed?"* — "Not yet — it's `cargo check`/`cargo test`
  verified, placeholder program ID, deploys with `anchor deploy` once a
  keypair is generated. The dashboard's live RPC verification runs against
  mainnet today."
- *"Why Streamflow?"* — "They're the perfect exhibit: a vesting company
  with a real burn and real gaps. The tool is chain-agnostic to any SPL
  token."
- *"What breaks?"* — "If public RPC is down, the verify tab says so
  instead of faking it. The registry needs a deploy to go live — that's
  the one remaining step, and it's mechanical."
