import type { ReactNode } from "react";

// Public route group: anyone can view, no wallet required.
export default function PublicLayout({ children }: { children: ReactNode }) {
  return <div style={{ maxWidth: 960, margin: "2rem auto", padding: "0 1rem" }}>{children}</div>;
}
