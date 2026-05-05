"use client";

import type { ReactNode } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

// Writer route group: a connected wallet is REQUIRED to actually submit
// transactions, but in this mock-mode build the form is always rendered so
// the UX can be reviewed without a wallet. Re-enable the gate once
// real chain submission is wired (after the planned contract redeploy).
export default function WriterLayout({ children }: { children: ReactNode }) {
  const { publicKey } = useWallet();
  return (
    <div style={{ maxWidth: 720, margin: "2rem auto", padding: "0 1rem" }}>
      <div
        style={{
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <WalletMultiButton />
        {publicKey ? (
          <span style={{ color: "#059669", fontSize: "0.85rem" }}>
            Connected: <code>{publicKey.toBase58().slice(0, 4)}…{publicKey.toBase58().slice(-4)}</code>
          </span>
        ) : (
          <span style={{ color: "#6b7280", fontSize: "0.85rem" }}>
            Wallet not connected — form is in mock mode (UX review only).
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
