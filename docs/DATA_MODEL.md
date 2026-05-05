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

## Off-chain (Postgres)

Dev connection: `postgresql://vpassport:vpassport@localhost:5432/vpassport` (see `compose.dev.yml`).

### `telemetry_sessions`

Staging area for raw telematics before AI analysis + Arweave upload. Rows are soft-deleted after a successful `driver_reports` write.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| driver_wallet | varchar(44) | base58 Solana pubkey |
| raw_payload | jsonb | raw telematics blob from mobile client |
| status | varchar(16) | `pending` \| `analyzed` \| `failed` |
| created_at | timestamptz | |

### `driver_reports`

AI engine output, persisted before the on-chain write attempt.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| session_id | uuid FK → telemetry_sessions | |
| driver_wallet | varchar(44) | |
| score | smallint | 0–100 |
| risk_level | varchar(8) | `low` \| `medium` \| `high` |
| crash_detected | boolean | |
| summary | text | LLM-generated explanation |
| on_chain_tx | varchar(88) | tx sig after successful Solana write, null until confirmed |
| created_at | timestamptz | |

### `vehicle_index`

Denormalized cache of on-chain `Vehicle` + recent `VehicleEvent` data. Populated by an indexer reading from the Solana RPC. Lets the Next.js VIN search query Postgres instead of hitting the RPC per request.

| Column | Type | Notes |
|---|---|---|
| vin_hash | bytea(32) PK | matches on-chain seed |
| make | varchar(32) | |
| model | varchar(32) | |
| year | smallint | |
| last_mileage | int | |
| event_count | bigint | |
| last_synced_slot | bigint | last Solana slot processed |

## Numeric ranges

- Mileage: `u32` → max 4.29 billion km. Plenty.
- Event count per vehicle: `u64` → effectively unlimited.
- Color code: `u32` packed RGB (`0xRRGGBB00`) or OEM-specific code.
