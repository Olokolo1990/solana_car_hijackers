import type { ReactNode } from "react";
import { WalletProvider } from "@/components/WalletProvider";
import { Header } from "@/components/Header";

export const metadata = {
  title: "Vehicle History",
  description: "Public, tamper-proof vehicle history on Solana",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0 }}>
        <WalletProvider>
          <Header />
          <main>{children}</main>
        </WalletProvider>
      </body>
    </html>
  );
}
