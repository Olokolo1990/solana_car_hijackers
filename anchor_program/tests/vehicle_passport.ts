// Skeleton Anchor tests for the vehicle_passport program.
// Run with: anchor test
//
// TODO: flesh out happy path + failure cases:
//   - initialize sets admin
//   - register_authority works for admin only
//   - revoke_authority deactivates an authority
//   - mint_vehicle_passport rejects non-manufacturer
//   - write_event rejects mileage rollback
//   - write_event rejects authority kind / event type mismatch
//   - transfer_ownership rejects non-registration-office signers

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { VehiclePassport } from "../target/types/vehicle_passport";
import { expect } from "chai";

describe("vehicle_passport", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.VehiclePassport as Program<VehiclePassport>;

  it("initializes the global config", async () => {
    // TODO: derive global_config PDA, call initialize, assert admin == provider.wallet
    expect(program.programId).to.not.be.undefined;
  });

  it("registers a new authority (admin-only)", async () => {
    // TODO
  });

  it("rejects mileage rollback on write_event", async () => {
    // TODO
  });
});
