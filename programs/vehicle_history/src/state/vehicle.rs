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

    // === Registration cache (set by register_vehicle, may be re-set on re-registration) ===
    /// 0 = vehicle has not yet been officially registered by a Government authority.
    pub registered_at_official: i64,
    /// ISO-3166 alpha-2 country of current registration. [0,0] = none.
    pub registration_country: [u8; 2],
    #[max_len(16)]
    pub current_license_plate: String,
    /// SHA-256 of the current owner's identifier. Zero array = no owner set.
    pub current_owner_hash: [u8; 32],

    // === Police-driven driving lock ===
    /// 0 = driving permitted. Otherwise, unix timestamp when Police set the
    /// block. Has no automatic expiry — only an InspectionStation can clear
    /// it via an Inspection event with `clear_driving_block = true`.
    pub driving_blocked_since: i64,

    pub bump: u8,
}
