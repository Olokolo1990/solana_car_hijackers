use anchor_lang::prelude::*;

use crate::constants::{AUTHORITY_SEED, EVENT_SEED, VEHICLE_SEED};
use crate::errors::VehiclePassportError;
use crate::state::{Authority, AuthorityKind, EventType, Vehicle, VehicleEvent};

#[derive(Accounts)]
pub struct TransferOwnership<'info> {
    #[account(mut)]
    pub authority_signer: Signer<'info>,

    #[account(
        mut,
        seeds = [AUTHORITY_SEED, authority_signer.key().as_ref()],
        bump = authority.bump,
        constraint = authority.active @ VehiclePassportError::AuthorityRevoked,
        constraint = authority.kind == AuthorityKind::RegistrationOffice as u8
            @ VehiclePassportError::NotRegistrationOffice
    )]
    pub authority: Account<'info, Authority>,

    #[account(
        mut,
        seeds = [VEHICLE_SEED, vehicle.vin_hash.as_ref()],
        bump = vehicle.bump
    )]
    pub vehicle: Account<'info, Vehicle>,

    #[account(
        init,
        payer = authority_signer,
        space = 8 + VehicleEvent::INIT_SPACE,
        seeds = [
            EVENT_SEED,
            vehicle.key().as_ref(),
            &vehicle.event_count.to_le_bytes()
        ],
        bump
    )]
    pub event: Account<'info, VehicleEvent>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<TransferOwnership>,
    prev_owner_hash: [u8; 32],
    new_owner_hash: [u8; 32],
    timestamp: i64,
) -> Result<()> {
    let vehicle = &mut ctx.accounts.vehicle;
    let event = &mut ctx.accounts.event;
    let authority = &mut ctx.accounts.authority;

    event.vehicle = vehicle.key();
    event.authority = authority.key();
    event.event_type = EventType::OwnershipTransfer as u8;
    event.timestamp = timestamp;
    event.mileage_km = vehicle.last_mileage;
    event.doc_arweave_tx = prev_owner_hash;  // reused payload slot; full payload off-chain
    event.payload_hash = new_owner_hash;
    event.sequence = vehicle.event_count;
    event.bump = ctx.bumps.event;

    vehicle.event_count = vehicle.event_count.saturating_add(1);
    authority.events_written = authority.events_written.saturating_add(1);

    msg!("ownership transfer recorded for vehicle={}", vehicle.key());
    Ok(())
}
