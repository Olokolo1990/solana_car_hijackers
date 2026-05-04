# solana_car_hijackers

Two-passport platform on Solana: a **Vehicle Passport** (NFT history per VIN) and a **Driver Passport** (telematics-based insurance score).

## Layout

```
.
├── Anchor.toml            ← Anchor workspace config
├── Cargo.toml             ← Rust workspace
├── package.json           ← Anchor JS test runner
├── Dockerfile             ← builds Python AI engine
├── compose.dev.yml        ← dev compose (AI engine with hot-reload)
├── .env.example
├── CLAUDE.md              ← Driver Passport architecture
├── PROJECT_OVERVIEW.md    ← Vehicle Passport product spec
│
├── programs/              ← Anchor program (Rust)
│   └── vehicle_history/
│       └── src/
│           ├── lib.rs
│           ├── constants.rs
│           ├── errors.rs
│           ├── state/                ← GlobalConfig, Authority, Vehicle, VehicleEvent
│           └── instructions/         ← initialize, register/revoke_authority, mint_vehicle_passport, write_event, transfer_ownership
│
├── tests/                 ← Anchor TypeScript integration tests
│
├── migrations/            ← anchor deploy → call initialize
│
├── app/                   ← Next.js 14 frontend (App Router)
│   ├── (public)/          ← VIN lookup, no wallet required
│   ├── (writer)/          ← institution portal, wallet required
│   ├── (admin)/           ← authority management
│   ├── components/        ← WalletProvider
│   ├── lib/               ← solana.ts (PDAs), arweave.ts (Irys uploads)
│   └── types/             ← mirrored on-chain enums
│
├── ai_engine/             ← Python AI: Driver Passport (telematics → score)
│   ├── pyproject.toml
│   ├── analyzer.py
│   ├── main.py            ← FastAPI: POST /analyze, GET /health
│   ├── models.py          ← Pydantic schemas
│   ├── notifications.py   ← ElevenLabs crash-call trigger
│   └── tests/
│
└── docs/                  ← deeper specs (data model, setup, etc.)
    ├── VEHICLE_PASSPORT_SPEC.md
    ├── DATA_MODEL.md
    └── SETUP.md
```

## Quick start

See [`docs/SETUP.md`](docs/SETUP.md) for the full step-by-step. Short version:

```bash
# Install Solana CLI + Rust + Anchor (see docs/SETUP.md for details)

# Build & deploy the program
anchor build
anchor deploy --provider.cluster devnet

# Run the frontend
cd app
cp .env.example .env.local
npm install
npm run dev          # http://localhost:3000
```

## Documentation

- [`PROJECT_OVERVIEW.md`](PROJECT_OVERVIEW.md) — Vehicle Passport product spec
- [`docs/VEHICLE_PASSPORT_SPEC.md`](docs/VEHICLE_PASSPORT_SPEC.md) — Component-level architecture
- [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) — Anchor account fields + PDA seeds
- [`docs/SETUP.md`](docs/SETUP.md) — End-to-end developer setup
- [`CLAUDE.md`](CLAUDE.md) — Driver Passport architecture (ai_engine/)
