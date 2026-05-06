use anchor_lang::prelude::*;

use crate::constants::{
    AUTHORITY_SEED, GLOBAL_CONFIG_SEED, MAX_COLOR_NAME_LEN, MAX_EQUIPMENT_LEN, MAX_MAKE_LEN,
    MAX_MODEL_LEN, VEHICLE_SEED,
};
use crate::errors::VehiclePassportError;
use crate::state::{Authority, AuthorityKind, GlobalConfig, Vehicle};

#[derive(Accounts)]
#[instruction(vin_hash: [u8; 32])]
pub struct MintVehiclePassport<'info> {
    /// Manufacturer's signing wallet. Must match a registered Authority of
    /// kind = Manufacturer.
    #[account(mut)]
    pub manufacturer_signer: Signer<'info>,

    #[account(
        seeds = [AUTHORITY_SEED, manufacturer_signer.key().as_ref()],
        bump = authority.bump,
        constraint = authority.active @ VehiclePassportError::AuthorityRevoked,
        constraint = authority.kind == AuthorityKind::Manufacturer as u8
            @ VehiclePassportError::NotManufacturer
    )]
    pub authority: Account<'info, Authority>,

    #[account(
        init,
        payer = manufacturer_signer,
        space = 8 + Vehicle::INIT_SPACE,
        seeds = [VEHICLE_SEED, vin_hash.as_ref()],
        bump
    )]
    pub vehicle: Account<'info, Vehicle>,

    #[account(
        mut,
        seeds = [GLOBAL_CONFIG_SEED],
        bump = global_config.bump
    )]
    pub global_config: Account<'info, GlobalConfig>,

    // TODO(metaplex): wire mint, metadata, master_edition accounts and CPI
    // into mpl-token-metadata to actually mint a transferable NFT linked to
    // this Vehicle PDA. For v0 we just record the would-be mint address.
    /// CHECK: future Metaplex mint account; not validated in v0.
    pub mint_placeholder: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[allow(clippy::too_many_arguments)]
pub fn handler(
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
    require!((make.len() as u64) <= MAX_MAKE_LEN, VehiclePassportError::StringTooLong);
    require!((model.len() as u64) <= MAX_MODEL_LEN, VehiclePassportError::StringTooLong);
    require!(
        (color_name.len() as u64) <= MAX_COLOR_NAME_LEN,
        VehiclePassportError::StringTooLong
    );
    require!(
        (equipment.len() as u64) <= MAX_EQUIPMENT_LEN,
        VehiclePassportError::StringTooLong
    );

    let v = &mut ctx.accounts.vehicle;
    v.vin_hash = vin_hash;
    v.mint = ctx.accounts.mint_placeholder.key();
    v.manufacturer = ctx.accounts.authority.key();
    v.make = make;
    v.model = model;
    v.year = year;
    v.color_code = color_code;
    v.equipment_hash = equipment_hash;
    v.last_mileage = 0;
    v.event_count = 0;
    v.created_at = Clock::get()?.unix_timestamp;
    v.fuel_type = fuel_type;
    v.transmission = transmission;
    v.body_type = body_type;
    v.engine_cc = engine_cc;
    v.power_hp = power_hp;
    v.weight_kg = weight_kg;
    v.seats = seats;
    v.color_name = color_name;
    v.country_of_origin = country_of_origin;
    v.equipment = equipment;
    v.bump = ctx.bumps.vehicle;

    let cfg = &mut ctx.accounts.global_config;
    cfg.vehicle_count = cfg.vehicle_count.saturating_add(1);

    msg!(
        "vehicle passport minted: vin_hash={:?} make={} model={} year={}",
        v.vin_hash,
        v.make,
        v.model,
        v.year
    );
    Ok(())
}
