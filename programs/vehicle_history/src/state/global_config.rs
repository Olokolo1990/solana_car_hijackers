use anchor_lang::prelude::*;

/// Singleton config: stores admin pubkey and global counters.
#[account]
#[derive(InitSpace)]
pub struct GlobalConfig {
    pub admin: Pubkey,
    pub vehicle_count: u64,
    pub authority_count: u64,
    pub bump: u8,
}
