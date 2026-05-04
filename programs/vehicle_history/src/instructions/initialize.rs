use anchor_lang::prelude::*;

use crate::constants::GLOBAL_CONFIG_SEED;
use crate::state::GlobalConfig;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + GlobalConfig::INIT_SPACE,
        seeds = [GLOBAL_CONFIG_SEED],
        bump
    )]
    pub global_config: Account<'info, GlobalConfig>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Initialize>) -> Result<()> {
    let cfg = &mut ctx.accounts.global_config;
    cfg.admin = ctx.accounts.admin.key();
    cfg.vehicle_count = 0;
    cfg.authority_count = 0;
    cfg.bump = ctx.bumps.global_config;
    msg!("vehicle_passport initialized; admin={}", cfg.admin);
    Ok(())
}
