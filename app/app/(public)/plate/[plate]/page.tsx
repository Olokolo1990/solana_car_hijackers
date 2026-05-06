// Vehicle detail page — public, server-rendered.
// /plate/{plate} → finds Vehicle account by current_license_plate, renders
// the same UI as /vehicle/[vin]. Multiple matches (rare — same plate string
// across countries) shows the first match with a warning banner.

import Link from "next/link";
import { PublicKey } from "@solana/web3.js";
import { fetchVehicleEventsByPda, findVehiclesByPlate } from "@/lib/solana";
import { VehicleView } from "@/components/VehicleView";

interface PageProps {
  params: { plate: string };
}

export const dynamic = "force-dynamic";

export default async function VehicleDetailByPlate({ params }: PageProps) {
  const plate = decodeURIComponent(params.plate).toUpperCase().trim();
  const hits = await findVehiclesByPlate(plate);

  if (hits.length === 0) {
    return (
      <section>
        <h1 style={{ marginBottom: "0.5rem" }}>Plate {plate}</h1>
        <p>
          No vehicle is registered on-chain with this license plate. Either it
          has not been registered yet, or the plate string differs slightly
          (e.g. spaces / dashes).
        </p>
        <p style={{ marginTop: "1rem" }}>
          <Link href="/" style={{ color: "#2563eb", textDecoration: "underline" }}>
            ← Back to lookup
          </Link>
        </p>
      </section>
    );
  }

  // First hit (and a warning banner for any extras).
  const hit = hits[0];
  const events = await fetchVehicleEventsByPda(new PublicKey(hit.pda));
  const heading = hit.summary.registrationCountry
    ? `Plate ${plate} (${hit.summary.registrationCountry})`
    : `Plate ${plate}`;

  const others = hits.slice(1);

  return (
    <>
      {others.length > 0 && (
        <div
          style={{
            padding: "0.7rem 0.9rem",
            borderRadius: 6,
            border: "1px solid #fcd34d",
            background: "#fef3c7",
            color: "#92400e",
            fontSize: "0.85rem",
            marginBottom: "1rem",
          }}
        >
          <strong>{others.length} other vehicle(s)</strong> also match plate{" "}
          <code>{plate}</code> on different jurisdictions:{" "}
          {others
            .map(
              (o) =>
                `${o.summary.make} ${o.summary.model} ${o.summary.year} (${
                  o.summary.registrationCountry || "??"
                })`
            )
            .join(", ")}
          . Showing the first below.
        </div>
      )}
      <VehicleView summary={hit.summary} events={events} heading={heading} />
    </>
  );
}
