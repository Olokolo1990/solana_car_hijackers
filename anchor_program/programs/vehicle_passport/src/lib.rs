// Vehicle Passport — Solana program (Anchor)
//
// Mints an NFT passport per VIN at vehicle factory registration time, then
// allows authorized institutions (police, insurer, SKP, OEM, customs,
// registration office) to append events (inspections, accidents, mileage,
// transfers) to the vehicle's permanent on-chain history.

use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("VPasportProgram1111111111111111111111111111");

#[program]
pub mod vehicle_passport {
    use super::*;

    /// One-time program initialization. Sets up the GlobalConfig PDA and the
    /// admin authority that may register/revoke other authorities.
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize::handler(ctx)
    }

    /// Admin-only: register a new institutional authority.
    pub fn register_authority(
        ctx: Context<RegisterAuthority>,
        kind: u8,
        country_code: [u8; 2],
        name: String,
    ) -> Result<()> {
        instructions::register_authority::handler(ctx, kind, country_code, name)
    }

    /// Admin-only: revoke an existing authority. Past events written by it
    /// remain on-chain (immutability is a feature) but are flagged in UI.
    pub fn revoke_authority(ctx: Context<RevokeAuthority>) -> Result<()> {
        instructions::revoke_authority::handler(ctx)
    }

    /// Manufacturer-only: mint the passport NFT for a brand new vehicle at
    /// the factory. Records VIN hash + factory metadata on-chain.
    pub fn mint_vehicle_passport(
        ctx: Context<MintVehiclePassport>,
        vin_hash: [u8; 32],
        make: String,
        model: String,
        year: u16,
        color_code: u32,
        equipment_hash: [u8; 32],
    ) -> Result<()> {
        instructions::mint_vehicle_passport::handler(
            ctx,
            vin_hash,
            make,
            model,
            year,
            color_code,
            equipment_hash,
        )
    }

    /// Authority-only: append an event to a vehicle's history. Enforces
    /// anti-rollback on mileage at the protocol level.
    pub fn write_event(
        ctx: Context<WriteEvent>,
        event_type: u8,
        timestamp: i64,
        mileage_km: u32,
        doc_arweave_tx: [u8; 32],
        payload_hash: [u8; 32],
    ) -> Result<()> {
        instructions::write_event::handler(
            ctx,
            event_type,
            timestamp,
            mileage_km,
            doc_arweave_tx,
            payload_hash,
        )
    }

    /// Authority-only (registration office): record an ownership transfer.
    /// Personal data stays off-chain; only hashes go on-chain.
    pub fn transfer_ownership(
        ctx: Context<TransferOwnership>,
        prev_owner_hash: [u8; 32],
        new_owner_hash: [u8; 32],
        timestamp: i64,
    ) -> Result<()> {
        instructions::transfer_ownership::handler(
            ctx,
            prev_owner_hash,
            new_owner_hash,
            timestamp,
        )
    }
}
