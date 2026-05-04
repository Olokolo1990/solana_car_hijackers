# Vehicle Passport — Component Specification

This is the spec for the **Vehicle Passport** component of the project — a
per-VIN NFT on Solana with an append-only event history. It is distinct from,
and complementary to, the **Driver Passport** (telematics / insurance scoring)
described in the root `CLAUDE.md`.

| Component | Subject of the NFT | Lifecycle starts at |
|---|---|---|
| **Driver Passport** | A *driver* (wallet holder) | First telematics submission |
| **Vehicle Passport** | A *vehicle* (VIN) | Manufacture / factory registration |

The two share the Anchor toolchain and the Helius/Arweave/Lit infrastructure
but live in separate program crates and have separate frontends.

---

## End-to-end lifecycle

```
[Factory]                                                  [Buyer / Public]
   |                                                            ^
   | mint_vehicle_passport(vin, make, model, year, color, ...)  |
   v                                                            |
[Vehicle PDA + NFT mint] -- emits --> [event #0: Manufacture]   |
   |                                                            |
   | (lifetime — repeated by various authorities)               | VIN search →
   |                                                            | event timeline
   |  write_event(type, mileage, ...)                           |
   |    + uploadPhoto(file)        → Arweave                    |
   |    + uploadJsonPayload(...)   → Arweave                    |
   |    only hashes go on-chain                                 |
   v                                                            |
[Vehicle PDA + N event PDAs] ------ Helius DAS / RPC ----------→
```

## Account model

### `GlobalConfig` (singleton, PDA seeded by `["global_config"]`)
- `admin: Pubkey` — initially the deployer; later replaced by a Squads multi-sig
- `vehicle_count: u64`
- `authority_count: u64`

### `Authority` (PDA seeded by `["authority", signer_pubkey]`)
- `signer: Pubkey` — the wallet that this authority signs as
- `kind: u8` (`AuthorityKind` enum)
- `country_code: [u8; 2]` — ISO-3166 alpha-2
- `name: String` — public display name
- `active: bool`
- `events_written: u64`
- `registered_at: i64`

### `Vehicle` (PDA seeded by `["vehicle", sha256(vin)]`)
- `vin_hash: [u8; 32]`
- `mint: Pubkey` — Metaplex NFT mint linked to this passport
- `manufacturer: Pubkey` — Authority PDA that minted it
- `make / model / year / color_code`
- `equipment_hash: [u8; 32]` — sha256 of factory equipment package JSON on Arweave
- `last_mileage: u32` — for on-chain anti-rollback
- `event_count: u64`
- `created_at: i64`

### `VehicleEvent` (PDA seeded by `["event", vehicle_pubkey, event_count_le_bytes]`)
- `vehicle / authority / event_type / timestamp / mileage_km`
- `doc_arweave_tx: [u8; 32]` — pointer to Arweave-stored doc/photo
- `payload_hash: [u8; 32]` — sha256 of full structured JSON payload on Arweave
- `sequence: u64` — `event_count` at write time

> **v2 note**: per-event accounts cost ~$0.005 in rent. At scale, migrate to
> Metaplex Bubblegum compressed leaves to drop this to ~$0.0001/event.

## Authority → event-type permission matrix

| Authority kind            | Allowed event types                                                     |
|---------------------------|-------------------------------------------------------------------------|
| Manufacturer              | Recall (post-launch); also calls `mint_vehicle_passport`                |
| Registration office       | OwnershipTransfer, Scrapping (also via `transfer_ownership` ix)         |
| Police                    | Accident, Theft, Recovery                                               |
| Inspection station (SKP)  | Inspection, MileageReading                                              |
| Insurer                   | Accident, InsuranceClaim                                                |
| Customs                   | Import                                                                  |
| Authorized service center | Service, PartReplacement, MileageReading, Recall                        |

The matrix is enforced on-chain in `write_event::enforce_authority_can_write`.

## Event payload schema (off-chain JSON on Arweave)

The on-chain account only stores fixed-size fields and a `payload_hash`.
The full payload — variable-length text, multiple photos, structured details —
lives on Arweave and is referenced by `doc_arweave_tx`. The reader recomputes
sha256 of the downloaded JSON and compares to `payload_hash` to confirm
integrity.

Per-event-type schemas live in `docs/EVENT_SCHEMAS/` (TODO — one per type).

## Privacy posture

- VIN is public (visible on the windshield) → on-chain as `sha256(vin)`
- Personal owner data: never on-chain; only hashes for ownership transfer
- Photos with faces / plates: writers must redact pre-upload; the UI assists
- GDPR right-to-erasure: handled by deleting the off-chain Arweave content
  (when legally required) — the on-chain hash becomes meaningless without it

## Trust model (v1)

- All authorities are treated equally; the UI shows the writer's `kind` so
  readers can weigh the source themselves
- v2 will add a `trust_score: u16` field updated by an off-chain reputation
  oracle (events confirmed by a second authority within 30 days reinforce
  trust; disputed events reduce it)
