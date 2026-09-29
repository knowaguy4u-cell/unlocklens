/**
 * The Streamflow case file — every number below was verified against
 * on-chain state and streamflow.foundation during recon on 2026-09-28.
 * Sources: burn tx 4rbViHbm…hchZNv (23 Sep 2026), mint account read,
 * foundation unlock chart + pie snapshot. See /data/streamflow_case.json
 * for the machine-readable version and docs/ARCHITECTURE.md for method.
 */

export interface CaseMetric {
  label: string;
  value: string;
  detail: string;
  flag: "verified" | "anomaly" | "missing";
}

export const STREAM_CASE: CaseMetric[] = [
  {
    label: "The burn",
    value: "699,994,595 STREAM",
    detail:
      "Burned 23 Sep 2026 (tx 4rbViHbm…hchZNv). Post-burn mint supply reads 299,999,952.33 (displays as 299,999,952) with mint authority and freeze authority both null — the 300M cap is enforced by the token program itself, not by a promise.",
    flag: "verified",
  },
  {
    label: "Unlock chart vs supply",
    value: "339,864,227 claimed > 300,000,000 supply",
    detail:
      'The foundation unlock chart was never rebased after the burn. Under the "Total Supply: 300M" header, the last chart point (Dec 2027) reads 339,864,227 — more tokens than the entire post-burn supply — and the y-axis still runs to 350M.',
    flag: "anomaly",
  },
  {
    label: "Chart vs pie, right now",
    value: "237,417,698 vs ~185.9M",
    detail:
      'The chart\'s "Now" point shows 237,417,698 unlocked while the pie next to it says 61.96% unlocked (~185.9M). Two widgets, two different stories, same page.',
    flag: "anomaly",
  },
  {
    label: "Unlocked, not circulating",
    value: "~40.3M STREAM unexplained",
    detail:
      "61.98% unlocked minus 48.55% in circulation = 13.43% of supply (~40.3M STREAM) that is unlocked but not circulating. The site never says where those tokens sit.",
    flag: "anomaly",
  },
  {
    label: "Vesting contract IDs",
    value: "Not published",
    detail:
      "For a team whose product is verifiable vesting, the site links no vesting contract IDs behind the Investors 27.07% / Contributors 10.69% buckets. Ironic gap, easy fix — and exactly what the UnlockLens registry is built to hold.",
    flag: "missing",
  },
];

export interface PieSlice {
  bucket: string;
  pct: number;
  group: "unlocked" | "locked";
}

/** Foundation pie snapshot, 2026-09-28. Percentages of 300M supply.
 *  Locked: 27.07 + 10.69 + 0.16 + 0.10 = 38.02.
 *  Unlocked: 48.55 + 12.63 + 0.80 (residual) = 61.98. */
export const PIE: PieSlice[] = [
  { bucket: "Circulation", pct: 48.55, group: "unlocked" },
  { bucket: "Staking", pct: 12.63, group: "unlocked" },
  { bucket: "Other unlocked", pct: 0.8, group: "unlocked" },
  { bucket: "Investors", pct: 27.07, group: "locked" },
  { bucket: "Contributors", pct: 10.69, group: "locked" },
  { bucket: "Other", pct: 0.16, group: "locked" },
  { bucket: "Airdrops", pct: 0.1, group: "locked" },
];
