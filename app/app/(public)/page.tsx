"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RoleDashboard } from "@/components/RoleDashboard";

type Mode = "vin" | "plate";

export default function VehicleLookupHome() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("vin");
  const [vin, setVin] = useState("");
  const [plate, setPlate] = useState("");

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "vin") {
      if (vin.trim().length === 17) {
        router.push(`/vehicle/${encodeURIComponent(vin.trim().toUpperCase())}`);
      }
    } else {
      const p = plate.trim().toUpperCase();
      if (p.length > 0) {
        router.push(`/plate/${encodeURIComponent(p)}`);
      }
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.6rem 0.7rem",
    fontSize: "1rem",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    fontFamily: "inherit",
  };
  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "0.5rem 1rem",
    fontSize: "0.9rem",
    fontWeight: 600,
    border: "1px solid",
    borderColor: active ? "#111827" : "#e5e7eb",
    background: active ? "#111827" : "white",
    color: active ? "white" : "#374151",
    borderRadius: 6,
    cursor: "pointer",
  });

  const canSubmit =
    mode === "vin" ? vin.trim().length === 17 : plate.trim().length > 0;

  return (
    <section>
      <h1>Vehicle History</h1>
      <p>
        Look up any vehicle&apos;s tamper-proof history on the public Solana
        registry. Search by 17-character VIN or by current license plate.
      </p>

      <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.5rem", marginBottom: "0.75rem" }}>
        <button type="button" style={tabStyle(mode === "vin")} onClick={() => setMode("vin")}>
          Search by VIN
        </button>
        <button type="button" style={tabStyle(mode === "plate")} onClick={() => setMode("plate")}>
          Search by license plate
        </button>
      </div>

      <form
        onSubmit={onSearch}
        style={{ display: "grid", gap: "0.75rem", maxWidth: 480 }}
      >
        {mode === "vin" ? (
          <>
            <input
              type="text"
              placeholder="17-character VIN, e.g. WVWZZZ1KZ8M094376"
              value={vin}
              onChange={(e) => setVin(e.target.value)}
              maxLength={17}
              style={{ ...inputStyle, fontFamily: "monospace", letterSpacing: "0.04em" }}
            />
            <span style={{ fontSize: "0.78rem", color: "#6b7280" }}>
              {vin.length}/17 — ISO 3779
            </span>
          </>
        ) : (
          <>
            <input
              type="text"
              placeholder="Current license plate, e.g. WX 12345"
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              maxLength={16}
              style={{ ...inputStyle, fontFamily: "monospace", letterSpacing: "0.06em" }}
            />
            <span style={{ fontSize: "0.78rem", color: "#6b7280" }}>
              Case-insensitive. The plate is whatever Government wrote on-chain at
              registration time.
            </span>
          </>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            padding: "0.65rem 1.4rem",
            fontSize: "1rem",
            background: canSubmit ? "#111827" : "#9ca3af",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: canSubmit ? "pointer" : "not-allowed",
            justifySelf: "start",
          }}
        >
          Search
        </button>
      </form>

      <RoleDashboard />
    </section>
  );
}
