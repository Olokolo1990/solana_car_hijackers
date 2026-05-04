// Public VIN lookup page — anyone can view a vehicle's history.

import { useState } from "react";
import Link from "next/link";
import { fetchVehicleEvents } from "@/lib/solana";
import { VehicleEvent, EventTypeLabel, AuthorityKindLabel } from "@/types/events";

export default function Home() {
  const [vin, setVin] = useState("");
  const [events, setEvents] = useState<VehicleEvent[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setEvents(await fetchVehicleEvents(vin));
    setLoading(false);
  }

  return (
    <main style={{ maxWidth: 720, margin: "2rem auto", padding: "0 1rem" }}>
      <header style={{ marginBottom: "2rem" }}>
        <h1>Vehicle Passport</h1>
        <p>Public, tamper-proof vehicle history on Solana.</p>
        <nav>
          <Link href="/">Lookup</Link> {" · "}
          <Link href="/write">Writer portal</Link> {" · "}
          <Link href="/authorities">Authorities</Link>
        </nav>
      </header>

      <form onSubmit={onSearch}>
        <input
          type="text"
          placeholder="Enter VIN (17 characters)"
          value={vin}
          onChange={(e) => setVin(e.target.value)}
          maxLength={17}
          style={{ width: "70%", padding: "0.5rem" }}
        />
        <button type="submit" disabled={loading || vin.length !== 17}>
          Search
        </button>
      </form>

      <section style={{ marginTop: "2rem" }}>
        {events === null && <p>Enter a VIN above to see history.</p>}
        {events !== null && events.length === 0 && (
          <p>No events found for this VIN. (May not be registered yet.)</p>
        )}
        {events !== null && events.length > 0 && (
          <ol>
            {events.map((ev) => (
              <li key={ev.sequence}>
                <strong>{EventTypeLabel[ev.eventType]}</strong> —{" "}
                {new Date(ev.timestamp * 1000).toLocaleDateString()} —{" "}
                {ev.mileageKm.toLocaleString()} km — by{" "}
                {AuthorityKindLabel[ev.authorityKind]} ({ev.authorityName})
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
