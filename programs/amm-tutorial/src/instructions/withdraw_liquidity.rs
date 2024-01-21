use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Burn, Mint, Token, TokenAccount, Transfer},
};
use fixed::types::I64F64;

use crate::{
    constants::{AUTHORITY_SEED, LIQUIDITY_SEED, MINIMUM_LIQUIDITY},
    state::{Amm, Pool},
};
impl<'info> WithdrawLiquidity<'info>  {
    
pub fn withdraw_liquidity(
    &mut self, 
    amount: u64, 
    bumps: &WithdrawLiquidityBumps
) -> Result<()> {
    let authority_bump = bumps.pool_authority;
    let authority_seeds = &[
        &self.pool.amm.to_bytes(),
        &self.mint_a.key().to_bytes(),
        &self.mint_b.key().to_bytes(),
        AUTHORITY_SEED.as_bytes(),
        &[authority_bump],
    ];
    let signer_seeds = &[&authority_seeds[..]];

    // Transfer tokens from the pool
    let amount_a = I64F64::from_num(amount)
        .checked_mul(I64F64::from_num(self.pool_account_a.amount))
        .unwrap()
        .checked_div(I64F64::from_num(
            self.mint_liquidity.supply + MINIMUM_LIQUIDITY,
        ))
        .unwrap()
        .floor()
        .to_num::<u64>();
    token::transfer(
        CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            Transfer {
                from: self.pool_account_a.to_account_info(),
                to: self.depositor_account_a.to_account_info(),
                authority: self.pool_authority.to_account_info(),
            },
            signer_seeds,
        ),
        amount_a,
    )?;

    let amount_b = I64F64::from_num(amount)
        .checked_mul(I64F64::from_num(self.pool_account_b.amount))
        .unwrap()
        .checked_div(I64F64::from_num(
            self.mint_liquidity.supply + MINIMUM_LIQUIDITY,
        ))
        .unwrap()
        .floor()
        .to_num::<u64>();
    token::transfer(
        CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            Transfer {
                from: self.pool_account_b.to_account_info(),
                to: self.depositor_account_b.to_account_info(),
                authority: self.pool_authority.to_account_info(),
            },
            signer_seeds,
        ),
        amount_b,
    )?;

    // Burn the liquidity tokens
    // It will fail if the amount is invalid
    token::burn(
        CpiContext::new(
            self.token_program.to_account_info(),
            Burn {
                mint: self.mint_liquidity.to_account_info(),
                from: self.depositor_account_liquidity.to_account_info(),
                authority: self.depositor.to_account_info(),
            },
        ),
        amount,
    )?;

    Ok(())
}

}
#[derive(Accounts)]
pub struct WithdrawLiquidity<'info> {
    #[account(
        seeds = [
            amm.id.as_ref()
        ],
        bump,
    )]
    pub amm: Account<'info, Amm>,

    #[account(
        seeds = [
            pool.amm.as_ref(),
            pool.mint_a.key().as_ref(),
            pool.mint_b.key().as_ref(),
        ],
        bump,
        has_one = mint_a,
        has_one = mint_b,
    )]
    pub pool: Account<'info, Pool>,

    /// CHECK: Read only authority
    #[account(
        seeds = [
            pool.amm.as_ref(),
            mint_a.key().as_ref(),
            mint_b.key().as_ref(),
            AUTHORITY_SEED.as_ref(),
        ],
        bump,
    )]
    pub pool_authority: AccountInfo<'info>,

    /// The account paying for all rents
    pub depositor: Signer<'info>,

    #[account(
        mut,
        seeds = [
            pool.amm.as_ref(),
            mint_a.key().as_ref(),
            mint_b.key().as_ref(),
            LIQUIDITY_SEED.as_ref(),
        ],
        bump,
    )]
    pub mint_liquidity: Box<Account<'info, Mint>>,

    #[account(mut)]
    pub mint_a: Box<Account<'info, Mint>>,

    #[account(mut)]
    pub mint_b: Box<Account<'info, Mint>>,

    #[account(
        mut,
        associated_token::mint = mint_a,
        associated_token::authority = pool_authority,
    )]
    pub pool_account_a: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = mint_b,
        associated_token::authority = pool_authority,
    )]
    pub pool_account_b: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = mint_liquidity,
        associated_token::authority = depositor,
    )]
    pub depositor_account_liquidity: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = mint_a,
        associated_token::authority = depositor,
    )]
    pub depositor_account_a: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = mint_b,
        associated_token::authority = depositor,
    )]
    pub depositor_account_b: Box<Account<'info, TokenAccount>>,

    /// The account paying for all rents
    #[account(mut)]
    pub payer: Signer<'info>,

    /// Solana ecosystem accounts
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}
