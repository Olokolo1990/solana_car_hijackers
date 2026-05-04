use anchor_lang::prelude::*;

use crate::constants::{AUTHORITY_SEED, GLOBAL_CONFIG_SEED};
use crate::errors::VehiclePassportError;
use crate::state::{Authority, GlobalConfig};

#[derive(Accounts)]
pub struct RevokeAuthority<'info> {
    pub admin: Signer<'info>,

    #[account(
        seeds = [GLOBAL_CONFIG_SEED],
        bump = global_config.bump,
        has_one = admin @ VehiclePassportError::NotAdmin
    )]
    pub global_config: Account<'info, GlobalConfig>,

    #[account(
        mut,
        seeds = [AUTHORITY_SEED, authority.signer.as_ref()],
        bump = authority.bump
    )]
    pub authority: Account<'info, Authority>,
}

pub fn handler(ctx: Context<RevokeAuthority>) -> Result<()> {
    let auth = &mut ctx.accounts.authority;
    auth.active = false;
    msg!("authority revoked: signer={}", auth.signer);
    Ok(())
}
