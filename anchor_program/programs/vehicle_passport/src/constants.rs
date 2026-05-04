use anchor_lang::prelude::*;

#[constant]
pub const GLOBAL_CONFIG_SEED: &[u8] = b"global_config";

#[constant]
pub const AUTHORITY_SEED: &[u8] = b"authority";

#[constant]
pub const VEHICLE_SEED: &[u8] = b"vehicle";

#[constant]
pub const EVENT_SEED: &[u8] = b"event";

#[constant]
pub const MAX_NAME_LEN: usize = 64;

#[constant]
pub const MAX_MAKE_LEN: usize = 32;

#[constant]
pub const MAX_MODEL_LEN: usize = 32;
