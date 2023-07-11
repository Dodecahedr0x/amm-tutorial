use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct Amm {
    /// Primary key of the AMM
    pub id: Pubkey,

    /// Account that has admin authority over the AMM
    pub admin: Pubkey,

    /// The LP fee taken on each trade, in basis points
    pub fee: u16,
}

impl Amm {
    pub const LEN: usize = 8 + 32 + 32 + 2;
}

#[account]
#[derive(Default)]
pub struct Pool {
    /// Primary key of the AMM
    pub amm_id: Pubkey,

    /// Mint of token A
    pub mint_a: Pubkey,

    /// Mint of token B
    pub mint_b: Pubkey,

    /// Amount of liquidity in that pool
    pub liquidity: u64,
}

impl Pool {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 8;
}
