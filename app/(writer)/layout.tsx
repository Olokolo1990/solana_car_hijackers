"use client";

import type { ReactNode } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

// Writer route group: requires a connected wallet that is registered
// as an Authority on-chain. Authority status check happens per-page.
export default function WriterLayout({ children }: { children: ReactNode }) {
  const { publicKey } = useWallet();
  return (
    <div style={{ maxWidth: 720, margin: "2rem auto", padding: "0 1rem" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <WalletMultiButton />
      </div>
      {!publicKey ? (
        <p>Connect your authority wallet to continue.</p>
      ) : (
        children
      )}
    </div>
  );
}
