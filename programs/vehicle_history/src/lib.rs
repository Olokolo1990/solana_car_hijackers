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

declare_id!("HkbccHJ45V7zbgLkwr64EUzRhfjdH1mcoQ5UVMAte341");

#[program]
pub mod vehicle_history {
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
    #[allow(clippy::too_many_arguments)]
    pub fn mint_vehicle_passport(
        ctx: Context<MintVehiclePassport>,
        vin_hash: [u8; 32],
        make: String,
        model: String,
        year: u16,
        color_code: u32,
        equipment_hash: [u8; 32],
        fuel_type: u8,
        transmission: u8,
        body_type: u8,
        engine_cc: u16,
        power_hp: u16,
        weight_kg: u32,
        seats: u8,
        color_name: String,
        country_of_origin: [u8; 2],
        equipment: String,
    ) -> Result<()> {
        instructions::mint_vehicle_passport::handler(
            ctx,
            vin_hash,
            make,
            model,
            year,
            color_code,
            equipment_hash,
            fuel_type,
            transmission,
            body_type,
            engine_cc,
            power_hp,
            weight_kg,
            seats,
            color_name,
            country_of_origin,
            equipment,
        )
    }

    /// Authority-only: append an event to a vehicle's history. Enforces
    /// anti-rollback on mileage at the protocol level.
    ///
    /// `valid_from` / `valid_until` carry policy/inspection validity windows
    /// (e.g. insurance coverage period, next inspection due date). 0 = N/A.
    /// `block_driving` is honored only for Police via PoliceControl events.
    /// `clear_driving_block` is honored only for InspectionStation via
    /// Inspection events.
    #[allow(clippy::too_many_arguments)]
    pub fn write_event(
        ctx: Context<WriteEvent>,
        event_type: u8,
        timestamp: i64,
        mileage_km: u32,
        doc_arweave_tx: [u8; 32],
        payload_hash: [u8; 32],
        valid_from: i64,
        valid_until: i64,
        block_driving: bool,
        clear_driving_block: bool,
        description: String,
    ) -> Result<()> {
        instructions::write_event::handler(
            ctx,
            event_type,
            timestamp,
            mileage_km,
            doc_arweave_tx,
            payload_hash,
            valid_from,
            valid_until,
            block_driving,
            clear_driving_block,
            description,
        )
    }

    /// Government-only: register a vehicle (assign plates + first owner).
    /// Updates the Vehicle's cached registration fields and writes a
    /// Registration event into the timeline. Can be called multiple times for
    /// re-registrations (import / change of jurisdiction).
    pub fn register_vehicle(
        ctx: Context<RegisterVehicle>,
        license_plate: String,
        owner_hash: [u8; 32],
        registration_country: [u8; 2],
        timestamp: i64,
        doc_arweave_tx: [u8; 32],
        payload_hash: [u8; 32],
        description: String,
    ) -> Result<()> {
        instructions::register_vehicle::handler(
            ctx,
            license_plate,
            owner_hash,
            registration_country,
            timestamp,
            doc_arweave_tx,
            payload_hash,
            description,
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
