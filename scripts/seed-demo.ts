// Seed demo data for the public lookup page.
//
// Idempotent. Run with:
//   ANCHOR_WALLET=$HOME/.config/solana/dev-wallet.json \
//     ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
//     npx ts-node scripts/seed-demo.ts
//
// Effect:
//   1. Registers the dev wallet as a Manufacturer authority.
//   2. Mints a passport for VIN WVWZZZ1KZ8M094375 (VW Golf 2018).
//   3. Writes one Recall event for that vehicle (Manufacturer may recall).

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { sha256 } from "@noble/hashes/sha256";
import { VehicleHistory } from "../target/types/vehicle_history";

const DEMO_VIN = "WVWZZZ1KZ8M094375";
const AUTHORITY_KIND_MANUFACTURER = 0;
const EVENT_TYPE_RECALL = 10;

const SEEDS = {
  authority: Buffer.from("authority"),
  vehicle: Buffer.from("vehicle"),
  event: Buffer.from("event"),
};

function vinHash(vin: string): Buffer {
  return Buffer.from(sha256(new TextEncoder().encode(vin.trim().toUpperCase())));
}

function deriveAuthority(programId: PublicKey, signer: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [SEEDS.authority, signer.toBuffer()],
    programId
  );
}

function deriveVehicle(programId: PublicKey, vin: string) {
  return PublicKey.findProgramAddressSync(
    [SEEDS.vehicle, vinHash(vin)],
    programId
  );
}

function deriveEvent(
  programId: PublicKey,
  vehicle: PublicKey,
  sequence: bigint
) {
  const seq = Buffer.alloc(8);
  seq.writeBigUInt64LE(sequence);
  return PublicKey.findProgramAddressSync(
    [SEEDS.event, vehicle.toBuffer(), seq],
    programId
  );
}

async function main() {
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const program = anchor.workspace.VehicleHistory as Program<VehicleHistory>;
  const admin = provider.wallet.publicKey;

  console.log("Program:", program.programId.toBase58());
  console.log("Admin:  ", admin.toBase58());

  // 1. Register dev wallet as Manufacturer authority.
  const [authorityPda] = deriveAuthority(program.programId, admin);
  const existingAuth = await program.account.authority.fetchNullable(
    authorityPda
  );
  if (existingAuth) {
    console.log(
      `[1/3] authority exists — kind=${existingAuth.kind} name="${existingAuth.name}" active=${existingAuth.active}`
    );
  } else {
    const tx = await program.methods
      .registerAuthority(
        AUTHORITY_KIND_MANUFACTURER,
        [..."DE"].map((c) => c.charCodeAt(0)) as [number, number],
        "Volkswagen AG (demo)"
      )
      .accountsPartial({
        admin,
        newAuthoritySigner: admin,
      })
      .rpc();
    console.log(`[1/3] registered authority — tx ${tx}`);
  }

  // 2. Mint vehicle passport for the demo VIN.
  const [vehiclePda] = deriveVehicle(program.programId, DEMO_VIN);
  const existingVehicle = await program.account.vehicle.fetchNullable(
    vehiclePda
  );
  let eventCount = 0;
  if (existingVehicle) {
    eventCount = (existingVehicle.eventCount as anchor.BN).toNumber();
    console.log(
      `[2/3] vehicle exists — make=${existingVehicle.make} model=${existingVehicle.model} year=${existingVehicle.year} events=${eventCount}`
    );
  } else {
    const vinHashArr = Array.from(vinHash(DEMO_VIN)) as number[];
    const equipmentHashArr = new Array(32).fill(0) as number[];
    const mintPlaceholder = Keypair.generate().publicKey; // throwaway
    const tx = await program.methods
      .mintVehiclePassport(
        vinHashArr as unknown as number[] & { length: 32 },
        "VW",
        "GOLF",
        2018,
        0xffffff,
        equipmentHashArr as unknown as number[] & { length: 32 }
      )
      .accountsPartial({
        manufacturerSigner: admin,
        mintPlaceholder,
      })
      .rpc();
    console.log(`[2/3] minted vehicle — tx ${tx}`);
  }

  // 3. Write one Recall event (idempotent: skip if any event exists).
  if (eventCount > 0) {
    console.log(`[3/3] vehicle already has ${eventCount} event(s) — skipping`);
  } else {
    const [eventPda] = deriveEvent(
      program.programId,
      vehiclePda,
      BigInt(eventCount)
    );
    const docArweaveTx = new Array(32).fill(0) as number[];
    const payloadHash = Array.from(
      sha256(new TextEncoder().encode("recall:demo:airbag"))
    ) as number[];
    const now = Math.floor(Date.now() / 1000);
    const tx = await program.methods
      .writeEvent(
        EVENT_TYPE_RECALL,
        new anchor.BN(now),
        0, // mileage_km — not required for Recall
        docArweaveTx as unknown as number[] & { length: 32 },
        payloadHash as unknown as number[] & { length: 32 }
      )
      .accountsPartial({
        authoritySigner: admin,
        vehicle: vehiclePda,
        event: eventPda,
      })
      .rpc();
    console.log(`[3/3] wrote Recall event — tx ${tx}`);
  }

  console.log("\nDone. Public page should now show this VIN:");
  console.log(`  http://localhost:3000/vehicle/${DEMO_VIN}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
