"use client";

import { useState } from "react";
import { AuthorityKind, AuthorityKindLabel } from "@/app/types/events";

export default function RegisterAuthorityPage() {
  const [signerPubkey, setSignerPubkey] = useState("");
  const [kind, setKind] = useState<AuthorityKind>(AuthorityKind.InspectionStation);
  const [countryCode, setCountryCode] = useState("PL");
  const [name, setName] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: build register_authority ix via Anchor program, send + confirm.
    console.log({ signerPubkey, kind, countryCode, name });
    alert("Stub: not yet wired. See TODOs.");
  }

  return (
    <section>
      <h1>Register new authority</h1>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: "1rem", maxWidth: 480 }}>
        <label>
          Authority signer pubkey
          <input
            required
            value={signerPubkey}
            onChange={(e) => setSignerPubkey(e.target.value)}
            style={{ width: "100%", padding: "0.5rem", fontFamily: "monospace" }}
          />
        </label>
        <label>
          Kind
          <select
            value={kind}
            onChange={(e) => setKind(Number(e.target.value) as AuthorityKind)}
            style={{ width: "100%", padding: "0.5rem" }}
          >
            {Object.entries(AuthorityKindLabel).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
        </label>
        <label>
          Country code (ISO-3166)
          <input
            required
            maxLength={2}
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </label>
        <label>
          Display name
          <input
            required
            maxLength={64}
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </label>
        <button type="submit" style={{ padding: "0.6rem 1.2rem" }}>
          Register
        </button>
      </form>
    </section>
  );
}
