use anchor_lang::prelude::*;

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

/// AuthorityKind enum, represented as u8 on-chain.
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
