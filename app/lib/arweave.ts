// Arweave integration via Irys SDK (Solana provider, devnet/free tier).
//
// Uploads are signed by the connected wallet and bundled into Arweave by
// Irys. The on-chain side stores only the sha-256 hash of the manifest,
// which is enough to verify integrity when reading back. Manifests are
// discoverable on Arweave via tag queries (App-Name + VIN-Hash + Type),
// avoiding the need to also store the Arweave tx ID on-chain.

import { sha256 } from "@noble/hashes/sha256";
import type {
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";

// Irys's Solana provider needs the wallet to expose signMessage for the
// bundler-auth handshake — narrower than useWallet's full state but wider
// than @solana/wallet-adapter-react's AnchorWallet (which lacks signMessage).
export interface SolanaSigner {
  publicKey: PublicKey;
  signMessage(message: Uint8Array): Promise<Uint8Array>;
  signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T>;
  signAllTransactions?<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]>;
}

export const ARWEAVE_GATEWAY = "https://arweave.net";
export const ARWEAVE_GRAPHQL = `${ARWEAVE_GATEWAY}/graphql`;

const APP_NAME = "vehicle-passport";

export interface UploadResult {
  arweaveId: string;
  contentHash: Uint8Array; // sha-256 of the uploaded bytes
  size: number;
}

export interface PhotoEntry {
  uri: string; // arweave URL
  type: string; // mime type
  name: string;
  size: number;
  contentHashHex: string;
}

export interface VehicleMetadata {
  // Metaplex-compatible NFT metadata structure.
  name: string;
  symbol: string;
  description: string;
  image: string; // first photo URL (used as primary visual)
  external_url?: string;
  attributes: { trait_type: string; value: string | number }[];
  properties: {
    files: { uri: string; type: string }[];
    category: "image";
  };
  // Vehicle-passport-specific extra context.
  vehicle_passport: {
    vin: string;
    vinHashHex: string;
    fuelType?: string;
    bodyType?: string;
    transmission?: string;
    engineCc?: number | null;
    powerHp?: number;
    weightKg?: number;
    seats?: number;
    colorName?: string;
    colorHex?: string;
    countryOfOrigin?: string;
    equipment?: string;
    photos: PhotoEntry[];
  };
}

// === Irys uploader (lazy + cached per-wallet) ===
//
// Irys SDK is heavy and pulls in WalletConnect transitive deps; importing it
// inline only when needed keeps the public read pages lighter.

// Wider typing for the Irys uploader instance — we also need price/balance
// helpers and a fund() to top up the bundler escrow when it's empty.
// BigNumber-like fields use bignumber.js; we treat them opaquely.
// BigNumber-like return values from Irys; we use the methods we need.
interface BigNumberLike {
  isLessThan(other: unknown): boolean;
  multipliedBy(factor: number): BigNumberLike;
  integerValue(roundingMode?: number): BigNumberLike;
  toFixed(): string;
}
interface IrysUploader {
  upload(
    data: Buffer | Uint8Array,
    opts: { tags: { name: string; value: string }[] }
  ): Promise<{ id: string }>;
  getPrice(bytes: number): Promise<BigNumberLike>;
  getLoadedBalance(): Promise<BigNumberLike>;
  fund(amount: BigNumberLike | string | number): Promise<unknown>;
}

/**
 * Top up the Irys bundler if its loaded balance is short for the upload.
 * Funding is a real SOL transfer from the connected wallet to Irys's
 * escrow address (Phantom will prompt). Adds 20% margin to absorb Irys's
 * gas fluctuations.
 */
async function ensureFundedForBytes(
  irys: IrysUploader,
  bytes: number
): Promise<void> {
  const price = await irys.getPrice(bytes);
  const balance = await irys.getLoadedBalance();
  if (balance.isLessThan(price)) {
    // Irys's fund() requires an integer atomic-unit amount. multipliedBy(1.2)
    // can produce a decimal — round up. BigNumber.ROUND_UP is 0 in bignumber.js
    // but we pass a string of the integer to be format-agnostic.
    const fundAmount = price.multipliedBy(1.2).integerValue(0).toFixed();
    await irys.fund(fundAmount);
  }
}

