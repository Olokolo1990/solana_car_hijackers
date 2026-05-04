# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A decentralized, privacy-preserving car insurance platform on Solana. AI analyzes raw driving telematics and writes a "Driver Passport" (score + risk level) on-chain as a compressed NFT. Raw logs are encrypted and stored permanently on Arweave; a crash triggers an automated ElevenLabs claims call.

## Architecture

The system has four loosely coupled components that communicate via JSON:

```
[Mobile/Client] --> raw telematics JSON
        |
        v
[Phase 1: Python AI Engine]  <-- OpenAI / Gemini
        |  DriverReport JSON (score, risk_level, crash_detected, summary)
        v
[Phase 2: Rust/Anchor on Solana]
        |  update_passport instruction  -->  on-chain DriverPassport account
        |  Helius/Bubblegum             -->  cNFT metadata update
        v
[Phase 3: Lit Protocol + Arweave]
        |  Lit Actions encrypt raw logs, Arweave stores ciphertext permanently
        v
[ElevenLabs] <-- webhook if crash_detected == true
```

### Core Data Contract

The `DriverReport` is the canonical handoff between the Python AI engine and the Rust backend:

```
score: int (0-100, higher = safer)
risk_level: str ("low" | "medium" | "high")
crash_detected: bool
summary: str
```

### Component Layout (planned)

```
solana_hckth_pj/
├── ai_engine/          # Python — telematics ingestion + LLM analysis
├── anchor_program/     # Rust/Anchor — on-chain DriverPassport program
├── rust_validator/     # Rust service — deserializes DriverReport, calls Anchor
├── client/             # JS/TS — Lit Protocol encryption, Arweave upload
└── webhooks/           # ElevenLabs crash-call trigger
```

## Development Commands

### Python AI Engine (`ai_engine/`)

```bash
pip install -r requirements.txt
python -m pytest                        # run all tests
python -m pytest tests/test_report.py  # run single test file
uvicorn main:app --reload               # run dev server
```

### Rust Validator (`rust_validator/`)

```bash
cargo build
cargo test
cargo run
```

### Anchor Program (`anchor_program/`)

```bash
anchor build
anchor test                             # spins up localnet + runs tests
anchor deploy --provider.cluster devnet
```

### Client (`client/`)

```bash
npm install
npm run dev
npm test
```

## Key External Integrations

| Integration | Purpose | Env Var |
|---|---|---|
| OpenAI / Gemini | LLM driving behavior analysis | `OPENAI_API_KEY` / `GEMINI_API_KEY` |
| ElevenLabs | Automated crash claims call | `ELEVENLABS_API_KEY` |
| Helius | Solana RPC + Bubblegum cNFT updates | `HELIUS_API_KEY` |
| Lit Protocol | Client-side telematics encryption | — |
| Arweave | Permanent encrypted log storage | `ARWEAVE_WALLET_PATH` |

## On-Chain Program Notes

- Program uses Anchor framework; the main instruction is `update_passport`.
- The `DriverPassport` account PDA is derived from the driver's wallet public key.
- cNFT metadata is updated via Metaplex Bubblegum through Helius Digital Asset API.
- Deploy target is Solana devnet during development.

## Lit Protocol Access Control

Lit Actions must enforce that only the AI Engine's authorized wallet can decrypt raw telematics logs. The decryption key is never exposed to the client or stored on-chain.
