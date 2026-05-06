use anchor_lang::prelude::*;

#[constant]
pub const GLOBAL_CONFIG_SEED: &[u8] = b"global_config";

#[constant]
pub const AUTHORITY_SEED: &[u8] = b"authority";

#[constant]
pub const VEHICLE_SEED: &[u8] = b"vehicle";

#[constant]
pub const EVENT_SEED: &[u8] = b"event";

// IDL builder in Anchor 0.31 doesn't accept `usize` for `#[constant]` (calls
// `usize::get_full_path()` which doesn't exist). Using `u64` and casting at
// the call site keeps the constants exposed in the IDL.
#[constant]
pub const MAX_NAME_LEN: u64 = 64;

#[constant]
pub const MAX_MAKE_LEN: u64 = 32;

#[constant]
pub const MAX_MODEL_LEN: u64 = 32;

/// Free-text comment per event (e.g. "first-time registration after import").
/// Generous enough for one or two sentences. Old events from before the v3
/// redeploy don't have this field and won't be readable with the new IDL.
#[constant]
pub const MAX_EVENT_DESCRIPTION_LEN: u64 = 256;
