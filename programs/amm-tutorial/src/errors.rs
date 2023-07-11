use anchor_lang::prelude::*;

#[error_code]
pub enum TutorialError {
    #[msg("Invalid fee value")]
    InvalidFee,

    #[msg("Invalid mint for the pool")]
    InvalidMint,
}
