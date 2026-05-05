// Solana client + PDA derivation + on-chain fetchers used across the app.

import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { sha256 } from "@noble/hashes/sha256";
import BN from "bn.js";
import { getReadOnlyProgram } from "@/lib/program";
import {
  AuthorityKind,
  EventType,
  type VehicleEvent as VehicleEventView,
  type VehicleSummary,
} from "@/types/events";

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
  // The on-chain seed is `vehicle.event_count.to_le_bytes()` (u64 little-endian).
  const seqBytes = Buffer.alloc(8);
  seqBytes.writeBigUInt64LE(sequence, 0);
  return PublicKey.findProgramAddressSync(
    [SEEDS.event, vehicle.toBuffer(), seqBytes],
    PROGRAM_ID
  );
}

function bytesToHex(bytes: ArrayLike<number>): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function decodeCountry(bytes: ArrayLike<number>): string {
  // ISO-3166 alpha-2; on-chain stored as 2-byte ASCII array.
  return String.fromCharCode(bytes[0], bytes[1]);
}

export async function fetchVehicleSummary(
  vin: string
): Promise<VehicleSummary | null> {
  const program = getReadOnlyProgram();
  const [pda] = deriveVehiclePda(vin);
  const account = await program.account.vehicle.fetchNullable(pda);
  if (!account) return null;
  return {
    vinHash: bytesToHex(account.vinHash as unknown as number[]),
    make: account.make,
    model: account.model,
    year: account.year,
    colorCode: account.colorCode,
    lastMileage: account.lastMileage,
    eventCount: (account.eventCount as unknown as BN).toNumber(),
    createdAt: (account.createdAt as unknown as BN).toNumber(),
  };
}

export async function fetchVehicleEvents(
  vin: string
): Promise<VehicleEventView[]> {
  const program = getReadOnlyProgram();
  const [vehiclePda] = deriveVehiclePda(vin);
  const vehicle = await program.account.vehicle.fetchNullable(vehiclePda);
  if (!vehicle) return [];

  const eventCount = (vehicle.eventCount as unknown as BN).toNumber();
  if (eventCount === 0) return [];

  // Derive every event PDA in [0, eventCount) and fetch in one round-trip.
  const eventPdas: PublicKey[] = [];
  for (let i = 0; i < eventCount; i++) {
    const [pda] = deriveEventPda(vehiclePda, BigInt(i));
    eventPdas.push(pda);
  }
  const events = await program.account.vehicleEvent.fetchMultiple(eventPdas);

  // Resolve unique authorities to enrich each event with kind + name.
  const uniqueAuthorityPdas = new Map<string, PublicKey>();
  for (const ev of events) {
    if (!ev) continue;
    const k = ev.authority.toBase58();
    if (!uniqueAuthorityPdas.has(k)) uniqueAuthorityPdas.set(k, ev.authority);
  }
  const authPdaList = [...uniqueAuthorityPdas.values()];
  const authAccounts = await program.account.authority.fetchMultiple(
    authPdaList
  );
  const authByPda = new Map<
    string,
    { kind: number; name: string }
  >();
  authPdaList.forEach((pda, i) => {
    const a = authAccounts[i];
    if (a) authByPda.set(pda.toBase58(), { kind: a.kind, name: a.name });
  });

  return events
    .map((ev, i): VehicleEventView | null => {
      if (!ev) return null;
      const auth = authByPda.get(ev.authority.toBase58());
      return {
        vehicle: ev.vehicle.toBase58(),
        authority: ev.authority.toBase58(),
        authorityKind: (auth?.kind ?? AuthorityKind.Manufacturer) as AuthorityKind,
        authorityName: auth?.name ?? "(unknown)",
        eventType: ev.eventType as EventType,
        timestamp: (ev.timestamp as unknown as BN).toNumber(),
        mileageKm: ev.mileageKm,
        docArweaveTx: bytesToHex(ev.docArweaveTx as unknown as number[]),
        payloadHash: bytesToHex(ev.payloadHash as unknown as number[]),
        sequence: (ev.sequence as unknown as BN).toNumber(),
      };
    })
    .filter((x): x is VehicleEventView => x !== null);
}

export { decodeCountry };
