/**
 * verify_streamflow.mjs — independent on-chain check of the Streamflow case.
 *
 * Reads the STREAM mint account over public mainnet RPC and writes a
 * timestamped snapshot to data/verified_snapshot.json. No keypair, no
 * account, no spend — pure reads.
 *
 * Run: node scripts/verify_streamflow.mjs
 */
import { Connection, PublicKey } from "@solana/web3.js";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RPC = "https://api.mainnet-beta.solana.com";
const STREAM_MINT = "STREAMribRwybYpMmSYoCsQUdr6MZNXEqHgm7p1gu9M";

const EXPECTED = {
  supplyUi: 299_999_952,
  mintAuthority: null,
  freezeAuthority: null,
};

async function main() {
  const connection = new Connection(RPC, "confirmed");
  const mint = new PublicKey(STREAM_MINT);

  const supplyResp = await connection.getTokenSupply(mint);
  const acctResp = await connection.getParsedAccountInfo(mint);

  const parsed = acctResp.value?.data;
  let mintAuthority = "unparsed";
  let freezeAuthority = "unparsed";
  if (parsed && typeof parsed === "object" && "parsed" in parsed) {
    const info = parsed.parsed?.info ?? {};
    mintAuthority = info.mintAuthority ?? null;
    freezeAuthority = info.freezeAuthority ?? null;
  }

  const supplyUi = supplyResp.value.uiAmountString;
  // Recon claim is about *displayed* supply: 299,999,952 STREAM. The chain
  // holds fractional dust (299999952.329349 at last read) — compare rounded.
  const checks = {
    supply_matches:
      supplyUi !== null && Math.round(Number(supplyUi)) === EXPECTED.supplyUi,
    mint_authority_null: mintAuthority === null,
    freeze_authority_null: freezeAuthority === null,
  };

  const snapshot = {
    verified_at: new Date().toISOString(),
    rpc: RPC,
    mint: STREAM_MINT,
    slot: supplyResp.context.slot,
    supply: {
      base_units: supplyResp.value.amount,
      ui: supplyUi,
      decimals: supplyResp.value.decimals,
      expected_ui: String(EXPECTED.supplyUi),
    },
    authorities: { mintAuthority, freezeAuthority },
    checks,
    all_pass: Object.values(checks).every(Boolean),
  };

  mkdirSync(join(ROOT, "data"), { recursive: true });
  const out = join(ROOT, "data", "verified_snapshot.json");
  writeFileSync(out, JSON.stringify(snapshot, null, 2) + "\n");
  console.log(JSON.stringify(snapshot, null, 2));
  console.log(`\nWrote ${out} — all_pass=${snapshot.all_pass}`);
  if (!snapshot.all_pass) process.exit(2);
}

main().catch((e) => {
  console.error("verification failed:", e?.message ?? e);
  process.exit(1);
});
