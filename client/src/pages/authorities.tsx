// Public directory of all registered authorities.

import { useEffect, useState } from "react";
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
    <main style={{ maxWidth: 960, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Registered authorities</h1>
      {rows.length === 0 && <p>No authorities registered yet.</p>}
      {rows.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Kind</th>
              <th>Country</th>
              <th>Events written</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.signer}>
                <td>{r.name}</td>
                <td>{AuthorityKindLabel[r.kind]}</td>
                <td>{r.countryCode}</td>
                <td>{r.eventsWritten}</td>
                <td>{r.active ? "Active" : "Revoked"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
