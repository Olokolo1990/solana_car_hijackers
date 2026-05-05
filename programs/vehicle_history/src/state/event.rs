use anchor_lang::prelude::*;

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
    /// Validity window start (e.g. insurance policy start). 0 = N/A.
    pub valid_from: i64,
    /// Validity window end (e.g. insurance expiry, next inspection due). 0 = N/A.
    pub valid_until: i64,
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
    PoliceControl = 12,
    Registration = 13,
}

impl EventType {
    pub fn requires_mileage(&self) -> bool {
        matches!(
            self,
            EventType::Inspection
                | EventType::MileageReading
                | EventType::Accident
                | EventType::Service
                | EventType::PoliceControl
        )
    }
}
