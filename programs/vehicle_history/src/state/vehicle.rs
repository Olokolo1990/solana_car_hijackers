use anchor_lang::prelude::*;

/// One per VIN. Acts as the on-chain side of the NFT passport.
#[account]
#[derive(InitSpace)]
pub struct Vehicle {
    pub vin_hash: [u8; 32],
    pub mint: Pubkey,                // Metaplex NFT mint linked to this passport
    pub manufacturer: Pubkey,        // Authority PDA that minted it
    #[max_len(32)]
    pub make: String,
    #[max_len(32)]
    pub model: String,
    pub year: u16,
    pub color_code: u32,             // packed RGB or factory color code
    pub equipment_hash: [u8; 32],    // hash of factory equipment package JSON on Arweave
    pub last_mileage: u32,           // for on-chain anti-rollback
    pub event_count: u64,
    pub created_at: i64,
    pub bump: u8,
}
