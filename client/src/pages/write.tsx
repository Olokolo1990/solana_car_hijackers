// Authority writer portal — only registered authorities can submit events.
// Wallet must be connected and registered as an Authority on-chain.

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { EventType, EventTypeLabel } from "@/types/events";

export default function WritePage() {
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
      // TODO: wire the full flow:
      //   1. uploadPhoto(photo) -> arweaveId, contentHash
      //   2. uploadJsonPayload({ ...form fields }) -> arweaveId, payloadHash
      //   3. derive vehicle PDA from vin
      //   4. build write_event ix via Anchor program
      //   5. send + confirm
      console.log({
        signer: publicKey.toBase58(),
        vin,
        eventType,
        mileage,
        photo: photo?.name,
      });
      alert("Stub: event submission not yet wired. See TODO comments.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Authority Writer Portal</h1>
      <WalletMultiButton />
      {!publicKey && <p>Connect your authority wallet to write events.</p>}

      {publicKey && (
        <form onSubmit={onSubmit} style={{ marginTop: "2rem" }}>
          <label>
            VIN
            <input
              required
              maxLength={17}
              value={vin}
              onChange={(e) => setVin(e.target.value)}
            />
          </label>
          <label>
            Event type
            <select
              value={eventType}
              onChange={(e) => setEventType(Number(e.target.value) as EventType)}
            >
              {Object.entries(EventTypeLabel).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
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
          <button type="submit" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit event"}
          </button>
        </form>
      )}
    </main>
  );
}