async function getIrysUploader(wallet: SolanaSigner): Promise<IrysUploader> {
  const { WebUploader } = await import("@irys/web-upload");
  const { WebSolana } = await import("@irys/web-upload-solana");
  // Irys "devnet" node — free for testing, data persists ~weeks. Switch to
  // .mainnet() (default) for production.
  // The wallet adapter must implement signTransaction / signAllTransactions
  // (AnchorWallet from @solana/wallet-adapter-react does).
  const irys = await WebUploader(WebSolana)
    .withProvider(wallet)
    .withRpc("https://api.devnet.solana.com")
    .devnet();
  await irys.ready();
  return irys as unknown as IrysUploader;
}

// === Tag helpers ===

function commonTags(
  vinHashHex: string,
  type: "photo" | "metadata",
  extras: { name: string; value: string }[] = []
): { name: string; value: string }[] {
  return [
    { name: "App-Name", value: APP_NAME },
    { name: "VIN-Hash", value: vinHashHex },
    { name: "Type", value: type },
    ...extras,
  ];
}

// === Uploads ===

export async function uploadPhoto(
  file: File,
  wallet: SolanaSigner,
  vinHashHex: string,
  index: number
): Promise<UploadResult> {
  const irys = await getIrysUploader(wallet);
  const buf = new Uint8Array(await file.arrayBuffer());
  const contentHash = sha256(buf);
  await ensureFundedForBytes(irys, buf.length);
  const tx = await irys.upload(Buffer.from(buf), {
    tags: commonTags(vinHashHex, "photo", [
      { name: "Content-Type", value: file.type || "application/octet-stream" },
      { name: "File-Name", value: file.name },
      { name: "Index", value: String(index) },
    ]),
  });
  return { arweaveId: tx.id, contentHash, size: file.size };
}

export async function uploadMetadata(
  metadata: VehicleMetadata,
  wallet: SolanaSigner,
  vinHashHex: string
): Promise<UploadResult & { jsonString: string }> {
  const irys = await getIrysUploader(wallet);
  const jsonString = JSON.stringify(metadata);
  const buf = new TextEncoder().encode(jsonString);
  const contentHash = sha256(buf);
  await ensureFundedForBytes(irys, buf.length);
  const tx = await irys.upload(Buffer.from(buf), {
    tags: commonTags(vinHashHex, "metadata", [
      { name: "Content-Type", value: "application/json" },
    ]),
  });
  return { arweaveId: tx.id, contentHash, size: buf.length, jsonString };
}

// === Reads ===

export function arweaveUrl(txId: string): string {
  return `${ARWEAVE_GATEWAY}/${txId}`;
}

/**
 * Find the latest metadata transaction for a given VIN hash via Arweave's
 * tag-indexed GraphQL endpoint. Returns the tx id or null if not found.
 */
export async function findMetadataByVinHash(
  vinHashHex: string
): Promise<string | null> {
  const query = `
    query {
      transactions(
        tags: [
          { name: "App-Name", values: ["${APP_NAME}"] }
          { name: "VIN-Hash", values: ["${vinHashHex}"] }
          { name: "Type", values: ["metadata"] }
        ]
        first: 1
      ) {
        edges { node { id } }
      }
    }
  `;
  try {
    const res = await fetch(ARWEAVE_GRAPHQL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      // server components: this runs in Node; cache: "no-store" keeps it fresh.
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    const edges = data?.data?.transactions?.edges as
      | { node: { id: string } }[]
      | undefined;
    if (!edges?.length) return null;
    return edges[0].node.id;
  } catch (err) {
    console.warn("findMetadataByVinHash: GraphQL query failed:", err);
    return null;
  }
}

/**
 * Fetch and parse a metadata JSON from Arweave. Returns the parsed object
 * AND the raw bytes (so the caller can verify the on-chain hash matches).
 */
export async function fetchMetadataAndBytes(
  arweaveId: string
): Promise<{ metadata: VehicleMetadata; bytes: Uint8Array } | null> {
  try {
    const res = await fetch(arweaveUrl(arweaveId), { cache: "no-store" });
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    const text = new TextDecoder().decode(buf);
    const metadata = JSON.parse(text) as VehicleMetadata;
    return { metadata, bytes: buf };
  } catch (err) {
    console.warn("fetchMetadataAndBytes: failed to fetch:", err);
    return null;
  }
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
