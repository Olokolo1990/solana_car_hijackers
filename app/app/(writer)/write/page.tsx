"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { EventType, EventTypeLabel } from "@/types/events";

export default function WriteEventPage() {
  const { publicKey } = useWallet();
  const [vin, setVin] = useState("");
  const [eventType, setEventType] = useState<EventType>(EventType.Inspection);
  const [mileage, setMileage] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!publicKey) return;
    setSubmitting(true);
    try {
      // TODO: full submission flow:
      //   1. uploadPhoto(photo) -> arweaveId, contentHash
      //   2. uploadJsonPayload({...}) -> arweaveId, payloadHash
      //   3. derive vehicle PDA from vin
      //   4. build write_event ix via Anchor program
      //   5. send + confirm
      console.log({ signer: publicKey.toBase58(), vin, eventType, mileage, photo: photo?.name });
      alert("Stub: not yet wired. See TODOs.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <h1>Submit event</h1>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: "1rem" }}>
        <label>
          VIN
          <input
            required
            maxLength={17}
            value={vin}
            onChange={(e) => setVin(e.target.value)}
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </label>
        <label>
          Event type
          <select
            value={eventType}
            onChange={(e) => setEventType(Number(e.target.value) as EventType)}
            style={{ width: "100%", padding: "0.5rem" }}
          >
            {Object.entries(EventTypeLabel).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
        </label>
        <label>
          Mileage (km)
          <input
            type="number"
            required
            value={mileage}
            onChange={(e) => setMileage(e.target.value)}
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </label>
        <label>
          Photo (optional)
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          />
        </label>
        <button type="submit" disabled={submitting} style={{ padding: "0.6rem 1.2rem" }}>
          {submitting ? "Submitting…" : "Submit event"}
        </button>
      </form>
    </section>
  );
}
