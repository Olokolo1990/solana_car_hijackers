// Seed 4 demo authority wallets (Police, Inspection, Insurer, Government)
// so each role can be tested end-to-end on /write.
//
// Idempotent: re-running picks up existing keypair files and skips already-
// registered authorities. New runs only register what's missing.
//
// Run with:
//   ANCHOR_WALLET=$HOME/.config/solana/dev-wallet.json \
//     ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
//     npx ts-node scripts/seed-roles.ts
//
// Skip airdrops (e.g. on rate-limit):
//   SEED_ROLES_NO_AIRDROP=1 npx ts-node scripts/seed-roles.ts
//
// Effect:
//   1. For each role: load or generate keypair at keys/<role>.json.
//   2. Airdrop 0.05 SOL if balance < 0.02 SOL (skippable).
//   3. Call register_authority from the admin wallet for each new role.
//   4. Print a summary table: role | pubkey | keyfile | base58 secret (Phantom import).

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import * as fs from "fs";
import * as path from "path";
import { VehicleHistory } from "../target/types/vehicle_history";

// Mirrors AuthorityKind in app/types/events.ts.
const AuthorityKind = {
  Manufacturer: 0,
  RegistrationOffice: 1,
  Police: 2,
  InspectionStation: 3,
  Insurer: 4,
  Customs: 5,
  AuthorizedServiceCenter: 6,
} as const;

interface RoleSpec {
  /** Slug used as the keypair filename. */
  slug: string;
  kind: number;
  /** ISO-3166 alpha-2 country, on-chain authority's jurisdiction. */
  country: string;
  /** Display name written into the on-chain Authority account. */
  displayName: string;
}

const ROLES: RoleSpec[] = [
  {
    slug: "police",
    kind: AuthorityKind.Police,
    country: "PL",
    displayName: "Komenda Stołeczna Policji (demo)",
  },
  {
    slug: "inspection",
    kind: AuthorityKind.InspectionStation,
    country: "PL",
    displayName: "Stacja Kontroli Pojazdów Warszawa (demo)",
  },
  {
    slug: "insurer",
    kind: AuthorityKind.Insurer,
    country: "PL",
    displayName: "PZU SA (demo)",
  },
  {
    slug: "government",
    kind: AuthorityKind.RegistrationOffice,
    country: "PL",
    displayName: "Wydział Komunikacji Warszawa (demo)",
  },
];

const KEYS_DIR = path.resolve(__dirname, "..", "keys");
const MIN_BALANCE_LAMPORTS = 0.02 * LAMPORTS_PER_SOL;
const AIRDROP_LAMPORTS = 0.05 * LAMPORTS_PER_SOL;
const SEED_AUTHORITY = Buffer.from("authority");

function loadOrCreateKeypair(slug: string): { kp: Keypair; created: boolean } {
  const file = path.join(KEYS_DIR, `${slug}.json`);
  if (fs.existsSync(file)) {
    const raw = JSON.parse(fs.readFileSync(file, "utf8")) as number[];
    return { kp: Keypair.fromSecretKey(Uint8Array.from(raw)), created: false };
  }
  fs.mkdirSync(KEYS_DIR, { recursive: true });
  const kp = Keypair.generate();
  fs.writeFileSync(file, JSON.stringify(Array.from(kp.secretKey)));
  return { kp, created: true };
}

function deriveAuthority(programId: PublicKey, signer: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [SEED_AUTHORITY, signer.toBuffer()],
    programId
  );
}

async function ensureFunded(
  provider: anchor.AnchorProvider,
  pubkey: PublicKey,
  slug: string
): Promise<void> {
  if (process.env.SEED_ROLES_NO_AIRDROP === "1") return;
  const bal = await provider.connection.getBalance(pubkey);
  if (bal >= MIN_BALANCE_LAMPORTS) {
    console.log(`     balance ok (${(bal / LAMPORTS_PER_SOL).toFixed(4)} SOL)`);
    return;
  }
  try {
    const sig = await provider.connection.requestAirdrop(
      pubkey,
      AIRDROP_LAMPORTS
    );
    await provider.connection.confirmTransaction(sig, "confirmed");
    console.log(`     airdropped 0.05 SOL — tx ${sig}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(
      `     airdrop FAILED (${slug}) — ${msg.slice(0, 140)}\n` +
        `     funding manually:  solana transfer ${pubkey.toBase58()} 0.05 -u devnet --allow-unfunded-recipient`
    );
  }
}

async function main() {
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const program = anchor.workspace.VehicleHistory as Program<VehicleHistory>;
  const admin = provider.wallet.publicKey;

  console.log("Program:", program.programId.toBase58());
  console.log("Admin:  ", admin.toBase58());
  console.log("Keys directory:", KEYS_DIR);
  console.log();

  const summary: Array<{
    slug: string;
    pubkey: string;
    file: string;
    secretBase58: string;
    status: string;
  }> = [];

  for (let i = 0; i < ROLES.length; i++) {
    const role = ROLES[i];
    const tag = `[${i + 1}/${ROLES.length}] ${role.slug}`;
    console.log(tag);

    const { kp, created } = loadOrCreateKeypair(role.slug);
    console.log(
      `     keypair ${created ? "GENERATED" : "loaded   "} → ${kp.publicKey.toBase58()}`
    );

    await ensureFunded(provider, kp.publicKey, role.slug);

    const [authorityPda] = deriveAuthority(program.programId, kp.publicKey);
    const existing = await program.account.authority.fetchNullable(authorityPda);

    let status: string;
    if (existing) {
      status =
        existing.kind === role.kind
          ? "already registered"
          : `MISMATCH: on-chain kind=${existing.kind} expected=${role.kind}`;
      console.log(
        `     authority exists — kind=${existing.kind} name="${existing.name}" active=${existing.active}`
      );
    } else {
      const tx = await program.methods
        .registerAuthority(
          role.kind,
          [...role.country].map((c) => c.charCodeAt(0)) as [number, number],
          role.displayName
        )
        .accountsPartial({
          admin,
          newAuthoritySigner: kp.publicKey,
        })
        .rpc();
      status = "registered";
      console.log(`     registered as ${role.displayName} — tx ${tx}`);
    }

    summary.push({
      slug: role.slug,
      pubkey: kp.publicKey.toBase58(),
      file: path.join("keys", `${role.slug}.json`),
      secretBase58: bs58.encode(kp.secretKey),
      status,
    });
    console.log();
  }

  // Final summary table.
  console.log("=".repeat(80));
  console.log("ROLE SEEDING SUMMARY");
  console.log("=".repeat(80));
  for (const row of summary) {
    console.log(`role:    ${row.slug}  (${row.status})`);
    console.log(`pubkey:  ${row.pubkey}`);
    console.log(`keyfile: ${row.file}`);
    console.log(`phantom: ${row.secretBase58}`);
    console.log();
  }
  console.log(
    "Phantom import: Settings → Add / Connect Wallet → Import private key →\n" +
      "paste the `phantom:` base58 string. Switch Phantom to Devnet first."
  );
  console.log(
    "\nNext: connect each wallet to /write and confirm the green authority\n" +
      "badge shows the expected role."
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
