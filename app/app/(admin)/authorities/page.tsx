"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AuthorityKindLabel,
  type AuthoritySummary,
} from "@/types/events";
import { fetchAllAuthorities } from "@/lib/solana";

type LoadState =
  | { kind: "loading" }
  | { kind: "ok"; rows: AuthoritySummary[] }
  | { kind: "error"; message: string };

function shortPubkey(pk: string): string {
  return `${pk.slice(0, 4)}…${pk.slice(-4)}`;
}

function formatDate(unix: number): string {
  if (!unix) return "—";
  const d = new Date(unix * 1000);
  return d.toISOString().slice(0, 10) + " " + d.toISOString().slice(11, 16) + " UTC";
}

export default function AuthoritiesPage() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });
    fetchAllAuthorities()
      .then((rows) => {
        if (!cancelled) setState({ kind: "ok", rows });
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("fetchAllAuthorities failed", err);
          setState({
            kind: "error",
            message: err instanceof Error ? err.message : String(err),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function explorerAccountUrl(addr: string): string {
    return `https://explorer.solana.com/address/${addr}?cluster=devnet`;
  }

  // === Styles (consistent with /register, /write) ===
  const hintStyle: React.CSSProperties = { fontSize: "0.85rem", color: "#6b7280" };
  const tableStyle: React.CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "1rem",
    fontSize: "0.9rem",
  };
  const thStyle: React.CSSProperties = {
    textAlign: "left",
    padding: "0.6rem 0.7rem",
    borderBottom: "2px solid #e5e7eb",
    fontSize: "0.78rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: "#6b7280",
  };
  const tdStyle: React.CSSProperties = {
    padding: "0.6rem 0.7rem",
    borderBottom: "1px solid #f3f4f6",
    verticalAlign: "top",
  };

  const counts = state.kind === "ok"
    ? {
        total: state.rows.length,
        active: state.rows.filter((r) => r.active).length,
      }
    : null;

  return (
    <section>
      <h1>Registered authorities</h1>
      <p style={hintStyle}>
        Every wallet ever onboarded as an institutional authority on the
        on-chain registry. Read directly from devnet via{" "}
        <code>getProgramAccounts</code>.
      </p>

      <p style={{ marginTop: "1rem" }}>
        <Link href="/register" style={{ color: "#2563eb", textDecoration: "underline" }}>
          + Register new authority
        </Link>
      </p>

      {state.kind === "loading" && (
        <div
          style={{
            padding: "0.7rem 0.9rem",
            borderRadius: 6,
            border: "1px solid #d1d5db",
            background: "#f3f4f6",
            color: "#374151",
            fontSize: "0.9rem",
            marginTop: "1rem",
          }}
        >
          Loading authorities from devnet…
        </div>
      )}

      {state.kind === "error" && (
        <div
          style={{
            padding: "0.7rem 0.9rem",
            borderRadius: 6,
            border: "1px solid #fca5a5",
            background: "#fee2e2",
            color: "#991b1b",
            fontSize: "0.9rem",
            marginTop: "1rem",
            wordBreak: "break-word",
          }}
        >
          <strong>Failed to load authorities.</strong>
          <div style={{ marginTop: "0.25rem", fontFamily: "monospace", fontSize: "0.8rem" }}>
            {state.message}
          </div>
        </div>
      )}

      {state.kind === "ok" && state.rows.length === 0 && (
        <div
          style={{
            padding: "0.7rem 0.9rem",
            borderRadius: 6,
            border: "1px solid #fcd34d",
            background: "#fef3c7",
            color: "#92400e",
            fontSize: "0.9rem",
            marginTop: "1rem",
          }}
        >
          No authorities on-chain yet. Register the first one via{" "}
          <Link href="/register" style={{ color: "#92400e", textDecoration: "underline" }}>
            /register
          </Link>
          .
        </div>
      )}

      {state.kind === "ok" && state.rows.length > 0 && (
        <>
          <p style={{ ...hintStyle, marginTop: "1rem" }}>
            <strong>{counts!.active}</strong> active /{" "}
            <strong>{counts!.total}</strong> total
          </p>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Kind</th>
                <th style={thStyle}>Country</th>
                <th style={thStyle}>Signer</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Events</th>
                <th style={thStyle}>Registered</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {state.rows.map((r) => (
                <tr key={r.signer}>
                  <td style={tdStyle}>{r.name || <em style={hintStyle}>(no name)</em>}</td>
                  <td style={tdStyle}>{AuthorityKindLabel[r.kind]}</td>
                  <td style={tdStyle}>{r.countryCode}</td>
                  <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: "0.78rem" }}>
                    <a
                      href={explorerAccountUrl(r.signer)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={r.signer}
                      style={{ color: "#2563eb", textDecoration: "none" }}
                    >
                      {shortPubkey(r.signer)} ↗
                    </a>
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{r.eventsWritten}</td>
                  <td style={{ ...tdStyle, fontSize: "0.8rem", color: "#6b7280" }}>
                    {formatDate(r.registeredAt)}
                  </td>
                  <td style={tdStyle}>
                    {r.active ? (
                      <span
                        style={{
                          background: "#d1fae5",
                          color: "#065f46",
                          padding: "0.15rem 0.5rem",
                          borderRadius: 4,
                          fontSize: "0.78rem",
                          fontWeight: 600,
                        }}
                      >
                        Active
                      </span>
                    ) : (
                      <span
                        style={{
                          background: "#fee2e2",
                          color: "#991b1b",
                          padding: "0.15rem 0.5rem",
                          borderRadius: 4,
                          fontSize: "0.78rem",
                          fontWeight: 600,
                        }}
                      >
                        Revoked
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
