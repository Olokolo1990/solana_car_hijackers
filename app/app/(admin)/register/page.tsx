"use client";

import { useEffect, useMemo, useState } from "react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import {
  AuthorityKind,
  AuthorityKindLabel,
  type GlobalConfigSummary,
} from "@/types/events";
import {
  deriveAuthorityPda,
  fetchAuthority,
  fetchGlobalConfig,
} from "@/lib/solana";
import { getProgram } from "@/lib/program";

type SubmissionResult =
  | { kind: "success"; tx: string; authorityPda: string }
  | { kind: "error"; message: string }
  | null;

type AdminLookup =
  | { kind: "loading" }
  | { kind: "ok"; config: GlobalConfigSummary }
  | { kind: "missing" };

type SignerLookup =
  | { kind: "idle" }
  | { kind: "invalid" }
  | { kind: "checking" }
  | { kind: "free" }
  | { kind: "taken"; existingKind: AuthorityKind; existingName: string; active: boolean };

export default function RegisterAuthorityPage() {
  const wallet = useAnchorWallet();

  const [signerPubkey, setSignerPubkey] = useState("");
  const [kind, setKind] = useState<AuthorityKind>(AuthorityKind.InspectionStation);
  const [countryCode, setCountryCode] = useState("PL");
  const [name, setName] = useState("");

  const [adminLookup, setAdminLookup] = useState<AdminLookup>({ kind: "loading" });
  const [signerLookup, setSignerLookup] = useState<SignerLookup>({ kind: "idle" });
  const [submission, setSubmission] = useState<SubmissionResult>(null);
  const [submitting, setSubmitting] = useState(false);

  // Load GlobalConfig once on mount so we can show admin-mismatch warning.
  useEffect(() => {
    let cancelled = false;
    setAdminLookup({ kind: "loading" });
    fetchGlobalConfig()
      .then((cfg) => {
        if (cancelled) return;
        setAdminLookup(cfg ? { kind: "ok", config: cfg } : { kind: "missing" });
      })
      .catch((err) => {
        console.error("fetchGlobalConfig failed", err);
        if (!cancelled) setAdminLookup({ kind: "missing" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Validate the entered signer pubkey + check whether an Authority record
  // already exists for it (debounced 400ms).
  const trimmedSigner = signerPubkey.trim();
  const parsedSigner = useMemo<PublicKey | null>(() => {
    if (trimmedSigner.length === 0) return null;
    try {
      return new PublicKey(trimmedSigner);
    } catch {
      return null;
    }
  }, [trimmedSigner]);

  useEffect(() => {
    if (trimmedSigner.length === 0) {
      setSignerLookup({ kind: "idle" });
      return;
    }
    if (!parsedSigner) {
      setSignerLookup({ kind: "invalid" });
      return;
    }
    setSignerLookup({ kind: "checking" });
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const existing = await fetchAuthority(parsedSigner);
        if (cancelled) return;
        setSignerLookup(
          existing
            ? {
                kind: "taken",
                existingKind: existing.kind,
                existingName: existing.name,
                active: existing.active,
              }
            : { kind: "free" }
        );
      } catch (err) {
        if (cancelled) return;
        console.error("fetchAuthority failed", err);
        setSignerLookup({ kind: "free" });
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmedSigner, parsedSigner]);

  const adminMismatch = (() => {
    if (!wallet) return null;
    if (adminLookup.kind !== "ok") return null;
    if (wallet.publicKey.toBase58() !== adminLookup.config.admin) {
      return `Connected wallet does not match GlobalConfig.admin (${adminLookup.config.admin.slice(0, 4)}…${adminLookup.config.admin.slice(-4)}). The chain will reject the submission.`;
    }
    return null;
  })();

  function missingFields(): string[] {
    const missing: string[] = [];
    if (!parsedSigner) missing.push("Authority signer pubkey (invalid base58)");
    if (signerLookup.kind === "checking") missing.push("waiting for signer lookup");
    if (signerLookup.kind === "taken") missing.push("Signer already registered as authority");
    if (countryCode.length !== 2)
      missing.push(`Country code (ISO-2, ${countryCode.length}/2)`);
    if (!name.trim()) missing.push("Display name");
    if (name.trim().length > 64) missing.push("Display name (max 64 chars)");
    return missing;
  }
  const isFormValid = () => missingFields().length === 0;

  function explorerTxUrl(sig: string): string {
    return `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
  }
  function explorerAccountUrl(addr: string): string {
    return `https://explorer.solana.com/address/${addr}?cluster=devnet`;
  }

  function prettifyAnchorError(err: unknown): string {
    const msg = err instanceof Error ? err.message : String(err);
    const m = msg.match(/Error Code: (\w+)\..*Error Message: ([^.]+)/s);
    if (m) return `${m[1]} — ${m[2]}`;
    return msg.length > 240 ? msg.slice(0, 240) + "…" : msg;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmission(null);
    if (!isFormValid() || !parsedSigner) return;
    if (!wallet) {
      setSubmission({
        kind: "error",
        message: "Wallet not connected.",
      });
      return;
    }
    setSubmitting(true);
    try {
      const program = getProgram(wallet);
      const cc = countryCode.toUpperCase();
      const countryBytes = [cc.charCodeAt(0), cc.charCodeAt(1)] as number[];
      const [authorityPda] = deriveAuthorityPda(parsedSigner);
      const tx = await program.methods
        .registerAuthority(
          kind,
          countryBytes as unknown as number[] & { length: 2 },
          name.trim()
        )
        .accountsPartial({
          admin: wallet.publicKey,
          newAuthoritySigner: parsedSigner,
        })
        .rpc();
      setSubmission({ kind: "success", tx, authorityPda: authorityPda.toBase58() });
      // Refresh signer lookup so the form reflects the new state.
      setSignerLookup({
        kind: "taken",
        existingKind: kind,
        existingName: name.trim(),
        active: true,
      });
    } catch (err) {
      console.error("registerAuthority failed", err);
      setSubmission({ kind: "error", message: prettifyAnchorError(err) });
    } finally {
      setSubmitting(false);
    }
  }

  // === Styles (mirrors /write) ===
  const fieldStyle: React.CSSProperties = { display: "grid", gap: "0.35rem" };
  const inputStyle: React.CSSProperties = {
    padding: "0.55rem 0.7rem", fontSize: "1rem", border: "1px solid #d1d5db",
    borderRadius: 6, fontFamily: "inherit",
  };
  const labelStyle: React.CSSProperties = { fontSize: "0.85rem", fontWeight: 600, color: "#374151" };
  const hintStyle: React.CSSProperties = { fontSize: "0.78rem", color: "#6b7280" };

  return (
    <section style={{ maxWidth: 640, margin: "0 auto" }}>
      <h1>Register new authority</h1>
      <p style={hintStyle}>
        Admin-only: onboard an institutional wallet (manufacturer, police,
        inspection station, …) so it can append events on the registry.
        Only the wallet stored in <code>GlobalConfig.admin</code> can sign.
      </p>

      {/* Admin status panel */}
      {wallet && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.6rem 0.85rem",
            borderRadius: 6,
            fontSize: "0.85rem",
            border: "1px solid",
            ...(adminLookup.kind === "loading"
              ? { background: "#f3f4f6", borderColor: "#d1d5db", color: "#374151" }
              : adminLookup.kind === "missing"
              ? { background: "#fee2e2", borderColor: "#fca5a5", color: "#991b1b" }
              : adminMismatch
              ? { background: "#fef3c7", borderColor: "#fcd34d", color: "#92400e" }
              : { background: "#d1fae5", borderColor: "#6ee7b7", color: "#065f46" }),
          }}
        >
          {adminLookup.kind === "loading" && "Loading GlobalConfig…"}
          {adminLookup.kind === "missing" && (
            <>
              <strong>GlobalConfig not found.</strong> Program may not be
              initialized on this cluster. Run{" "}
              <code>scripts/initialize-config.ts</code> first.
            </>
          )}
          {adminLookup.kind === "ok" && !adminMismatch && (
            <>
              <strong>Admin wallet confirmed.</strong> Currently {adminLookup.config.authorityCount} authorities registered,{" "}
              {adminLookup.config.vehicleCount} vehicles minted.
            </>
          )}
          {adminLookup.kind === "ok" && adminMismatch && (
            <>{adminMismatch}</>
          )}
        </div>
      )}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: "1.2rem", marginTop: "1.5rem" }}>
        <label style={fieldStyle}>
          <span style={labelStyle}>Authority signer pubkey</span>
          <input
            required
            type="text"
            placeholder="base58 pubkey of the wallet to onboard"
            value={signerPubkey}
            onChange={(e) => setSignerPubkey(e.target.value)}
            style={{ ...inputStyle, fontFamily: "monospace" }}
          />
          {trimmedSigner.length > 0 && (
            <div
              style={{
                padding: "0.5rem 0.7rem",
                borderRadius: 6,
                fontSize: "0.8rem",
                marginTop: "0.2rem",
                border: "1px solid",
                ...(signerLookup.kind === "free"
                  ? { background: "#d1fae5", borderColor: "#6ee7b7", color: "#065f46" }
                  : signerLookup.kind === "taken"
                  ? { background: "#fee2e2", borderColor: "#fca5a5", color: "#991b1b" }
                  : signerLookup.kind === "invalid"
                  ? { background: "#fee2e2", borderColor: "#fca5a5", color: "#991b1b" }
                  : { background: "#f3f4f6", borderColor: "#d1d5db", color: "#374151" }),
              }}
            >
              {signerLookup.kind === "checking" && "Checking on-chain…"}
              {signerLookup.kind === "invalid" && "Invalid base58 pubkey."}
              {signerLookup.kind === "free" && "Pubkey is valid and not yet registered."}
              {signerLookup.kind === "taken" && (
                <>
                  <strong>Already registered</strong> as {AuthorityKindLabel[signerLookup.existingKind]} — &quot;{signerLookup.existingName}&quot;
                  {!signerLookup.active && " (REVOKED)"}. The chain will reject a re-registration.
                </>
              )}
            </div>
          )}
        </label>

        <label style={fieldStyle}>
          <span style={labelStyle}>Authority kind</span>
          <select
            value={kind}
            onChange={(e) => setKind(Number(e.target.value) as AuthorityKind)}
            style={inputStyle}
          >
            {Object.entries(AuthorityKindLabel).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
          <span style={hintStyle}>
            Determines which event types this authority can write. e.g. only
            Police can record <code>PoliceControl</code>; only Inspection can
            clear a driving block.
          </span>
        </label>

        <label style={fieldStyle}>
          <span style={labelStyle}>Country code (ISO-3166 alpha-2)</span>
          <input
            required
            maxLength={2}
            placeholder="PL"
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
            style={{ ...inputStyle, fontFamily: "monospace" }}
          />
          <span style={hintStyle}>{countryCode.length}/2</span>
        </label>

        <label style={fieldStyle}>
          <span style={labelStyle}>Display name</span>
          <input
            required
            maxLength={64}
            placeholder='e.g. "Volkswagen AG (demo)" or "Wydział Komunikacji Warszawa"'
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
          />
          <span style={hintStyle}>{name.length}/64 — stored on-chain in the Authority account.</span>
        </label>

        {submission?.kind === "success" && (
          <div
            style={{
              padding: "0.7rem 0.9rem",
              borderRadius: 6,
              border: "1px solid #6ee7b7",
              background: "#d1fae5",
              color: "#065f46",
              fontSize: "0.9rem",
            }}
          >
            <div><strong>Authority registered on-chain.</strong></div>
            <div style={{ marginTop: "0.25rem", fontFamily: "monospace", fontSize: "0.8rem", wordBreak: "break-all" }}>
              tx: {submission.tx}
            </div>
            <div style={{ marginTop: "0.25rem", fontFamily: "monospace", fontSize: "0.8rem", wordBreak: "break-all" }}>
              authority PDA: {submission.authorityPda}
            </div>
            <div style={{ marginTop: "0.4rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <a
                href={explorerTxUrl(submission.tx)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#065f46", textDecoration: "underline" }}
              >
                View tx ↗
              </a>
              <a
                href={explorerAccountUrl(submission.authorityPda)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#065f46", textDecoration: "underline" }}
              >
                View authority account ↗
              </a>
            </div>
          </div>
        )}
        {submission?.kind === "error" && (
          <div
            style={{
              padding: "0.7rem 0.9rem",
              borderRadius: 6,
              border: "1px solid #fca5a5",
              background: "#fee2e2",
              color: "#991b1b",
              fontSize: "0.9rem",
              wordBreak: "break-word",
            }}
          >
            <div><strong>Submission failed.</strong></div>
            <div style={{ marginTop: "0.25rem", fontFamily: "monospace", fontSize: "0.8rem" }}>
              {submission.message}
            </div>
          </div>
        )}

        {!isFormValid() && missingFields().length > 0 && (
          <div
            style={{
              padding: "0.55rem 0.75rem",
              borderRadius: 6,
              border: "1px solid #fcd34d",
              background: "#fef3c7",
              color: "#92400e",
              fontSize: "0.85rem",
            }}
          >
            <strong>Cannot submit yet — missing or invalid:</strong>{" "}
            {missingFields().join(", ")}.
          </div>
        )}

        <button
          type="submit"
          disabled={!isFormValid() || submitting || !wallet}
          style={{
            padding: "0.7rem 1.4rem", fontSize: "1rem",
            background: !isFormValid() || submitting || !wallet ? "#9ca3af" : "#111827",
            color: "white", border: "none", borderRadius: 6,
            cursor: !isFormValid() || submitting || !wallet ? "not-allowed" : "pointer",
          }}
        >
          {submitting
            ? "Signing + sending…"
            : !wallet
            ? "Connect wallet to submit"
            : "Register authority"}
        </button>

        <div style={{ ...hintStyle, marginTop: "0.5rem" }}>
          <strong>Live on Solana devnet.</strong> Submission signs through the
          connected wallet and lands on-chain via program{" "}
          <code>HkbccHJ45V7zbgLkwr64EUzRhfjdH1mcoQ5UVMAte341</code>.
          Only the wallet stored as <code>GlobalConfig.admin</code> can sign;
          any other signer triggers an Anchor <code>has_one</code> violation.
        </div>
      </form>
    </section>
  );
}
