# Data Model — Vehicle Passport

Quick reference for what's stored where. For full justifications see
`VEHICLE_PASSPORT_SPEC.md`.

## On-chain (Solana program accounts)

Every field below is fixed-size to keep account allocation predictable.

### `GlobalConfig`

| Field | Type | Purpose |
|---|---|---|
| admin | Pubkey | wallet allowed to call register_/revoke_authority |
| vehicle_count | u64 | total vehicles minted |
| authority_count | u64 | total authorities (active + revoked) |
| bump | u8 | PDA bump |

### `Authority`

| Field | Type | Notes |
|---|---|---|
| signer | Pubkey | wallet whose key authorizes write_event |
| kind | u8 | AuthorityKind enum |
| country_code | [u8; 2] | ISO-3166 alpha-2, e.g. b"PL" |
| name | String (≤64) | display name |
| active | bool | flip false to revoke |
| events_written | u64 | counter |
| registered_at | i64 | unix seconds |
| bump | u8 | |

### `Vehicle`

| Field | Type | Notes |
|---|---|---|
| vin_hash | [u8; 32] | sha256 of canonicalized VIN |
| mint | Pubkey | Metaplex NFT mint |
| manufacturer | Pubkey | Authority PDA that minted |
| make | String (≤32) | "BMW" |
| model | String (≤32) | "320i xDrive" |
| year | u16 | 2024 |
| color_code | u32 | factory color code (RGB or OEM-specific) |
| equipment_hash | [u8; 32] | hash of equipment JSON on Arweave |
| last_mileage | u32 | for on-chain anti-rollback |
| event_count | u64 | next event sequence number |
| created_at | i64 | unix seconds |
| bump | u8 | |

### `VehicleEvent`

| Field | Type | Notes |
|---|---|---|
| vehicle | Pubkey | parent Vehicle PDA |
| authority | Pubkey | Authority PDA that wrote it |
| event_type | u8 | EventType enum |
| timestamp | i64 | unix seconds |
| mileage_km | u32 | 0 if event type doesn't require mileage |
| doc_arweave_tx | [u8; 32] | pointer to off-chain doc/photo |
| payload_hash | [u8; 32] | sha256 of full JSON payload on Arweave |
| sequence | u64 | matches Vehicle.event_count at write time |
| bump | u8 | |

## Off-chain (Arweave)

Each event optionally points to **two** Arweave entries via `doc_arweave_tx`:

- A **photo** (image/jpeg or image/webp, redacted)
- A **structured JSON payload** with all the fields too variable-length to
  pin on-chain (inspection notes, claim IDs, defect descriptions, etc.)

The reader pipeline:

1. Read `VehicleEvent` from chain
2. `GET https://arweave.net/{doc_arweave_tx}` → receive JSON
3. Verify `sha256(json) === payload_hash` → integrity confirmed
4. Render UI from JSON; show a green "✓ verified" badge

## PDA seed table

| PDA | Seeds |
|---|---|
| GlobalConfig | `["global_config"]` |
| Authority | `["authority", signer_pubkey]` |
| Vehicle | `["vehicle", sha256(vin)]` |
| VehicleEvent | `["event", vehicle_pubkey, event_count_le_bytes]` |

## Numeric ranges

- Mileage: `u32` → max 4.29 billion km. Plenty.
- Event count per vehicle: `u64` → effectively unlimited.
- Color code: `u32` packed RGB (`0xRRGGBB00`) or OEM-specific code.
