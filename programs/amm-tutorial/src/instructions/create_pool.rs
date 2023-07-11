use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

use crate::{
    constants::AUTHORITY_SEED,
    errors::*,
    state::{Amm, Pool},
};

pub fn create_pool(ctx: Context<CreatePool>) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    pool.amm_id = ctx.accounts.amm.id;
    pool.mint_a = ctx.accounts.mint_a.key();
    pool.mint_b = ctx.accounts.mint_b.key();

    Ok(())
}

#[derive(Accounts)]
pub struct CreatePool<'info> {
    #[account(
        seeds = [
            amm.id.as_ref()
        ],
        bump,
    )]
    pub amm: Account<'info, Amm>,

    #[account(
        init,
        payer = payer,
        space = Pool::LEN,
        seeds = [
            amm.id.as_ref(),
            mint_a.key().as_ref(),
            mint_b.key().as_ref(),
        ],
        bump,
        constraint = mint_a.key() != mint_b.key() @ TutorialError::InvalidMint,
    )]
    pub pool: Account<'info, Pool>,

    /// CHECK: Read only authority
    #[account(
        seeds = [
            amm.id.as_ref(),
            mint_a.key().as_ref(),
            mint_b.key().as_ref(),
            AUTHORITY_SEED.as_ref(),
        ],
        bump,
    )]
    pub pool_authority: AccountInfo<'info>,

    pub mint_a: Account<'info, Mint>,

    pub mint_b: Account<'info, Mint>,

    #[account(
        init,
        payer = payer,
        associated_token::mint = mint_a,
        associated_token::authority = pool_authority,
    )]
    pub pool_account_a: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = payer,
        associated_token::mint = mint_b,
        associated_token::authority = pool_authority,
    )]
    pub pool_account_b: Account<'info, TokenAccount>,

    /// The account paying for all rents
    #[account(mut)]
    pub payer: Signer<'info>,

    /// Solana ecosystem accounts
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}