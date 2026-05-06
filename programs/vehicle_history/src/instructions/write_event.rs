use anchor_lang::prelude::*;

use crate::constants::{AUTHORITY_SEED, EVENT_SEED, MAX_EVENT_DESCRIPTION_LEN, VEHICLE_SEED};
use crate::errors::VehiclePassportError;
use crate::state::{Authority, EventType, Vehicle, VehicleEvent};

#[derive(Accounts)]
#[instruction(event_type: u8, timestamp: i64, mileage_km: u32)]
pub struct WriteEvent<'info> {
    #[account(mut)]
    pub authority_signer: Signer<'info>,

    #[account(
        mut,
        seeds = [AUTHORITY_SEED, authority_signer.key().as_ref()],
        bump = authority.bump,
        constraint = authority.active @ VehiclePassportError::AuthorityRevoked
    )]
    pub authority: Account<'info, Authority>,

    #[account(
        mut,
        seeds = [VEHICLE_SEED, vehicle.vin_hash.as_ref()],
        bump = vehicle.bump
    )]
    pub vehicle: Account<'info, Vehicle>,

    /// New event PDA, seeded by vehicle + monotonic counter.
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

#[allow(clippy::too_many_arguments)]
pub fn handler(
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
    require!(
        description.len() as u64 <= MAX_EVENT_DESCRIPTION_LEN,
        VehiclePassportError::StringTooLong
    );
    let parsed_type = parse_event_type(event_type)?;
    enforce_authority_can_write(ctx.accounts.authority.kind, parsed_type)?;

    if parsed_type.requires_mileage() {
        require!(
            mileage_km >= ctx.accounts.vehicle.last_mileage,
            VehiclePassportError::MileageRollback
        );
    }

    // Driving block: only Police, only via PoliceControl, can set the lock.
    if block_driving {
        require!(
            ctx.accounts.authority.kind == crate::state::AuthorityKind::Police as u8
                && parsed_type == EventType::PoliceControl,
            VehiclePassportError::BlockNotAllowed
        );
    }
    // Driving block: only InspectionStation, only via Inspection, can clear it.
    if clear_driving_block {
        require!(
            ctx.accounts.authority.kind
                == crate::state::AuthorityKind::InspectionStation as u8
                && parsed_type == EventType::Inspection,
            VehiclePassportError::ClearBlockNotAllowed
        );
    }

    let vehicle = &mut ctx.accounts.vehicle;
    let event = &mut ctx.accounts.event;
    let authority = &mut ctx.accounts.authority;

    event.vehicle = vehicle.key();
    event.authority = authority.key();
    event.event_type = event_type;
    event.timestamp = timestamp;
    event.mileage_km = mileage_km;
    event.doc_arweave_tx = doc_arweave_tx;
    event.payload_hash = payload_hash;
    event.sequence = vehicle.event_count;
    event.valid_from = valid_from;
    event.valid_until = valid_until;
    event.description = description;
    event.bump = ctx.bumps.event;

    if parsed_type.requires_mileage() {
        vehicle.last_mileage = mileage_km;
    }
    if block_driving {
        vehicle.driving_blocked_since = Clock::get()?.unix_timestamp;
    }
    if clear_driving_block {
        vehicle.driving_blocked_since = 0;
    }
    vehicle.event_count = vehicle.event_count.saturating_add(1);
    authority.events_written = authority.events_written.saturating_add(1);

    msg!(
        "event written: vehicle={} type={} mileage={} seq={} block_set={} block_cleared={}",
        vehicle.key(),
        event_type,
        mileage_km,
        event.sequence,
        block_driving,
        clear_driving_block
    );
    Ok(())
}

fn parse_event_type(raw: u8) -> Result<EventType> {
    match raw {
        0 => Ok(EventType::Inspection),
        1 => Ok(EventType::MileageReading),
        2 => Ok(EventType::Accident),
        3 => Ok(EventType::Service),
        4 => Ok(EventType::PartReplacement),
        5 => Ok(EventType::InsuranceClaim),
        6 => Ok(EventType::OwnershipTransfer),
        7 => Ok(EventType::Theft),
        8 => Ok(EventType::Recovery),
        9 => Ok(EventType::Import),
        10 => Ok(EventType::Recall),
        11 => Ok(EventType::Scrapping),
        12 => Ok(EventType::PoliceControl),
        13 => Ok(EventType::Registration),
        _ => Err(VehiclePassportError::UnknownEventType.into()),
    }
}

/// Authority kind → permitted event types matrix. Tighten/loosen here as the
/// product evolves. Revoke a permission by removing its row.
fn enforce_authority_can_write(kind: u8, ev: EventType) -> Result<()> {
    use crate::state::AuthorityKind::*;
    let allowed = match kind {
        k if k == Police as u8 => matches!(
            ev,
            EventType::Accident
                | EventType::Theft
                | EventType::Recovery
                | EventType::PoliceControl
        ),
        k if k == InspectionStation as u8 => matches!(
            ev,
            EventType::Inspection | EventType::MileageReading
        ),
        k if k == Insurer as u8 => matches!(
            ev,
            EventType::Accident | EventType::InsuranceClaim
        ),
        k if k == AuthorizedServiceCenter as u8 => matches!(
            ev,
            EventType::Service
                | EventType::PartReplacement
                | EventType::MileageReading
                | EventType::Recall
        ),
        k if k == Customs as u8 => matches!(ev, EventType::Import),
        k if k == RegistrationOffice as u8 => matches!(
            ev,
            EventType::OwnershipTransfer | EventType::Scrapping
        ),
        k if k == Manufacturer as u8 => matches!(ev, EventType::Recall),
        _ => false,
    };
    require!(allowed, VehiclePassportError::AuthorityKindNotAllowed);
    Ok(())
}
