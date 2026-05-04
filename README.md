# solana_car_hijackers

Two-passport car insurance + history platform on Solana.

## What's in this repo

| Component | Folder | Status |
|---|---|---|
| **Driver Passport** — telematics → AI risk score → cNFT (insurance) | `ai_engine/`, planned `anchor_program/` | AI engine in progress |
| **Vehicle Passport** — per-VIN NFT + appendable history (factory → resale) | `anchor_program/`, `client/`, `sdk/` | Skeleton scaffolded |

The two are independent products that share the same toolchain and live in
the same monorepo. See `docs/PROJECT_OVERVIEW.md` for the Vehicle Passport
product spec, and `CLAUDE.md` for the Driver Passport architecture.

## Repo layout

```
.
├── ai_engine/           Python — Driver Passport: telematics + LLM analysis
├── anchor_program/      Rust/Anchor — Vehicle Passport program (and future Driver Passport program)
├── client/              Next.js — Vehicle Passport public lookup + writer portal
├── sdk/                 TypeScript — shared SDK consumed by client/ and tests
├── docs/                Specs, data model, project overview
├── Dockerfile           ai_engine image
└── compose.dev.yml      local dev stack for ai_engine
```

## Quick start

See [`docs/SETUP.md`](docs/SETUP.md) for the full step-by-step.

```bash
# 1. Install Solana CLI + Rust + Anchor (see docs/SETUP.md)
# 2. Configure devnet wallet
solana config set --url https://api.devnet.solana.com
solana airdrop 2

# 3. Build the on-chain program
cd anchor_program
anchor build
anchor deploy --provider.cluster devnet

# 4. Run the frontend
cd ../client
cp .env.example .env.local
npm install
npm run dev    # http://localhost:3000
```

## Documentation

- [`docs/PROJECT_OVERVIEW.md`](docs/PROJECT_OVERVIEW.md) — Vehicle Passport product spec
- [`docs/VEHICLE_PASSPORT_SPEC.md`](docs/VEHICLE_PASSPORT_SPEC.md) — Component-level architecture
- [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) — Anchor account fields + PDA seeds
- [`docs/SETUP.md`](docs/SETUP.md) — End-to-end developer setup
- [`CLAUDE.md`](CLAUDE.md) — Driver Passport architecture (separate component)
