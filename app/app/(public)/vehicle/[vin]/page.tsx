// Vehicle detail page — public, server-rendered.
// /vehicle/{vin} → fetches Vehicle account + event timeline from devnet.

import { fetchVehicleEvents, fetchVehicleSummary } from "@/lib/solana";
import { VehicleView } from "@/components/VehicleView";

interface PageProps {
  params: { vin: string };
}

export const dynamic = "force-dynamic"; // always read fresh chain state

export default async function VehicleDetailByVin({ params }: PageProps) {
  const vin = decodeURIComponent(params.vin).toUpperCase();

  const [summary, events] = await Promise.all([
    fetchVehicleSummary(vin),
    fetchVehicleEvents(vin),
  ]);

  if (!summary) {
    return (
      <section>
        <h1 style={{ marginBottom: "0.5rem" }}>VIN {vin}</h1>
        <p>
          This VIN is not registered on-chain yet. The first manufacturer or
          customs authority to mint a passport for this vehicle will create it
          here.
        </p>
      </section>
    );
  }

  return <VehicleView summary={summary} events={events} heading={`VIN ${vin}`} />;
}
