use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token::Token};

use crate::state::{Amm, Deposit, Pool};

pub fn create_deposit(ctx: Context<CreateDeposit>) -> Result<()> {
    let deposit = &mut ctx.accounts.deposit;
    deposit.pool = ctx.accounts.pool.key();
    deposit.depositor = ctx.accounts.depositor.key();

    Ok(())
}

#[derive(Accounts)]
pub struct CreateDeposit<'info> {
    #[account(
        seeds = [
            amm.id.as_ref()
        ],
        bump,
    )]
    pub amm: Account<'info, Amm>,

    #[account(
        seeds = [
            amm.id.as_ref(),
            pool.mint_a.key().as_ref(),
            pool.mint_b.key().as_ref(),
        ],
        bump,
    )]
    pub pool: Account<'info, Pool>,

    #[account(
        init,
        payer = payer,
        space = Deposit::LEN,
        seeds = [
            pool.key().as_ref(),
            depositor.key().as_ref(),
        ],
        bump,
    )]
    pub deposit: Account<'info, Deposit>,

    /// The account paying for all rents
    /// CHECK: Read only authority
    pub depositor: AccountInfo<'info>,

    /// The account paying for all rents
    #[account(mut)]
    pub payer: Signer<'info>,

    /// Solana ecosystem accounts
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}
