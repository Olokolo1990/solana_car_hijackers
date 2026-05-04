# Developer Setup — step by step

This walks through everything from a fresh Windows machine to a deployed
Vehicle Passport program on devnet with the frontend talking to it.

## 0. What you need installed

| Tool | Why | Install |
|---|---|---|
| **Solana CLI** | deploy program, airdrop, key management | `https://release.anza.xyz/stable/solana-install-init-x86_64-pc-windows-msvc.exe` |
| **Rust** | compiles the Anchor program | `https://rustup.rs` |
| **Anchor** | Solana program framework | `cargo install --git https://github.com/coral-xyz/anchor avm --locked && avm install 0.30.1 && avm use 0.30.1` |
| **Node.js 20+** | frontend + scripts | `winget install OpenJS.NodeJS.LTS` |
| **Yarn or npm** | already with Node | — |
| **Git + GitHub CLI** | already set up | `gh auth login` |

> On Windows, Anchor is happiest in **WSL2 (Ubuntu)**. Native Windows works
> for `solana` CLI and the frontend, but `anchor build` is much smoother
> from WSL. If you're new to Solana on Windows, install WSL2 once and do all
> Anchor work there.

## 1. Solana CLI + devnet wallet

```bash
solana --version                                       # confirm install
solana config set --url https://api.devnet.solana.com
solana-keygen new --outfile ~/.config/solana/dev-wallet.json
solana config set --keypair ~/.config/solana/dev-wallet.json
solana address                                         # save this somewhere
solana airdrop 2                                       # 2 SOL on devnet
solana balance
```

If `airdrop` is rate-limited, use `https://faucet.solana.com/`.

## 2. Build & deploy the Anchor program

```bash
cd anchor_program

# Generate a fresh program keypair (do this ONCE per project, never share)
solana-keygen new -o target/deploy/vehicle_passport-keypair.json --no-bip39-passphrase

# Update declare_id! in lib.rs with the new pubkey
solana-keygen pubkey target/deploy/vehicle_passport-keypair.json
# → paste into programs/vehicle_passport/src/lib.rs:declare_id!("...")
# → also into Anchor.toml under [programs.localnet] and [programs.devnet]

anchor build
anchor deploy --provider.cluster devnet

# Copy the generated IDL to the SDK
cp target/idl/vehicle_passport.json ../sdk/src/idl.json
cp target/types/vehicle_passport.ts ../sdk/src/types-generated.ts
```

## 3. Initialize the program (one-time)

```bash
cd anchor_program
anchor run initialize    # calls migrations/deploy.ts
```

This sets your wallet as the on-chain `admin`.

## 4. Register the first authority (admin only)

There is no UI for this yet — use a CLI script (TODO):

```bash
# Pseudo-command for now; add scripts/register-authority.ts as part of v1
ts-node scripts/register-authority.ts \
  --signer  <signer_pubkey> \
  --kind    inspection_station \
  --country PL \
  --name    "SKP Warszawa Mokotów"
```

## 5. Run the frontend

```bash
cd client
cp .env.example .env.local
# Edit .env.local: set NEXT_PUBLIC_PROGRAM_ID = your declare_id pubkey
npm install
npm run dev
# Open http://localhost:3000 — public lookup
# Open http://localhost:3000/write — authority writer portal
```

## 6. Run the SDK build (optional, for tests)

```bash
cd sdk
npm install
npm run build
```

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `anchor build` errors with linker issues on Windows | Native Windows toolchain | Move to WSL2 |
| `anchor deploy` fails with insufficient funds | Devnet airdrop quota hit | Use https://faucet.solana.com/ |
| Frontend "program not found" error | `NEXT_PUBLIC_PROGRAM_ID` doesn't match deployed program | Re-copy from `solana-keygen pubkey target/deploy/...keypair.json` |
| `getProgramAccounts` is slow | Devnet RPC is throttled | Use a Helius API key (`NEXT_PUBLIC_HELIUS_API_KEY`) |

## Workflow summary

For ongoing work:

1. **Branch off `main`** with `feat/<short-name>` or `fix/<short-name>`
2. **Rust changes** → `cd anchor_program && anchor build && anchor test`
3. **Frontend changes** → `cd client && npm run dev`
4. **Copy IDL after every program change** → `target/idl/...json` → `sdk/src/idl.json`
5. **PR to `main`**, ask one teammate for review, squash-merge
