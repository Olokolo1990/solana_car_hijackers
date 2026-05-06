"use client";

import type { ReactNode } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

// Admin route group: gates rendering on a connected wallet. The wallet
// button itself lives in the global Header, so we only enforce here.
// On-chain access control (admin pubkey check) happens at submit time
// via Anchor's has_one constraint.
export default function AdminLayout({ children }: { children: ReactNode }) {
  const { publicKey } = useWallet();
  return (
    <div style={{ maxWidth: 960, margin: "2rem auto", padding: "0 1rem" }}>
      {!publicKey ? (
        <p>Connect a wallet (top-right) to continue.</p>
      ) : (
        children
      )}
    </div>
  );
}
