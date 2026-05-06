// Solana client + PDA derivation + on-chain fetchers used across the app.

import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { sha256 } from "@noble/hashes/sha256";
import BN from "bn.js";
import { getReadOnlyProgram } from "@/lib/program";
import {
  AuthorityKind,
  EventType,
  type AuthoritySummary,
  type GlobalConfigSummary,
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

// Shared mapper used by every Vehicle-fetcher (by VIN, by PDA, by plate).
type AnchorVehicleAccount = NonNullable<
  Awaited<ReturnType<ReturnType<typeof getReadOnlyProgram>["account"]["vehicle"]["fetchNullable"]>>
>;

function vehicleAccountToSummary(account: AnchorVehicleAccount): VehicleSummary {
  const ownerHashBytes = account.currentOwnerHash as unknown as number[];
  const countryBytes = account.registrationCountry as unknown as number[];
  const isCountrySet = countryBytes[0] !== 0 || countryBytes[1] !== 0;
  // v4 fields — fall through to defaults if account is from v3 or earlier.
  const a = account as unknown as Record<string, unknown>;
  const originBytes = a.countryOfOrigin as number[] | undefined;
  const isOriginSet =
    !!originBytes && (originBytes[0] !== 0 || originBytes[1] !== 0);
  return {
    vinHash: bytesToHex(account.vinHash as unknown as number[]),
    make: account.make,
    model: account.model,
    year: account.year,
    colorCode: account.colorCode,
    lastMileage: account.lastMileage,
    eventCount: (account.eventCount as unknown as BN).toNumber(),
    createdAt: (account.createdAt as unknown as BN).toNumber(),
    currentLicensePlate: account.currentLicensePlate,
    currentOwnerHash: bytesToHex(ownerHashBytes),
    registeredAtOfficial: (account.registeredAtOfficial as unknown as BN).toNumber(),
    registrationCountry: isCountrySet ? decodeCountry(countryBytes) : "",
    drivingBlockedSince: (account.drivingBlockedSince as unknown as BN).toNumber(),
    fuelType: (a.fuelType as number | undefined) ?? 0,
    transmission: (a.transmission as number | undefined) ?? 0,
    bodyType: (a.bodyType as number | undefined) ?? 0,
    engineCc: (a.engineCc as number | undefined) ?? 0,
    powerHp: (a.powerHp as number | undefined) ?? 0,
    weightKg: (a.weightKg as number | undefined) ?? 0,
    seats: (a.seats as number | undefined) ?? 0,
    colorName: (a.colorName as string | undefined) ?? "",
    countryOfOrigin: isOriginSet
      ? String.fromCharCode(originBytes![0], originBytes![1])
      : "",
    equipment: (a.equipment as string | undefined) ?? "",
  };
}

export async function fetchVehicleSummary(
  vin: string
): Promise<VehicleSummary | null> {
  const program = getReadOnlyProgram();
  const [pda] = deriveVehiclePda(vin);
  // fetchNullable only catches "account does not exist". Any borsh deserialize
  // error from a stale-layout account (e.g. minted under an older program
  // version) propagates — wrap so the UI can treat both cases as "not found".
  let account: Awaited<ReturnType<typeof program.account.vehicle.fetchNullable>>;
  try {
    account = await program.account.vehicle.fetchNullable(pda);
  } catch (err) {
    console.warn(
      `fetchVehicleSummary: failed to deserialize Vehicle at ${pda.toBase58()} ` +
        `(likely stale layout from an earlier program version):`,
      err
    );
    return null;
  }
  if (!account) return null;
  return vehicleAccountToSummary(account);
}

export async function fetchVehicleSummaryByPda(
  pda: PublicKey
): Promise<VehicleSummary | null> {
  const program = getReadOnlyProgram();
  let account: Awaited<ReturnType<typeof program.account.vehicle.fetchNullable>>;
  try {
    account = await program.account.vehicle.fetchNullable(pda);
  } catch (err) {
    console.warn(
      `fetchVehicleSummaryByPda: failed to deserialize Vehicle at ${pda.toBase58()}:`,
      err
    );
    return null;
  }
  if (!account) return null;
  return vehicleAccountToSummary(account);
}

export interface VehicleHit {
  pda: string;
  summary: VehicleSummary;
}

/**
 * Find Vehicle accounts whose `current_license_plate` matches `plate`
 * (case-insensitive, trimmed). Optionally filter by ISO-2 `country`.
 * Returns an array because multiple jurisdictions can re-use the same plate.
 *
 * Implementation note: bypasses Anchor's `program.account.vehicle.all()`
 * because that helper decodes every account in one Promise.all — a single
 * stale-layout vehicle (from a pre-v4 redeploy) makes the whole batch throw.
 * Instead we fetch raw accounts via getProgramAccounts with the Vehicle
 * discriminator memcmp, then decode each one with its own try/catch so
 * stale accounts get skipped silently.
 */
export async function findVehiclesByPlate(
  plate: string,
  country?: string
): Promise<VehicleHit[]> {
  const program = getReadOnlyProgram();
  const accountsCoder = program.coder.accounts;
  // memcmp() returns { dataSize, offset, bytes } describing the account
  // discriminator filter for this account type. Use only its memcmp half —
  // dataSize would falsely reject any future schema-extended accounts.
  const m = accountsCoder.memcmp("vehicle");
  const filters =
    m.offset !== undefined && m.bytes !== undefined
      ? [{ memcmp: { offset: m.offset, bytes: m.bytes } }]
      : [];

  const raws = await connection.getProgramAccounts(PROGRAM_ID, { filters });
  const normPlate = plate.trim().toUpperCase();
  const normCountry = country?.trim().toUpperCase();
  const hits: VehicleHit[] = [];

  for (const { pubkey, account } of raws) {
    let decoded: AnchorVehicleAccount;
    try {
      decoded = accountsCoder.decode("vehicle", account.data) as AnchorVehicleAccount;
    } catch {
      // Skip stale-layout vehicles from earlier redeploys.
      continue;
    }
    if (!decoded.currentLicensePlate) continue;
    if (decoded.currentLicensePlate.trim().toUpperCase() !== normPlate) continue;
    if (normCountry) {
      const cb = decoded.registrationCountry as unknown as number[];
      const cc = String.fromCharCode(cb[0], cb[1]);
      if (cc !== normCountry) continue;
    }
    hits.push({
      pda: pubkey.toBase58(),
      summary: vehicleAccountToSummary(decoded),
    });
  }
  return hits;
}

export async function fetchVehicleEvents(
  vin: string
): Promise<VehicleEventView[]> {
  const [vehiclePda] = deriveVehiclePda(vin);
  return fetchVehicleEventsByPda(vehiclePda);
}

export async function fetchVehicleEventsByPda(
  vehiclePda: PublicKey
): Promise<VehicleEventView[]> {
  const program = getReadOnlyProgram();

  let vehicle: Awaited<ReturnType<typeof program.account.vehicle.fetchNullable>>;
  try {
    vehicle = await program.account.vehicle.fetchNullable(vehiclePda);
  } catch (err) {
    console.warn(
      `fetchVehicleEventsByPda: stale Vehicle layout at ${vehiclePda.toBase58()}:`,
      err
    );
    return [];
  }
  if (!vehicle) return [];

  const eventCount = (vehicle.eventCount as unknown as BN).toNumber();
  if (eventCount === 0) return [];

  // Derive every event PDA in [0, eventCount) and fetch in one round-trip.
  const eventPdas: PublicKey[] = [];
  for (let i = 0; i < eventCount; i++) {
    const [pda] = deriveEventPda(vehiclePda, BigInt(i));
    eventPdas.push(pda);
  }
  let events: Awaited<ReturnType<typeof program.account.vehicleEvent.fetchMultiple>>;
  try {
    events = await program.account.vehicleEvent.fetchMultiple(eventPdas);
  } catch (err) {
    console.warn(
      `fetchVehicleEvents: stale VehicleEvent layout(s) under vehicle ` +
        `${vehiclePda.toBase58()}:`,
      err
    );
    return [];
  }

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
        validFrom: (ev.validFrom as unknown as BN).toNumber(),
        validUntil: (ev.validUntil as unknown as BN).toNumber(),
        description: (ev as unknown as { description?: string }).description ?? "",
      };
    })
    .filter((x): x is VehicleEventView => x !== null);
}

