// Solana client + PDA derivation. Used across all route groups.

import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { sha256 } from "@noble/hashes/sha256";

export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID ??
    "HkbccHJ45V7zbgLkwr64EUzRhfjdH1mcoQ5UVMAte341"
);

export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ?? clusterApiUrl("devnet");

export const connection = new Connection(RPC_URL, "confirmed");

const enc = new TextEncoder();

export const SEEDS = {
  globalConfig: enc.encode("global_config"),
  authority: enc.encode("authority"),
  vehicle: enc.encode("vehicle"),
  event: enc.encode("event"),
};

export function vinHash(vin: string): Uint8Array {
  return sha256(enc.encode(vin.trim().toUpperCase()));
}

export function deriveVehiclePda(vin: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.vehicle, vinHash(vin)],
    PROGRAM_ID
  );
}

export function deriveAuthorityPda(signer: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.authority, signer.toBuffer()],
    PROGRAM_ID
  );
}

export function deriveGlobalConfigPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([SEEDS.globalConfig], PROGRAM_ID);
}

export function deriveEventPda(
  vehicle: PublicKey,
  sequence: bigint
): [PublicKey, number] {
  const seqBytes = new Uint8Array(8);
  new DataView(seqBytes.buffer).setBigUint64(0, sequence, true);
  return PublicKey.findProgramAddressSync(
    [SEEDS.event, vehicle.toBuffer(), seqBytes],
    PROGRAM_ID
  );
}

// TODO: implement using Helius DAS API once IDL is generated.
export async function fetchVehicleEvents(_vin: string) {
  return [];
}
