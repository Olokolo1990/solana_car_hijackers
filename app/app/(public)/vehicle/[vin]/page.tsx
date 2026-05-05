// Vehicle detail page — public, server-rendered.
// /vehicle/{vin} → fetches Vehicle account + event timeline from devnet.

import { fetchVehicleEvents, fetchVehicleSummary } from "@/lib/solana";
import { EventTypeLabel, AuthorityKindLabel } from "@/types/events";

interface PageProps {
  params: { vin: string };
}

export const dynamic = "force-dynamic"; // always read fresh chain state

export default async function VehicleDetail({ params }: PageProps) {
  const vin = decodeURIComponent(params.vin).toUpperCase();

  const [summary, events] = await Promise.all([
    fetchVehicleSummary(vin),
    fetchVehicleEvents(vin),
  ]);

  return (
    <section>
      <h1 style={{ marginBottom: "0.5rem" }}>VIN {vin}</h1>

      {!summary ? (
        <p>
          This VIN is not registered on-chain yet. The first manufacturer or
          customs authority to mint a passport for this vehicle will create it
          here.
        </p>
      ) : (
        <>
          {/* Driving-block banner — shown when Police set vehicle.driving_blocked_since > 0 */}
          {summary.drivingBlockedSince > 0 && (
            <div
              style={{
                marginBottom: "1rem",
                padding: "0.75rem 1rem",
                borderRadius: 8,
                background: "#fef2f2",
                border: "2px solid #ef4444",
                color: "#7f1d1d",
              }}
            >
              <strong>DRIVING BLOCKED</strong> — Police set this block on{" "}
              {new Date(summary.drivingBlockedSince * 1000).toLocaleDateString()}.{" "}
              The vehicle must pass technical inspection before legal use.
            </div>
          )}

          {/* Registration card — shown when Government has registered the vehicle */}
          {summary.registeredAtOfficial > 0 && (
            <div
              style={{
                marginBottom: "1.5rem",
                padding: "1rem 1.25rem",
                borderRadius: 8,
                background: "#f0f9ff",
                border: "1px solid #93c5fd",
              }}
            >
              <div style={{ fontSize: "0.78rem", color: "#1e40af", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Registered
              </div>
              <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.4rem", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>License plate</div>
                  <div style={{ fontFamily: "monospace", fontSize: "1.1rem", fontWeight: 600 }}>
                    {summary.currentLicensePlate || "—"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Country</div>
                  <div style={{ fontWeight: 500 }}>{summary.registrationCountry || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Date</div>
                  <div style={{ fontWeight: 500 }}>
                    {new Date(summary.registeredAtOfficial * 1000).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: "1rem 1.25rem",
              marginBottom: "1.5rem",
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "0.4rem 1.5rem",
            }}
          >
            <Field label="Make" value={summary.make} />
            <Field label="Model" value={summary.model} />
            <Field label="Year" value={String(summary.year)} />
            <Field
              label="Last recorded mileage"
              value={`${summary.lastMileage.toLocaleString()} km`}
            />
            <Field label="Total events" value={String(summary.eventCount)} />
            <Field
              label="Created on-chain"
              value={new Date(summary.createdAt * 1000).toLocaleDateString()}
            />
          </div>

          <h2>Event timeline</h2>
          {events.length === 0 ? (
            <p>No events written yet.</p>
          ) : (
            <ol style={{ paddingLeft: "1.25rem" }}>
              {[...events].reverse().map((ev) => (
                <li key={ev.sequence} style={{ marginBottom: "0.75rem" }}>
                  <div>
                    <strong>{EventTypeLabel[ev.eventType]}</strong> —{" "}
                    {new Date(ev.timestamp * 1000).toLocaleDateString()}
                    {ev.mileageKm > 0
                      ? ` — ${ev.mileageKm.toLocaleString()} km`
                      : ""}
                  </div>
                  <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>
                    by {AuthorityKindLabel[ev.authorityKind]} — {ev.authorityName}
                  </div>
                  {(ev.validFrom > 0 || ev.validUntil > 0) && (
                    <div style={{ color: "#6b7280", fontSize: "0.85rem" }}>
                      {ev.validFrom > 0 && (
                        <>valid from {new Date(ev.validFrom * 1000).toLocaleDateString()}</>
                      )}
                      {ev.validFrom > 0 && ev.validUntil > 0 && " — "}
                      {ev.validUntil > 0 && (
                        <>until {new Date(ev.validUntil * 1000).toLocaleDateString()}</>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        style={{
          color: "#6b7280",
          fontSize: "0.8rem",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </div>
      <div style={{ fontWeight: 500 }}>{value}</div>
    </div>
  );
}
