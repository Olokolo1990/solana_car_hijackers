"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function VinLookupHome() {
  const router = useRouter();
  const [vin, setVin] = useState("");

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    if (vin.trim().length === 17) {
      router.push(`/vehicle/${encodeURIComponent(vin.trim().toUpperCase())}`);
    }
  }

  return (
    <section>
      <h1>Vehicle History</h1>
      <p>Enter a VIN to view its complete, tamper-proof history.</p>
      <form onSubmit={onSearch} style={{ marginTop: "1.5rem" }}>
        <input
          type="text"
          placeholder="17-character VIN"
          value={vin}
          onChange={(e) => setVin(e.target.value)}
          maxLength={17}
          style={{ width: "60%", padding: "0.6rem", fontSize: "1rem" }}
        />
        <button
          type="submit"
          disabled={vin.trim().length !== 17}
          style={{ padding: "0.6rem 1.2rem", marginLeft: "0.5rem" }}
        >
          Search
        </button>
      </form>
    </section>
  );
}
