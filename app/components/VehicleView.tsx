// Shared rendering for vehicle detail. Used by:
//   - /vehicle/[vin]   (lookup by VIN)
//   - /plate/[plate]   (lookup by license plate)
// Both routes resolve their on-chain state to (summary, events) and hand it
// here. Server-renderable — no client interactivity required.

import {
  AuthorityKindLabel,
  EventType,
  EventTypeLabel,
  type VehicleEvent,
  type VehicleSummary,
} from "@/types/events";

interface Props {
  summary: VehicleSummary;
  events: VehicleEvent[];
  /** What text to show in the page heading. e.g. "VIN ..." or "Plate ..." */
  heading: string;
}

interface InsuranceStatus {
  kind: "valid" | "expired" | "none";
  validFrom?: number;
  validUntil?: number;
  insurerName?: string;
}

interface InspectionStatus {
  kind: "current" | "overdue" | "none";
  validUntil?: number;
  lastInspectedAt?: number;
  inspectorName?: string;
}

function getInsuranceStatus(events: VehicleEvent[]): InsuranceStatus {
  const policies = events
    .filter((e) => e.eventType === EventType.InsuranceClaim && e.validUntil > 0)
    .sort((a, b) => b.validUntil - a.validUntil);
  if (policies.length === 0) return { kind: "none" };
  const latest = policies[0];
  const now = Math.floor(Date.now() / 1000);
  return {
    kind: now < latest.validUntil ? "valid" : "expired",
    validFrom: latest.validFrom > 0 ? latest.validFrom : undefined,
    validUntil: latest.validUntil,
    insurerName: latest.authorityName,
  };
}

function getInspectionStatus(events: VehicleEvent[]): InspectionStatus {
  const inspections = events
    .filter((e) => e.eventType === EventType.Inspection && e.validUntil > 0)
    .sort((a, b) => b.validUntil - a.validUntil);
  if (inspections.length === 0) return { kind: "none" };
  const latest = inspections[0];
  const now = Math.floor(Date.now() / 1000);
  return {
    kind: now < latest.validUntil ? "current" : "overdue",
    validUntil: latest.validUntil,
    lastInspectedAt: latest.timestamp,
    inspectorName: latest.authorityName,
  };
}

function fmtDate(unix: number): string {
  return new Date(unix * 1000).toLocaleDateString();
}

