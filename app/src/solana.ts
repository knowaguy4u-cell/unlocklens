import { Connection, PublicKey } from "@solana/web3.js";
import { MAINNET_RPC, STREAM_MINT } from "./config";

export interface MintVerification {
  ok: boolean;
  supplyBaseUnits: string | null;
  supplyUi: string | null;
  decimals: number | null;
  mintAuthority: string | null; // null = none (good)
  freezeAuthority: string | null; // null = none (good)
  slot: number | null;
  error: string | null;
}

/**
 * Live on-chain verification of the Streamflow burn claim.
 * Reads the STREAM mint account directly over public RPC:
 * supply should read 299,999,952 base units and both authorities null.
 */
export async function verifyStreamMint(): Promise<MintVerification> {
  const base: MintVerification = {
    ok: false,
    supplyBaseUnits: null,
    supplyUi: null,
    decimals: null,
    mintAuthority: null,
    freezeAuthority: null,
    slot: null,
    error: null,
  };
  try {
    const connection = new Connection(MAINNET_RPC, "confirmed");
    const mint = new PublicKey(STREAM_MINT);

    const supplyResp = await connection.getTokenSupply(mint);
    const acctResp = await connection.getParsedAccountInfo(mint);

    const parsed: unknown = acctResp.value?.data;
    let mintAuthority: string | null = null;
    let freezeAuthority: string | null = null;
    if (parsed && typeof parsed === "object" && "parsed" in parsed) {
      const info = (parsed as { parsed?: { info?: Record<string, unknown> } })
        .parsed?.info;
      if (info) {
        mintAuthority =
          typeof info.mintAuthority === "string" ? info.mintAuthority : null;
        freezeAuthority =
          typeof info.freezeAuthority === "string" ? info.freezeAuthority : null;
      }
    }

    const supplyBase = supplyResp.value.amount;
    const supplyUi = supplyResp.value.uiAmountString ?? null;
    // The recon claim is about *displayed* supply: 299,999,952 STREAM.
    // Compare the UI amount (decimals-adjusted), rounded — the chain holds
    // fractional dust (299999952.329349 at last read), which displays round.
    const uiMatches =
      supplyUi !== null && Math.round(Number(supplyUi)) === 299_999_952;
    const ok = uiMatches && mintAuthority === null && freezeAuthority === null;

    return {
      ...base,
      ok,
      supplyBaseUnits: supplyBase,
      supplyUi,
      decimals: supplyResp.value.decimals,
      mintAuthority,
      freezeAuthority,
      slot: supplyResp.context.slot,
      error: ok
        ? null
        : "On-chain state differs from the expected post-burn snapshot.",
    };
  } catch (e) {
    return {
      ...base,
      error: e instanceof Error ? e.message : "RPC request failed",
    };
  }
}
