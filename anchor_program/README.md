# vehicle_passport — Anchor program

On-chain registry for the Vehicle Passport NFT and per-VIN event log.

## Layout

```
programs/vehicle_passport/src/
├── lib.rs                         entry point + #[program] module
├── constants.rs                   PDA seeds, max string lengths
├── errors.rs                      VehiclePassportError enum
├── state.rs                       GlobalConfig, Authority, Vehicle, VehicleEvent
└── instructions/
    ├── initialize.rs              one-time setup of GlobalConfig
    ├── register_authority.rs      admin onboards a new institutional writer
    ├── revoke_authority.rs        admin deactivates an authority
    ├── mint_vehicle_passport.rs   manufacturer mints the per-VIN passport
    ├── write_event.rs             authority appends an event (with anti-rollback)
    └── transfer_ownership.rs      registration office records ownership change
```

## Build / test / deploy

```bash
# build
anchor build

# run tests on a local validator
anchor test

# deploy to devnet (assumes ~/.config/solana/dev-wallet.json)
anchor deploy --provider.cluster devnet
```

## Open TODOs (post-skeleton)

- [ ] Wire `mpl-token-metadata` CPI in `mint_vehicle_passport` to actually
      mint the NFT and link `Vehicle.mint` to a real Metaplex mint
- [ ] Replace per-event accounts with Bubblegum compressed leaves to cut
      rent costs at scale (from ~$0.005/event to ~$0.0001/event)
- [ ] Add `update_authority_metadata` instruction (rename, change country)
- [ ] Add `flag_event` for disputed entries (cannot delete; can flag)
- [ ] Tests for every instruction + every failure path
- [ ] Replace placeholder program ID with a freshly generated keypair
      (`solana-keygen new -o target/deploy/vehicle_passport-keypair.json`)
