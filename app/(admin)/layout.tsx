"use client";

import type { ReactNode } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

// Admin route group: only the wallet stored as GlobalConfig.admin can write.
// TODO: fetch global_config from chain and compare to publicKey here.
export default function AdminLayout({ children }: { children: ReactNode }) {
  const { publicKey } = useWallet();
  return (
    <div style={{ maxWidth: 960, margin: "2rem auto", padding: "0 1rem" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <WalletMultiButton />
      </div>
      {!publicKey ? (
        <p>Connect the admin wallet to continue.</p>
      ) : (
        children
      )}
    </div>
  );
}
