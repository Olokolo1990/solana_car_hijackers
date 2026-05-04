# Developer Setup — step by step

This walks through everything from a fresh Windows machine to a deployed
Vehicle History program on devnet with the frontend talking to it.

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

All Anchor commands run from the **repo root**.

```bash
# Generate a fresh program keypair (do this ONCE per project, never share)
mkdir -p target/deploy
solana-keygen new -o target/deploy/vehicle_history-keypair.json --no-bip39-passphrase

# Update declare_id! with the new pubkey
solana-keygen pubkey target/deploy/vehicle_history-keypair.json
# → paste into programs/vehicle_history/src/lib.rs:declare_id!("...")
# → also into Anchor.toml under [programs.localnet] and [programs.devnet]

anchor build
anchor deploy --provider.cluster devnet
```

After build, the IDL lives at `target/idl/vehicle_history.json` and the TS
types at `target/types/vehicle_history.ts`. The frontend imports them
directly from there.

## 3. Initialize the program (one-time)

```bash
anchor run initialize    # calls migrations/deploy.ts
```

This sets your wallet as the on-chain `admin`.

## 4. Register the first authority (admin only)

Use the admin UI (no CLI script yet):

1. `cd app && npm run dev`
2. Open http://localhost:3000/register
3. Connect the admin wallet
4. Fill in the form: signer pubkey, kind, country, display name
5. Submit

## 5. Run the frontend

```bash
cd app
cp .env.example .env.local
# Edit .env.local: set NEXT_PUBLIC_PROGRAM_ID = your declare_id pubkey
npm install
npm run dev
```

Routes:
- http://localhost:3000/                 — public VIN lookup
- http://localhost:3000/vehicle/{vin}    — public history detail
- http://localhost:3000/write            — authority writer portal (wallet)
- http://localhost:3000/authorities      — admin: list authorities
- http://localhost:3000/register         — admin: onboard new authority

## 6. (Optional) Run the AI engine for Driver Passport

```bash
docker compose -f compose.dev.yml up
# or directly:
cd ai_engine
pip install -r requirements.txt
uvicorn main:app --reload
```

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `anchor build` fails on Windows with linker issues | Native Windows toolchain | Move to WSL2 |
| `anchor deploy` fails with insufficient funds | Devnet airdrop quota hit | Use https://faucet.solana.com/ |
| Frontend "program not found" error | `NEXT_PUBLIC_PROGRAM_ID` doesn't match deployed program | Re-copy from `solana-keygen pubkey target/deploy/...keypair.json` |
| `getProgramAccounts` is slow | Devnet RPC is throttled | Use a Helius API key (`NEXT_PUBLIC_HELIUS_API_KEY`) |

## Workflow summary

1. **Branch off `main`** with `feat/<short-name>` or `fix/<short-name>`
2. **Rust changes** → `anchor build && anchor test`
3. **Frontend changes** → `cd app && npm run dev`
4. **PR to `main`**, ask one teammate for review, squash-merge
