// Anchor migration script — runs after `anchor deploy`.
// Used to call `initialize` once on the freshly deployed program.

import * as anchor from "@coral-xyz/anchor";

module.exports = async function (provider: anchor.AnchorProvider) {
  anchor.setProvider(provider);
  // TODO: load workspace program, derive GlobalConfig PDA, call initialize().
  console.log("deploy.ts: TODO call vehicle_passport.initialize()");
};
