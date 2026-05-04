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

/// One per institutional writer (police, SKP, insurer, etc.).
#[account]
#[derive(InitSpace)]
pub struct Authority {
    pub signer: Pubkey,
    pub kind: u8,                    // see AuthorityKind below
    pub country_code: [u8; 2],       // ISO-3166 alpha-2
    #[max_len(64)]
    pub name: String,
    pub active: bool,
    pub events_written: u64,
    pub registered_at: i64,
    pub bump: u8,
}

/// AuthorityKind enum represented as u8 on-chain.
#[repr(u8)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum AuthorityKind {
    Manufacturer = 0,
    RegistrationOffice = 1,
    Police = 2,
    InspectionStation = 3,
    Insurer = 4,
    Customs = 5,
    AuthorizedServiceCenter = 6,
}

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

/// One per appended event. v1 stores events as separate accounts; v2 will
/// migrate to Metaplex Bubblegum compressed leaves to reduce rent costs.
#[account]
#[derive(InitSpace)]
pub struct VehicleEvent {
    pub vehicle: Pubkey,
    pub authority: Pubkey,
    pub event_type: u8,              // see EventType below
    pub timestamp: i64,
    pub mileage_km: u32,
    pub doc_arweave_tx: [u8; 32],    // pointer to Arweave-stored documents/photos
    pub payload_hash: [u8; 32],      // sha256 of full structured JSON payload on Arweave
    pub sequence: u64,               // event_count at the time of write
    pub bump: u8,
}

#[repr(u8)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum EventType {
    Inspection = 0,
    MileageReading = 1,
    Accident = 2,
    Service = 3,
    PartReplacement = 4,
    InsuranceClaim = 5,
    OwnershipTransfer = 6,
    Theft = 7,
    Recovery = 8,
    Import = 9,
    Recall = 10,
    Scrapping = 11,
}

impl EventType {
    pub fn requires_mileage(&self) -> bool {
        matches!(
            self,
            EventType::Inspection
                | EventType::MileageReading
                | EventType::Accident
                | EventType::Service
        )
    }
}
