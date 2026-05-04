// High-level client for the vehicle_passport program.
// Wraps Anchor program object with typed instruction builders.
//
// Usage (post-IDL-generation):
//
//   const client = new VehiclePassportClient({ provider, programId });
//   await client.writeEvent({ vin, eventType, mileageKm, photo });

import { AnchorProvider, Program, Idl } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

export interface VehiclePassportClientOpts {
  provider: AnchorProvider;
  programId: PublicKey;
  idl?: Idl; // load from anchor_program/target/idl/vehicle_passport.json
}

export class VehiclePassportClient {
  readonly program: Program;
  constructor(opts: VehiclePassportClientOpts) {
    if (!opts.idl) {
      throw new Error(
        "IDL required — load from anchor_program/target/idl/vehicle_passport.json"
      );
    }
    this.program = new Program(opts.idl, opts.provider);
  }

  // TODO: typed wrappers for each instruction:
  //   initialize()
  //   registerAuthority(signer, kind, country, name)
  //   revokeAuthority(authoritySigner)
  //   mintVehiclePassport(vin, make, model, year, colorCode, equipmentHash)
  //   writeEvent(vin, eventType, mileageKm, docArweaveTx, payloadHash)
  //   transferOwnership(vin, prevOwnerHash, newOwnerHash)
}
