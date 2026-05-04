// Vehicle detail page — public, server-rendered where possible.
// /vehicle/{vin} → fetches vehicle summary + event timeline.

import { fetchVehicleEvents } from "@/app/lib/solana";
import { EventTypeLabel, AuthorityKindLabel } from "@/app/types/events";

interface PageProps {
  params: { vin: string };
}

export default async function VehicleDetail({ params }: PageProps) {
  const vin = decodeURIComponent(params.vin).toUpperCase();
  const events = await fetchVehicleEvents(vin);

  return (
    <section>
      <h1>VIN {vin}</h1>
      {/* TODO: render vehicle summary card from on-chain Vehicle account */}

      <h2>Event timeline</h2>
      {events.length === 0 ? (
        <p>No events found. This VIN may not be registered yet.</p>
      ) : (
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
  );
}
