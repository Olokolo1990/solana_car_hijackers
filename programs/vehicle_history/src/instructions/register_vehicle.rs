use anchor_lang::prelude::*;

use crate::constants::{AUTHORITY_SEED, EVENT_SEED, GLOBAL_CONFIG_SEED, VEHICLE_SEED};
use crate::errors::VehiclePassportError;
use crate::state::{
    Authority, AuthorityKind, EventType, GlobalConfig, Vehicle, VehicleEvent,
};

/// Government-only: assigns plates and the first owner to an existing Vehicle
/// passport, and writes a Registration event into the timeline.
///
/// Idempotent in the sense that re-calling it on an already-registered vehicle
/// just updates the cached fields and writes another Registration event
/// (useful for re-registrations on import / change of jurisdiction).
///
/// For the option-B "imported" flow, the front-end is expected to first call
/// `mint_vehicle_passport` (with stub data) so the Vehicle account exists.
#[derive(Accounts)]
pub struct RegisterVehicle<'info> {
    #[account(mut)]
    pub gov_signer: Signer<'info>,

    #[account(
        mut,
        seeds = [AUTHORITY_SEED, gov_signer.key().as_ref()],
        bump = authority.bump,
        constraint = authority.active @ VehiclePassportError::AuthorityRevoked,
        constraint = authority.kind == AuthorityKind::RegistrationOffice as u8
            @ VehiclePassportError::NotGovernment
    )]
    pub authority: Account<'info, Authority>,

    #[account(
        mut,
        seeds = [VEHICLE_SEED, vehicle.vin_hash.as_ref()],
        bump = vehicle.bump
    )]
    pub vehicle: Account<'info, Vehicle>,

    /// New event slot in the vehicle's timeline (Registration event).
    #[account(
        init,
        payer = gov_signer,
        space = 8 + VehicleEvent::INIT_SPACE,
        seeds = [
            EVENT_SEED,
            vehicle.key().as_ref(),
            &vehicle.event_count.to_le_bytes()
        ],
        bump
    )]
    pub event: Account<'info, VehicleEvent>,

    #[account(
        seeds = [GLOBAL_CONFIG_SEED],
        bump = global_config.bump
    )]
    pub global_config: Account<'info, GlobalConfig>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<RegisterVehicle>,
    license_plate: String,
    owner_hash: [u8; 32],
    registration_country: [u8; 2],
    timestamp: i64,
    doc_arweave_tx: [u8; 32],
    payload_hash: [u8; 32],
) -> Result<()> {
    require!(license_plate.len() <= 16, VehiclePassportError::StringTooLong);

    // Update the Vehicle's registration cache.
    let vehicle = &mut ctx.accounts.vehicle;
    vehicle.current_license_plate = license_plate.clone();
    vehicle.current_owner_hash = owner_hash;
    vehicle.registered_at_official = timestamp;
    vehicle.registration_country = registration_country;

    // Write a Registration event so the timeline carries this on history.
    let event = &mut ctx.accounts.event;
    event.vehicle = vehicle.key();
    event.authority = ctx.accounts.authority.key();
    event.event_type = EventType::Registration as u8;
    event.timestamp = timestamp;
    event.mileage_km = 0;
    event.doc_arweave_tx = doc_arweave_tx;
    event.payload_hash = payload_hash;
    event.sequence = vehicle.event_count;
    event.valid_from = 0;
    event.valid_until = 0;
    event.bump = ctx.bumps.event;

    vehicle.event_count = vehicle.event_count.saturating_add(1);

    let authority = &mut ctx.accounts.authority;
    authority.events_written = authority.events_written.saturating_add(1);

    msg!(
        "registered: vehicle={} plate={} country={:?} timestamp={}",
        vehicle.key(),
        license_plate,
        registration_country,
        timestamp
    );
    let _ = ctx.accounts.global_config;
    Ok(())
}
