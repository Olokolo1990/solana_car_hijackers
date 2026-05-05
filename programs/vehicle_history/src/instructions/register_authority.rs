use anchor_lang::prelude::*;

use crate::constants::{AUTHORITY_SEED, GLOBAL_CONFIG_SEED, MAX_NAME_LEN};
use crate::errors::VehiclePassportError;
use crate::state::{Authority, GlobalConfig};

#[derive(Accounts)]
pub struct RegisterAuthority<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    /// CHECK: validated against global_config.admin below
    pub new_authority_signer: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [GLOBAL_CONFIG_SEED],
        bump = global_config.bump,
        has_one = admin @ VehiclePassportError::NotAdmin
    )]
    pub global_config: Account<'info, GlobalConfig>,

    #[account(
        init,
        payer = admin,
        space = 8 + Authority::INIT_SPACE,
        seeds = [AUTHORITY_SEED, new_authority_signer.key().as_ref()],
        bump
    )]
    pub authority: Account<'info, Authority>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<RegisterAuthority>,
    kind: u8,
    country_code: [u8; 2],
    name: String,
) -> Result<()> {
    require!((name.len() as u64) <= MAX_NAME_LEN, VehiclePassportError::StringTooLong);

    let auth = &mut ctx.accounts.authority;
    auth.signer = ctx.accounts.new_authority_signer.key();
    auth.kind = kind;
    auth.country_code = country_code;
    auth.name = name;
    auth.active = true;
    auth.events_written = 0;
    auth.registered_at = Clock::get()?.unix_timestamp;
    auth.bump = ctx.bumps.authority;

    let cfg = &mut ctx.accounts.global_config;
    cfg.authority_count = cfg.authority_count.saturating_add(1);

    msg!(
        "authority registered: signer={} kind={} country={:?}",
        auth.signer,
        auth.kind,
        auth.country_code
    );
    Ok(())
}
