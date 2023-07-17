# Tutorial

Uniswap is regularly the [most used app in crypto](https://etherscan.io/dashboards/gas-guzzler) by a wide margin (in terms of blockspace). This can be explained but the strong need for users to exchange blockchains most abundant objects: tokens. In this tutorial, we're going to recreate [UniswapV2](https://blog.uniswap.org/uniswap-v2) from scratch, creating tested on-chain program using [Anchor](https://www.anchor-lang.com/) and a simple and effective front-end using a [NextJS](https://nextjs.org/) web app hosted with [Vercel](https://vercel.com/).

First we'll go over what Uniswap does and what its V2 specificities. Then, we'll present all the mathematical concepts used to make this AMM work before diving in the on-chain program. We'll then finish by creating a simple interface web app using NextJS.

## UniswapV2

### Overview

The goal of Automated Market Makers (AMM) is to act as an automatic buyer and seller for when users want to trade. The advantages of having an AMM can be:

- Always available trading: since an algorithm does the trading, it can be always on.
- Low operational costs: automation enables cheaper trades as there is no firm in charge of market making.

The hard part then becomes the choice of the algorithm for the AMM.
Recent progress in AMMs on blockchains have mostly been done using Constant Function AMM (CFAMM), where the AMM allows any trade that preserve a predefined condition on a constant function of the AMM's reserves called the Invariant. Enforcing the invariant forces reserves to evolve according to _Bonding Curve_.

The most famous (popularized by Uniswap V2) and one of the simplest CFAMM is the Constant Product AMM (CPAMM), where for a given quantity of liquidity, the product of both reserve is constant ($xy = K$, where $x$ denotes the reserve of token A held by the AMM, $y$ denotes the reserve of token B held by the AMM, and $K$ is a constant depending on liquidity).

Other interesting bonding curves include:

- Constant Sum AMM (CSAMM) where the invariant of the pool is $x + y = K$, which means that the price will be constant but reserves for each assets can be emptied.
- [Curve's stableswap](https://miguelmota.com/blog/understanding-stableswap-curve/) mixes CSAMM and CPAMM depending on the balance between tokens.
- Uniswap V3 Concentrated Liquidity AMM (CLAMM) uses a CPAMM but splits the curve inseveral independant buckets. This way, you can provide liquidity only to the price buckets where the tokens will trade instead of the whole curve.
- [Trader Joe CLAMM](https://docs.traderjoexyz.com/concepts/concentrated-liquidity), similar to UniV3 CLAMM, divides the price range into buckets but each bucket work as a CSAMM instead of a CPAMM.

Although CPAMMs are getting old and there are more efficient alternatives available, CPAMMs still have a lot going for them:

- Easier to understand and use. Unlike concentrated liquidity buckets you have to find and go through to trade, CPAMMs have a single pool that's straightforward to trade with.
- Memory efficiency. Because you only have to maintain one pool and not a set of buckets, you end up using a lot less memory (account rent in Solana) than alternatives. Compared to Serum/Openbook markets that costs about 4 SOL, creating a new pool costs only fractions of that.

For these reasons, this is the AMM we will focus on and try to implement here.

### Math

![Quick mafs](./media/quickmath.jpg)

Let's suppose that the CPAMM currently has $(x_0, y_0) \in \mathbb{R}^{+*}$ reserves of tokens X and Y respectively, and a user wants to trade in $\delta_x$ tokens X for $\delta_y$ tokens Y. It's important to note that the basic CPAMM can never have an empty reserve. We want to find what the $\delta_y$ that the user will receive, or inversely, what $\delta_x$ is given a $\delta_y$.

Using the image below, we can see that if we start with the pool having $x_0 = 1$ and $y_0 = 4$, trading 1 token X will give us at best 2 tokens Y. We can see that because we traded a large portion of the pool's reserves, a lot of slippage occured: the initial price was 4Y = 1X but ended up at 1Y = 1X.

![Bonding curve](./media/curve.png)

Now that we have the intuition of what is happening, we will try to formalize a bit how prices evolves with trades. We know that the trade preserves the invariant $xy = K$ so we can write $x_0 y_0 = K = (x_0 + \delta_x) (y_0 - \delta_y)$

$$
x_0 y_0 = K = (x_0 + \delta_x) (y_0 - \delta_y)
\\
x_0 y_0 - x_0 \delta_y + \delta_x y_0 - \delta_x \delta_y = x_0 y_0
\\
\delta_x \delta_y + x_0 \delta_y = \delta_x y_0
\\
\delta_y (\delta_x + x_0) = \delta_x y_0
\\
\delta_y = \frac{\delta_x y_0}{\delta_x + x_0}
$$

So we see that we can compute the amount of tokens to receive only using the initial reserves and the input amount. Inversely, we can compute $\delta_x$ given $\delta_y$ ("How much SOL do I need to sell to get 3USDC?"):

$$
x_0 y_0 - x_0 \delta_y + \delta_x y_0 - \delta_x \delta_y = x_0 y_0
\\
\delta_x y_0 - \delta_x \delta_y = x_0 \delta_y
\\
\delta_x (y_0 - \delta_y) = x_0 \delta_y
\\
\delta_x = \frac{x_0 \delta_y}{y_0 - \delta_y}
$$

Users can also deposit liquidity. This should not affect the current price of liquidity, and therefore should preserve the proportion of asset A and B.
Given the current reserve $(x, y)$ and the reserves user wants to add $(x_u, y_u)$, we want to find $(x_f, y_f)$ such that $x_f \leq x_u, y_f \leq y_u$:

$$
\frac{x}{y} = \frac{x_f}{y_f}
\\
\
\\
\text{if } {x > y}, x_f = \frac{y_u x}{y}, y_f = y_u
\\
\
\\
\text{else } {x < y}, x_f = x_u, y_f = \frac{x_u y}{x}
$$

## On-chain Program Implementation

### Setup

To follow this tutorial, you'll need to install [Anchor following these instructions](https://medium.com/r/?url=https%3A%2F%2Fwww.anchor-lang.com%2Fdocs%2Finstallation). It will make you install Rust, Solana, Node.js, Yarn and Anchor.

### Design

Let's recap what we need:
Each pool will have a fee to pay Liquidity Providers (LPs). This fee is taken on trade, paid in the traded token directly. The fee will be shared for all pools to preserve consistency in the trading experience.
There will be exactly one pool for each pair of asset. This limits liquidity fragmentation and makes it easier for devs to find the right pool
We need to keep the accounting for LPs deposits.

Since pools can share parameters (here, the trading fee), we should create one account for the them and the one account for each pool. This can generally save us some bytes of state, except for configuration smaller than 32 bytes (the size of the discriminator) because the other account needs to store its pubkey. In our case, we'll add an admin for the AMM that can control fees so we are above the limit.
Each pool should be unique and to ensure that we'll (a) use seeds to generate the Program Derived Account (PDA) and (b) add a constraints to make sure there is no ambiguity.
Finally, we'll use SPL token for accounting liquidity, this way it's easily composable.

### Principles

Below is a list of principles I believe are useful when building on-chain programs:

- Store keys in the account. When creating PDAs using seeds, it's good to store those keys in the account. Although it can be redundant, increasing account rent, it allows easily finding the account (you have everything in it to recreate it's pubkey) and pairs nicely with Anchor's `has_one` clause.
- Use straightforward seeds. PDA seeds should follow a simple logic to make it easy to remember and to clarify how accounts relate to each other. My logic is that you first put the seeds of the parent account, and then use the current object's identifiers, in alphabetical order ideally. For example, we have our AMM account storing the configuration that has no parent. The admin can change and so we can't use it as a key so we have to add an identifier attribute, generally a pubkey. For pools, they have the AMM as parent and are defined uniquely by the tokens they facilitate trades for, so I would first use the AMM's pubkey as seed, then token A's pubkey, then B's.
- Minimize instruction's scope. Keeping each instruction's scope as small as possible helps reduce transaction size (less accounts touched at once) while helping composability, but also helps readability and security. The disadvantage is the increased Lines Of Codes (LOC).

### Coding

The code for the whole tutorial can be found on Github. I will not explain every single file of the repo but will go over the most important ones and the general structure. Get started using these commands:

```bash
git clone https://github.com/Dodecahedr0x/amm-tutorial
cd amm-tutorial
yarn
anchor keys list
```

Don't forget to copy the program's key in the Anchor.toml file and in the lib.rs at the root of the program folder.
For now, we will focus on the program's structure in the ./programs/amm-tutorial/src folder, which looks like this:

```bash
programs/amm-tutorial/src/
├── constants.rs
├── errors.rs
├── instructions
│   ├── create_amm.rs
│   ├── create_pool.rs
│   ├── deposit_liquidity.rs
│   ├── mod.rs
│   ├── swap_exact_tokens_for_tokens.rs
│   └── withdraw_liquidity.rs
├── lib.rs
└── state.rs
```

Keeping files separate helps make the project cleaner in my opinion:
constants.rs contains all the constants the program uses. By using the macro #[constant] before the declaration of the constant, Anchor knows to export the constant in the generated IDL.
state.rs contains accounts definitions as well as any implementation for those accounts.
errors.rs contains all the different error codes so that Anchor can more explicit errors.
Instructions are separated in a module because each file can be lengthy can pasting them together make navigation harder.

1. The entrypoint

```rust
use anchor_lang::prelude::*;

mod constants;
mod errors;
mod instructions;
mod state;

pub use instructions::*;

// Set the correct key here
declare_id!("CUPMV4NGFSBQcjbPfZZJodNLkzfBUyjobW6Fg8E4fF7s");

#[program]
pub mod amm_tutorial {
    use super::*;

    pub fn create_amm(ctx: Context<CreateAmm>, id: Pubkey, fee: u16) -> Result<()> {
        instructions::create_amm(ctx, id, fee)
    }

    pub fn create_pool(ctx: Context<CreatePool>) -> Result<()> {
        instructions::create_pool(ctx)
    }

    pub fn deposit_liquidity(
        ctx: Context<DepositLiquidity>,
        amount_a: u64,
        amount_b: u64,
    ) -> Result<()> {
        instructions::deposit_liquidity(ctx, amount_a, amount_b)
    }

    pub fn withdraw_liquidity(ctx: Context<WithdrawLiquidity>, amount: u64) -> Result<()> {
        instructions::withdraw_liquidity(ctx, amount)
    }

    pub fn swap_exact_tokens_for_tokens(
        ctx: Context<SwapExactTokensForTokens>,
        swap_a: bool,
        input_amount: u64,
        min_output_amount: u64,
    ) -> Result<()> {
        instructions::swap_exact_tokens_for_tokens(ctx, swap_a, input_amount, min_output_amount)
    }
}
```

The entrypoint (lib.rs) defines all the program's instruction but the code for each instruction is in the instructions folder.

2. Account definitions

```rust
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
}

impl Pool {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 32;
}
```
