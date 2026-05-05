// Anchor migration script — idempotently calls `initialize` on the deployed
// vehicle_history program.
//
// Two ways to run:
//   1. `anchor migrate`            — Anchor CLI passes in a provider.
//   2. `npx ts-node migrations/deploy.ts` — uses ANCHOR_WALLET +
//                                            ANCHOR_PROVIDER_URL env vars.

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { VehicleHistory } from "../target/types/vehicle_history";

const GLOBAL_CONFIG_SEED = Buffer.from("global_config");

async function run(provider?: anchor.AnchorProvider) {
  if (provider) {
    anchor.setProvider(provider);
  } else {
    anchor.setProvider(anchor.AnchorProvider.env());
  }

  const program = anchor.workspace.VehicleHistory as Program<VehicleHistory>;
  const admin = anchor.getProvider().publicKey!;

  const [globalConfig] = PublicKey.findProgramAddressSync(
    [GLOBAL_CONFIG_SEED],
    program.programId
  );

  console.log("Program ID:    ", program.programId.toBase58());
  console.log("Admin (wallet):", admin.toBase58());
  console.log("GlobalConfig:  ", globalConfig.toBase58());

  const existing = await program.account.globalConfig.fetchNullable(globalConfig);
  if (existing) {
    console.log(
      `Already initialized — admin=${existing.admin.toBase58()}, ` +
        `vehicles=${existing.vehicleCount.toString()}, ` +
        `authorities=${existing.authorityCount.toString()}`
    );
    return;
  }

  // globalConfig (PDA) and systemProgram are auto-resolved by Anchor 0.31
  // from the IDL; only the explicit signer needs to be passed.
  const tx = await program.methods
    .initialize()
    .accounts({ admin })
    .rpc();

  console.log("initialize() tx:", tx);
  console.log("Done.");
}

// Anchor CLI hook (`anchor migrate`).
module.exports = async function (provider: anchor.AnchorProvider) {
  await run(provider);
};

// Direct execution (`npx ts-node migrations/deploy.ts`).
if (require.main === module) {
  run().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
