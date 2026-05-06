import type { ReactNode } from "react";

// Writer route group: just a page-width wrapper. Wallet connect + authority
// badge live in the global Header. Per-page logic still gates submissions
// on a connected, registered, active authority via the chain.
export default function WriterLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ maxWidth: 720, margin: "2rem auto", padding: "0 1rem" }}>
      {children}
    </div>
  );
}
