"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthorityKindLabel, AuthorityKind } from "@/types/events";

interface AuthorityRow {
  signer: string;
  kind: AuthorityKind;
  countryCode: string;
  name: string;
  active: boolean;
  eventsWritten: number;
}

export default function AuthoritiesPage() {
  const [rows, setRows] = useState<AuthorityRow[]>([]);

  useEffect(() => {
    // TODO: getProgramAccounts filtered by Authority discriminator.
    setRows([]);
  }, []);

  return (
    <section>
      <h1>Registered authorities</h1>
      <p>
        <Link href="/register">+ Register new authority</Link>
      </p>
      {rows.length === 0 ? (
        <p>No authorities yet.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left">Name</th>
              <th align="left">Kind</th>
              <th align="left">Country</th>
              <th align="right">Events</th>
              <th align="left">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.signer}>
                <td>{r.name}</td>
                <td>{AuthorityKindLabel[r.kind]}</td>
                <td>{r.countryCode}</td>
                <td align="right">{r.eventsWritten}</td>
                <td>{r.active ? "Active" : "Revoked"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
