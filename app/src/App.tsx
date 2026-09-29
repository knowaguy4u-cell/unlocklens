import { useState } from "react";
import "./styles.css";
import { PIE, STREAM_CASE } from "./caseData";
import { PROGRAM_ID_PLACEHOLDER, STREAM_MINT } from "./config";
import { verifyStreamMint, type MintVerification } from "./solana";

type Tab = "case" | "verify" | "registry" | "method";

const TABS: { id: Tab; label: string }[] = [
  { id: "case", label: "Case File" },
  { id: "verify", label: "Live Verification" },
  { id: "registry", label: "Registry" },
  { id: "method", label: "Methodology" },
];

function FlagBadge({ flag }: { flag: "verified" | "anomaly" | "missing" }) {
  const text =
    flag === "verified" ? "VERIFIED ON-CHAIN" : flag === "anomaly" ? "ANOMALY" : "MISSING DATA";
  return <span className={`badge badge-${flag}`}>{text}</span>;
}

function CaseFile() {
  const maxPie = Math.max(...PIE.map((s) => s.pct));
  return (
    <section>
      <div className="hero">
        <h2>Streamflow ($STREAM) — the unlock story vs the chain</h2>
        <p>
          Streamflow builds vesting infrastructure on Solana. In September 2026
          the team burned ~700M STREAM — a serious trust move. But their
          foundation unlock chart was never rebased after the burn, and key
          vesting details were never published. Every number below was checked
          against on-chain state on 2026-09-28.
        </p>
        <p className="mint-line">
          Mint: <code>{STREAM_MINT}</code>
        </p>
      </div>

      <div className="cards">
        {STREAM_CASE.map((m) => (
          <article className="card" key={m.label}>
            <div className="card-head">
              <h3>{m.label}</h3>
              <FlagBadge flag={m.flag} />
            </div>
            <p className="card-value">{m.value}</p>
            <p className="card-detail">{m.detail}</p>
          </article>
        ))}
      </div>

      <div className="panel">
        <h3>Chart claim vs on-chain supply</h3>
        <p className="muted">
          The foundation chart's final point (Dec 2027) against the actual
          post-burn supply enforced by the mint account.
        </p>
        <div className="bar-row">
          <span className="bar-label">Chart: 339.86M</span>
          <div className="bar-track">
            <div className="bar bar-bad" style={{ width: "100%" }} />
          </div>
        </div>
        <div className="bar-row">
          <span className="bar-label">Supply: 300.00M</span>
          <div className="bar-track">
            <div className="bar bar-good" style={{ width: `${(300 / 339.864227) * 100}%` }} />
          </div>
        </div>
        <p className="muted small">
          A chart that promises more tokens than exist is not a rounding error —
          it is a data pipeline that never got rebased.
        </p>
      </div>

      <div className="panel">
        <h3>Foundation pie snapshot (percent of 300M supply)</h3>
        {PIE.map((s) => (
          <div className="bar-row" key={s.bucket}>
            <span className="bar-label">
              {s.bucket} · {s.pct}%
            </span>
            <div className="bar-track">
              <div
                className={`bar ${s.group === "locked" ? "bar-locked" : "bar-unlocked"}`}
                style={{ width: `${(s.pct / maxPie) * 100}%` }}
              />
            </div>
          </div>
        ))}
        <p className="muted small">
          Locked 38.02% · Unlocked 61.98%. The two largest locked buckets —
          Investors 27.07% and Contributors 10.69% — have no published vesting
          contract IDs.
        </p>
      </div>
    </section>
  );
}

