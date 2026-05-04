import type { ReactNode } from "react";
import Link from "next/link";
import { WalletProvider } from "@/app/components/WalletProvider";

export const metadata = {
  title: "Vehicle History",
  description: "Public, tamper-proof vehicle history on Solana",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0 }}>
        <WalletProvider>
          <header
            style={{
              padding: "1rem 2rem",
              borderBottom: "1px solid #e5e7eb",
              display: "flex",
              gap: "1.5rem",
              alignItems: "center",
            }}
          >
            <Link href="/" style={{ fontWeight: 700, fontSize: "1.1rem" }}>
              Vehicle History
            </Link>
            <nav style={{ display: "flex", gap: "1rem" }}>
              <Link href="/">Lookup</Link>
              <Link href="/write">Writer</Link>
              <Link href="/authorities">Authorities</Link>
            </nav>
          </header>
          <main>{children}</main>
        </WalletProvider>
      </body>
    </html>
  );
}
