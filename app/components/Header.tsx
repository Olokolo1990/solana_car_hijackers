"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  AuthorityKindLabel,
  type AuthoritySummary,
} from "@/types/events";
import { fetchAuthority } from "@/lib/solana";

type AuthState =
  | { kind: "disconnected" }
  | { kind: "loading" }
  | { kind: "unregistered" }
  | { kind: "registered"; authority: AuthoritySummary }
  | { kind: "revoked"; authority: AuthoritySummary };

// Global app header — visible on every route. Shows nav, wallet button,
// and a live authority badge derived from the connected wallet's on-chain
// Authority record.
export function Header() {
  const wallet = useAnchorWallet();
  const [state, setState] = useState<AuthState>({ kind: "disconnected" });

  useEffect(() => {
    if (!wallet) {
      setState({ kind: "disconnected" });
      return;
    }
    let cancelled = false;
    setState({ kind: "loading" });
    fetchAuthority(wallet.publicKey)
      .then((auth) => {
        if (cancelled) return;
        if (!auth) {
          setState({ kind: "unregistered" });
        } else if (!auth.active) {
          setState({ kind: "revoked", authority: auth });
        } else {
          setState({ kind: "registered", authority: auth });
        }
      })
      .catch((err) => {
        console.error("Header.fetchAuthority failed", err);
        if (!cancelled) setState({ kind: "unregistered" });
      });
    return () => {
      cancelled = true;
    };
  }, [wallet]);

  const navLinkStyle: React.CSSProperties = {
    color: "#374151",
    textDecoration: "none",
    fontSize: "0.92rem",
  };

  return (
    <header
      style={{
        padding: "0.85rem 2rem",
        borderBottom: "1px solid #e5e7eb",
        display: "flex",
        gap: "1.5rem",
        alignItems: "center",
        flexWrap: "wrap",
        background: "white",
      }}
    >
      <Link
        href="/"
        style={{
          fontWeight: 700,
          fontSize: "1.05rem",
          color: "#111827",
          textDecoration: "none",
        }}
      >
        Vehicle History
      </Link>
      <nav style={{ display: "flex", gap: "1.1rem" }}>
        <Link href="/" style={navLinkStyle}>Lookup</Link>
        <Link href="/write" style={navLinkStyle}>Writer</Link>
        <Link href="/authorities" style={navLinkStyle}>Authorities</Link>
        <Link href="/register" style={navLinkStyle}>Register</Link>
      </nav>

      <div
        style={{
          marginLeft: "auto",
          display: "flex",
          gap: "0.65rem",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {state.kind === "registered" && (
          <span
            style={{
              padding: "0.25rem 0.6rem",
              borderRadius: 999,
              background: "#d1fae5",
              border: "1px solid #6ee7b7",
              color: "#065f46",
              fontSize: "0.78rem",
              fontWeight: 600,
            }}
            title={`${state.authority.name} · ${state.authority.eventsWritten} events written`}
          >
            {AuthorityKindLabel[state.authority.kind]} ·{" "}
            {state.authority.countryCode}
          </span>
        )}
        {state.kind === "revoked" && (
          <span
            style={{
              padding: "0.25rem 0.6rem",
              borderRadius: 999,
              background: "#fee2e2",
              border: "1px solid #fca5a5",
              color: "#991b1b",
              fontSize: "0.78rem",
              fontWeight: 600,
            }}
            title={`${state.authority.name} authority record is revoked`}
          >
            REVOKED — {AuthorityKindLabel[state.authority.kind]}
          </span>
        )}
        {state.kind === "unregistered" && wallet && (
          <span
            style={{
              padding: "0.25rem 0.6rem",
              borderRadius: 999,
              background: "#f3f4f6",
              border: "1px solid #d1d5db",
              color: "#6b7280",
              fontSize: "0.78rem",
              fontWeight: 600,
            }}
            title="This wallet is not registered as an authority on-chain. Public lookups still work."
          >
            Not an authority
          </span>
        )}
        {state.kind === "loading" && (
          <span
            style={{
              padding: "0.25rem 0.6rem",
              borderRadius: 999,
              background: "#f3f4f6",
              border: "1px solid #d1d5db",
              color: "#6b7280",
              fontSize: "0.78rem",
            }}
          >
            Checking…
          </span>
        )}
        <WalletMultiButton />
      </div>
    </header>
  );
}