function LiveVerification() {
  const [state, setState] = useState<
    "idle" | "loading" | "done"
  >("idle");
  const [result, setResult] = useState<MintVerification | null>(null);

  async function run() {
    setState("loading");
    const r = await verifyStreamMint();
    setResult(r);
    setState("done");
  }

  return (
    <section>
      <div className="panel">
        <h3>Verify the burn claim yourself — live, over RPC</h3>
        <p className="muted">
          This button reads the STREAM mint account directly from Solana
          mainnet-beta (public RPC, no key, no backend). It checks three
          things: displayed supply rounds to 299,999,952 (exact on-chain
          figure: 299,999,952.33 — fractional dust below display precision),
          mint authority is null, freeze authority is null.
        </p>
        <button className="btn" onClick={run} disabled={state === "loading"}>
          {state === "loading" ? "Querying mainnet…" : "Verify on-chain now"}
        </button>

        {state === "done" && result && (
          <div className="verify-result">
            {result.error ? (
              <p className="error">Could not verify: {result.error}</p>
            ) : (
              <>
                <div className="verify-head">
                  <span
                    className={`badge ${result.ok ? "badge-verified" : "badge-anomaly"}`}
                  >
                    {result.ok ? "CLAIM CONFIRMED" : "MISMATCH DETECTED"}
                  </span>
                  <span className="muted small">slot {result.slot}</span>
                </div>
                <table className="kv">
                  <tbody>
                    <tr>
                      <td>Displayed supply</td>
                      <td>
                        <code>{result.supplyUi}</code> (rounds to 299999952)
                      </td>
                    </tr>
                    <tr>
                      <td>Base units</td>
                      <td>
                        <code>{result.supplyBaseUnits}</code> · {result.decimals}{" "}
                        decimals
                      </td>
                    </tr>
                    <tr>
                      <td>Mint authority</td>
                      <td>
                        <code>{result.mintAuthority ?? "null ✓"}</code>
                      </td>
                    </tr>
                    <tr>
                      <td>Freeze authority</td>
                      <td>
                        <code>{result.freezeAuthority ?? "null ✓"}</code>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}
      </div>
      <div className="panel">
        <h3>Why this matters</h3>
        <p className="muted">
          Null authorities mean the 300M cap is enforced by the SPL Token
          program itself — nobody can mint more, nobody can freeze your
          tokens. That is the strongest possible version of the burn claim,
          and it takes one RPC call to check. UnlockLens exists so the{" "}
          <em>unlock schedule</em> gets the same treatment: published
          on-chain, readable by anyone, no trust required.
        </p>
      </div>
    </section>
  );
}

interface DemoSchedule {
  beneficiary: string;
  category: string;
  total: string;
  released: string;
  cliff: string;
  end: string;
}

const DEMO_SCHEDULES: DemoSchedule[] = [
  {
    beneficiary: "Investors bucket",
    category: "Investors",
    total: "81,210,000 STREAM",
    released: "—",
    cliff: "—",
    end: "Dec 2027 (per foundation chart)",
  },
  {
    beneficiary: "Contributors bucket",
    category: "Contributors",
    total: "32,070,000 STREAM",
    released: "—",
    cliff: "—",
    end: "Dec 2027 (per foundation chart)",
  },
];

function Registry() {
  return (
    <section>
      <div className="panel">
        <h3>On-chain vesting registry</h3>
        <p className="muted">
          The <code>vesting-registry</code> Anchor program stores one PDA per
          (mint, beneficiary): category, total, released, cliff, end, and the
          authority allowed to report releases. Releases are monotonic and
          capped — the program rejects any update that moves the counter down
          or past the registered total. Anyone can register; only the
          authority can update.
        </p>
        <p className="muted small">
          Program ID: <code>{PROGRAM_ID_PLACEHOLDER}</code> (placeholder —
          replaced at deploy; the Registry tab runs in demo mode until then).
        </p>
      </div>

      <div className="panel">
        <div className="card-head">
          <h3>What Streamflow's buckets would look like, registered</h3>
          <span className="badge badge-missing">ILLUSTRATIVE — NOT ON-CHAIN</span>
        </div>
        <p className="muted small">
          Reconstructed from the foundation pie chart (27.07% / 10.69% of 300M).
          Release counters, cliffs and contract IDs are unpublished — that is
          precisely the gap this registry closes.
        </p>
        <table className="kv wide">
          <thead>
            <tr>
              <th>Beneficiary</th>
              <th>Category</th>
              <th>Total</th>
              <th>Released</th>
              <th>Schedule</th>
            </tr>
          </thead>
          <tbody>
            {DEMO_SCHEDULES.map((s) => (
              <tr key={s.beneficiary}>
                <td>{s.beneficiary}</td>
                <td>{s.category}</td>
                <td>{s.total}</td>
                <td>{s.released}</td>
                <td>
                  {s.cliff} → {s.end}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h3>Program instructions</h3>
        <table className="kv wide">
          <thead>
            <tr>
              <th>Instruction</th>
              <th>Who</th>
              <th>What it does</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>register_schedule</code>
              </td>
              <td>Anyone</td>
              <td>
                Creates the PDA <code>["vesting-schedule", mint, beneficiary]</code>;
                caller becomes the reporting authority.
              </td>
            </tr>
            <tr>
              <td>
                <code>update_released</code>
              </td>
              <td>Authority only</td>
              <td>
                Moves the released counter up (never down, never past total);
                emits a <code>ReleaseUpdated</code> event.
              </td>
            </tr>
            <tr>
              <td>
                <code>close_schedule</code>
              </td>
              <td>Authority only</td>
              <td>Retires the schedule and reclaims rent.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Methodology() {
  return (
    <section>
      <div className="panel">
        <h3>How every claim on this page was checked</h3>
        <ol className="method-list">
          <li>
            <strong>Mint account read.</strong> <code>getTokenSupply</code> and{" "}
            <code>getParsedAccountInfo</code> on{" "}
            <code>{STREAM_MINT}</code> via public mainnet RPC. Supply,
            decimals, mint authority, freeze authority — straight from the
            chain, no intermediary.
          </li>
          <li>
            <strong>Burn transaction.</strong> 699,994,595 STREAM burned 23 Sep
            2026 (tx <code>4rbViHbm…hchZNv</code>), cross-checked against the
            foundation site and the team's announcement.
          </li>
          <li>
            <strong>Chart vs pie.</strong> Read the foundation unlock chart's
            data points ("Now" = 237,417,698; Dec 2027 = 339,864,227) and the
            adjacent pie (61.96–61.98% unlocked) in the same session. Both
            screenshots archived with the case file.
          </li>
          <li>
            <strong>Arithmetic, not vibes.</strong> 61.98% − 48.55% = 13.43% ≈
            40.3M STREAM unlocked-but-not-circulating. Locked buckets sum to
            38.02%; every slice is shown above.
          </li>
          <li>
            <strong>Negative results reported.</strong> No vesting contract IDs
            found for the two largest locked buckets after checking the
            foundation site, docs, and GitHub. Absence is the finding.
          </li>
        </ol>
      </div>
      <div className="panel">
        <h3>What UnlockLens adds</h3>
        <p className="muted">
          Manual recon like the above takes hours and rots the moment a page
          updates. UnlockLens splits the problem in two: an on-chain registry
          program where schedules live as first-class accounts (auditable by
          anyone, forever), and a dashboard that pairs those accounts with
          live mint reads and flags the exact discrepancies found here —
          un-rebased charts, unexplained unlocked supply, missing contract
          links. The Streamflow case file is exhibit A; the registry is the
          fix.
        </p>
      </div>
    </section>
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>("case");
  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>
            Unlock<span className="accent">Lens</span>
          </h1>
          <p className="tagline">
            Token unlock transparency for Solana — verified on-chain, not on trust.
          </p>
        </div>
        <nav className="tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab ${tab === t.id ? "tab-active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      <main>
        {tab === "case" && <CaseFile />}
        {tab === "verify" && <LiveVerification />}
        {tab === "registry" && <Registry />}
        {tab === "method" && <Methodology />}
      </main>
      <footer className="footer">
        <p className="muted small">
          UnlockLens · Colosseum Crypto World's Fair 2026 · Solana track ·
          staged build — not submitted
        </p>
      </footer>
    </div>
  );
}
