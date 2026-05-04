use anchor_lang::prelude::*;

#[error_code]
pub enum VehiclePassportError {
    #[msg("Mileage cannot be lower than the last recorded value")]
    MileageRollback,
    #[msg("Authority is not active")]
    AuthorityRevoked,
    #[msg("Authority kind is not allowed to write this event type")]
    AuthorityKindNotAllowed,
    #[msg("Only the admin can perform this action")]
    NotAdmin,
    #[msg("Only a manufacturer can mint a new passport")]
    NotManufacturer,
    #[msg("Only a registration office can transfer ownership")]
    NotRegistrationOffice,
    #[msg("Vehicle has already been registered for this VIN")]
    VehicleAlreadyRegistered,
    #[msg("String input exceeds maximum allowed length")]
    StringTooLong,
    #[msg("Event type is not recognized")]
    UnknownEventType,
}
