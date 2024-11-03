use anchor_lang::prelude::*;

mod constants;
mod errors;
mod instructions;
mod state;

pub use instructions::*;

// Set the correct key here
declare_id!("9e2DFyoPwf9GNZ9oyGBpsh5W9FoT2CwUJ5USX9qVHMF8");

#[program]
pub mod amm_tutorial {
    use super::*;

    pub fn create_amm(ctx: Context<CreateAmm>, id: Pubkey, fee: u16) -> Result<()> {
        ctx.accounts.create_amm(id, fee)?;
        Ok(())
    }

    pub fn create_pool(ctx: Context<CreatePool>) -> Result<()> {
        ctx.accounts.create_pool()
    }

    pub fn deposit_liquidity(
        ctx: Context<DepositLiquidity>,
        amount_a: u64,
        amount_b: u64,
    ) -> Result<()> {
        ctx.accounts
            .deposit_liquidity(amount_a, amount_b, &ctx.bumps)
    }

    pub fn withdraw_liquidity(ctx: Context<WithdrawLiquidity>, amount: u64) -> Result<()> {
        ctx.accounts.withdraw_liquidity(amount, &ctx.bumps)
    }

    pub fn swap_exact_tokens_for_tokens(
        ctx: Context<SwapExactTokensForTokens>,
        swap_a: bool,
        input_amount: u64,
        min_output_amount: u64,
    ) -> Result<()> {
        ctx.accounts.swap_exact_tokens_for_tokens(
            swap_a,
            input_amount,
            min_output_amount,
            &ctx.bumps,
        )
    }
}
