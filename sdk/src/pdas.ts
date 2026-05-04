import { PublicKey } from "@solana/web3.js";
import { sha256 } from "@noble/hashes/sha256";

const enc = new TextEncoder();

export const SEED_GLOBAL_CONFIG = enc.encode("global_config");
export const SEED_AUTHORITY = enc.encode("authority");
export const SEED_VEHICLE = enc.encode("vehicle");
export const SEED_EVENT = enc.encode("event");

export function vinHash(vin: string): Uint8Array {
  return sha256(enc.encode(vin.trim().toUpperCase()));
}

export function deriveGlobalConfig(programId: PublicKey) {
  return PublicKey.findProgramAddressSync([SEED_GLOBAL_CONFIG], programId);
}

export function deriveAuthority(signer: PublicKey, programId: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [SEED_AUTHORITY, signer.toBuffer()],
    programId
  );
}

export function deriveVehicle(vin: string, programId: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [SEED_VEHICLE, vinHash(vin)],
    programId
  );
}

export function deriveEvent(
  vehicle: PublicKey,
  sequence: bigint,
  programId: PublicKey
) {
  const seqBytes = new Uint8Array(8);
  new DataView(seqBytes.buffer).setBigUint64(0, sequence, true);
  return PublicKey.findProgramAddressSync(
    [SEED_EVENT, vehicle.toBuffer(), seqBytes],
    programId
  );
}
