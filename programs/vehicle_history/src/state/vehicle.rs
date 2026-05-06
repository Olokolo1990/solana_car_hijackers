use anchor_lang::prelude::*;

use crate::constants::{MAX_COLOR_NAME_LEN, MAX_EQUIPMENT_LEN};

/// FuelType values stored as u8 on Vehicle.fuel_type. Frontend keeps the
/// label map. Codes:
///   0 Petrol, 1 Diesel, 2 Electric, 3 Hybrid, 4 PluginHybrid,
///   5 Hydrogen, 6 LPG, 7 Other
///
/// TransmissionType: 0 Manual, 1 Automatic, 2 SemiAutomatic, 3 CVT, 4 DCT
///
/// BodyType: 0 Sedan, 1 Hatchback, 2 SUV, 3 Coupe, 4 Wagon, 5 Pickup,
///   6 Van, 7 Convertible, 8 Minivan, 9 Other

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

    // === Manufacturer-set specs (added in v4 redeploy 2026-05-06) ===
    /// 0=Petrol 1=Diesel 2=Electric 3=Hybrid 4=PluginHybrid 5=Hydrogen 6=LPG 7=Other
    pub fuel_type: u8,
    /// 0=Manual 1=Automatic 2=SemiAutomatic 3=CVT 4=DCT
    pub transmission: u8,
    /// 0=Sedan 1=Hatchback 2=SUV 3=Coupe 4=Wagon 5=Pickup 6=Van 7=Convertible 8=Minivan 9=Other
    pub body_type: u8,
    /// Engine displacement in cubic centimeters. 0 for EVs.
    pub engine_cc: u16,
    /// Engine power output in horsepower.
    pub power_hp: u16,
    /// Kerb weight in kilograms.
    pub weight_kg: u32,
    /// Number of seats including driver.
    pub seats: u8,
    #[max_len(MAX_COLOR_NAME_LEN)]
    pub color_name: String,
    /// ISO-3166 alpha-2 country of origin (factory). [0,0] = unset.
    pub country_of_origin: [u8; 2],
    #[max_len(MAX_EQUIPMENT_LEN)]
    pub equipment: String,

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