export function VehicleView({ summary, events, heading }: Props) {
  const insurance = getInsuranceStatus(events);
  const inspection = getInspectionStatus(events);

  // Each status card has 3 visual states (ok / not-ok / none) sharing the same
  // outer shape. Tag colors tuned to match the existing REGISTERED card.
  const statusCardStyle: React.CSSProperties = {
    padding: "0.85rem 1rem",
    borderRadius: 8,
    border: "1px solid",
  };

  return (
    <section>
      <h1 style={{ marginBottom: "0.5rem" }}>{heading}</h1>

      {/* Driving-block banner (top — most critical when set) */}
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
          {fmtDate(summary.drivingBlockedSince)}. The vehicle must pass
          technical inspection before legal use.
        </div>
      )}

      {/* === Status cards row: Registration | Insurance | Inspection === */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "0.75rem",
          marginBottom: "1.5rem",
        }}
      >
        {/* Registration card (existing) */}
        {summary.registeredAtOfficial > 0 ? (
          <div
            style={{
              ...statusCardStyle,
              background: "#f0f9ff",
              borderColor: "#93c5fd",
            }}
          >
            <div
              style={{
                fontSize: "0.72rem",
                color: "#1e40af",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontWeight: 700,
              }}
            >
              Registered
            </div>
            <div style={{ marginTop: "0.45rem" }}>
              <div style={{ fontFamily: "monospace", fontSize: "1.1rem", fontWeight: 600 }}>
                {summary.currentLicensePlate || "—"}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#1e3a8a", marginTop: "0.2rem" }}>
                {summary.registrationCountry || "—"} · {fmtDate(summary.registeredAtOfficial)}
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              ...statusCardStyle,
              background: "#f9fafb",
              borderColor: "#e5e7eb",
              color: "#6b7280",
            }}
          >
            <div
              style={{
                fontSize: "0.72rem",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontWeight: 700,
              }}
            >
              Not registered
            </div>
            <div style={{ fontSize: "0.85rem", marginTop: "0.45rem" }}>
              No license plate assigned.
            </div>
          </div>
        )}

        {/* Insurance card */}
        {insurance.kind === "valid" && (
          <div
            style={{
              ...statusCardStyle,
              background: "#ecfdf5",
              borderColor: "#6ee7b7",
            }}
          >
            <div
              style={{
                fontSize: "0.72rem",
                color: "#065f46",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontWeight: 700,
              }}
            >
              Insurance · Valid
            </div>
            <div style={{ marginTop: "0.45rem" }}>
              <div style={{ fontSize: "0.95rem", color: "#065f46", fontWeight: 600 }}>
                until {fmtDate(insurance.validUntil!)}
              </div>
              <div style={{ fontSize: "0.78rem", color: "#047857", marginTop: "0.2rem" }}>
                {insurance.insurerName ?? "Insurer"}
                {insurance.validFrom && <> · since {fmtDate(insurance.validFrom)}</>}
              </div>
            </div>
          </div>
        )}
        {insurance.kind === "expired" && (
          <div
            style={{
              ...statusCardStyle,
              background: "#fef2f2",
              borderColor: "#fca5a5",
            }}
          >
            <div
              style={{
                fontSize: "0.72rem",
                color: "#991b1b",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontWeight: 700,
              }}
            >
              Insurance · Expired
            </div>
            <div style={{ marginTop: "0.45rem" }}>
              <div style={{ fontSize: "0.95rem", color: "#991b1b", fontWeight: 600 }}>
                expired {fmtDate(insurance.validUntil!)}
              </div>
              <div style={{ fontSize: "0.78rem", color: "#b91c1c", marginTop: "0.2rem" }}>
                {insurance.insurerName ?? "Insurer"} · vehicle is uninsured
              </div>
            </div>
          </div>
        )}
        {insurance.kind === "none" && (
          <div
            style={{
              ...statusCardStyle,
              background: "#f9fafb",
              borderColor: "#e5e7eb",
              color: "#6b7280",
            }}
          >
            <div
              style={{
                fontSize: "0.72rem",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontWeight: 700,
              }}
            >
              No insurance on record
            </div>
            <div style={{ fontSize: "0.85rem", marginTop: "0.45rem" }}>
              No insurer has written a policy event for this vehicle.
            </div>
          </div>
        )}

        {/* Inspection card */}
        {inspection.kind === "current" && (
          <div
            style={{
              ...statusCardStyle,
              background: "#ecfdf5",
              borderColor: "#6ee7b7",
            }}
          >
            <div
              style={{
                fontSize: "0.72rem",
                color: "#065f46",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontWeight: 700,
              }}
            >
              Inspection · Current
            </div>
            <div style={{ marginTop: "0.45rem" }}>
              <div style={{ fontSize: "0.95rem", color: "#065f46", fontWeight: 600 }}>
                next due {fmtDate(inspection.validUntil!)}
              </div>
              <div style={{ fontSize: "0.78rem", color: "#047857", marginTop: "0.2rem" }}>
                {inspection.inspectorName ?? "Inspection station"}
                {inspection.lastInspectedAt && (
                  <> · last passed {fmtDate(inspection.lastInspectedAt)}</>
                )}
              </div>
            </div>
          </div>
        )}
        {inspection.kind === "overdue" && (
          <div
            style={{
              ...statusCardStyle,
              background: "#fef2f2",
              borderColor: "#fca5a5",
            }}
          >
            <div
              style={{
                fontSize: "0.72rem",
                color: "#991b1b",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontWeight: 700,
              }}
            >
              Inspection · Overdue
            </div>
            <div style={{ marginTop: "0.45rem" }}>
              <div style={{ fontSize: "0.95rem", color: "#991b1b", fontWeight: 600 }}>
                overdue since {fmtDate(inspection.validUntil!)}
              </div>
              <div style={{ fontSize: "0.78rem", color: "#b91c1c", marginTop: "0.2rem" }}>
                {inspection.inspectorName ?? "Inspection station"} · re-inspection required
              </div>
            </div>
          </div>
        )}
        {inspection.kind === "none" && (
          <div
            style={{
              ...statusCardStyle,
              background: "#f9fafb",
              borderColor: "#e5e7eb",
              color: "#6b7280",
            }}
          >
            <div
              style={{
                fontSize: "0.72rem",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontWeight: 700,
              }}
            >
              No inspection on record
            </div>
            <div style={{ fontSize: "0.85rem", marginTop: "0.45rem" }}>
              No inspection station has recorded a result.
            </div>
          </div>
        )}
      </div>

      {/* Vehicle facts */}
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
        <Field label="Created on-chain" value={fmtDate(summary.createdAt)} />
      </div>

      <h2>Event timeline</h2>
      {events.length === 0 ? (
        <p>No events written yet.</p>
      ) : (
        // `reversed` flips the auto-counter so newest-on-top still shows the
        // highest number; oldest at the bottom is "1." — the chronological
        // sequence the on-chain `event.sequence` field uses, +1.
        <ol reversed start={events.length} style={{ paddingLeft: "1.5rem" }}>
          {[...events].reverse().map((ev) => (
            <li key={ev.sequence} style={{ marginBottom: "0.75rem" }}>
              <div>
                <strong>{EventTypeLabel[ev.eventType]}</strong> —{" "}
                {fmtDate(ev.timestamp)}
                {ev.mileageKm > 0
                  ? ` — ${ev.mileageKm.toLocaleString()} km`
                  : ""}
              </div>
              <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>
                by {AuthorityKindLabel[ev.authorityKind]} — {ev.authorityName}
              </div>
              {(ev.validFrom > 0 || ev.validUntil > 0) && (
                <div style={{ color: "#6b7280", fontSize: "0.85rem" }}>
                  {ev.validFrom > 0 && <>valid from {fmtDate(ev.validFrom)}</>}
                  {ev.validFrom > 0 && ev.validUntil > 0 && " — "}
                  {ev.validUntil > 0 && <>until {fmtDate(ev.validUntil)}</>}
                </div>
              )}
              {ev.description && ev.description.trim() && (
                <div
                  style={{
                    marginTop: "0.4rem",
                    padding: "0.4rem 0.6rem",
                    background: "#f9fafb",
                    borderLeft: "3px solid #d1d5db",
                    color: "#374151",
                    fontSize: "0.88rem",
                    fontStyle: "italic",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  &ldquo;{ev.description}&rdquo;
                </div>
              )}
            </li>
          ))}
        </ol>
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