export { decodeCountry };

/**
 * Fetch the Authority record registered for the given signer wallet.
 * Returns null if the wallet has not been registered as an authority,
 * or if the on-chain account fails to deserialize.
 */
/**
 * Fetch the singleton GlobalConfig record. Returns null if not initialized
 * or the on-chain account fails to deserialize (stale layout).
 */
export async function fetchGlobalConfig(): Promise<GlobalConfigSummary | null> {
  const program = getReadOnlyProgram();
  const [pda] = deriveGlobalConfigPda();
  let account: Awaited<ReturnType<typeof program.account.globalConfig.fetchNullable>>;
  try {
    account = await program.account.globalConfig.fetchNullable(pda);
  } catch (err) {
    console.warn(
      `fetchGlobalConfig: failed to deserialize GlobalConfig at ${pda.toBase58()}:`,
      err
    );
    return null;
  }
  if (!account) return null;
  return {
    admin: account.admin.toBase58(),
    vehicleCount: (account.vehicleCount as unknown as BN).toNumber(),
    authorityCount: (account.authorityCount as unknown as BN).toNumber(),
  };
}

/**
 * Fetch every Authority account ever registered (active + revoked), sorted by
 * registration time ascending. Uses Anchor's `account.authority.all()` which
 * wraps getProgramAccounts with the Authority discriminator filter.
 */
export async function fetchAllAuthorities(): Promise<AuthoritySummary[]> {
  const program = getReadOnlyProgram();
  const all = await program.account.authority.all();
  return all
    .map(({ account }): AuthoritySummary => ({
      signer: account.signer.toBase58(),
      kind: account.kind as AuthorityKind,
      countryCode: decodeCountry(account.countryCode as unknown as number[]),
      name: account.name,
      active: account.active,
      eventsWritten: (account.eventsWritten as unknown as BN).toNumber(),
      registeredAt: (account.registeredAt as unknown as BN).toNumber(),
    }))
    .sort((a, b) => a.registeredAt - b.registeredAt);
}

export async function fetchAuthority(
  signer: PublicKey
): Promise<AuthoritySummary | null> {
  const program = getReadOnlyProgram();
  const [pda] = deriveAuthorityPda(signer);
  let account: Awaited<ReturnType<typeof program.account.authority.fetchNullable>>;
  try {
    account = await program.account.authority.fetchNullable(pda);
  } catch (err) {
    console.warn(
      `fetchAuthority: failed to deserialize Authority at ${pda.toBase58()}:`,
      err
    );
    return null;
  }
  if (!account) return null;
  return {
    signer: account.signer.toBase58(),
    kind: account.kind as AuthorityKind,
    countryCode: decodeCountry(account.countryCode as unknown as number[]),
    name: account.name,
    active: account.active,
    eventsWritten: (account.eventsWritten as unknown as BN).toNumber(),
    registeredAt: (account.registeredAt as unknown as BN).toNumber(),
  };
}
