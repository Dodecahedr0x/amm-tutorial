# AMM Tutorial documentation

## Concepts of Autonomous Market Makers

The goal of Automated Market Makers (AMM) is to act as an automatic buyer and seller. The advantages of having an AMM can be:

- Always available trading: since an algorithm does the trading, it can be always on.
- Low operational costs: automation enables cheaper trades as there is no firm in charge of market making.

The hard part then becomes the choice of the algorithm for the AMM.
Recent progress in AMMs on blockchains have mostly been done using Constant Function AMM (CFAMM), where the AMM allows any trade that preserve a predefined condition on a constant function of the AMM's reserves called the Invariant.

The most famous (popularized by Uniswap V2) and one of the simple CFAMM is the Constant Product AMM (CPAMM), where for a given quantity of liquidity, the product of both reserve is constant ($xy = K$, where $x$ denotes the reserve of token A held by the AMM, $y$ denotes the reserve of token B held by the AMM, and $K$ is a constant depending on liquidity). This is the AMM we will focus on and try to implement here.

### Math

Let's suppose that the CPAMM currently has $(x_0, y_0)$ reserves of tokens A and B respectively, and a user wants to trade in $\delta_x$ tokens A for $\delta_y$ tokens B.
We want to find what the $\delta_y$ that the user will receive.

We know that the trade preserves the invariant $xy = K$ so we can write $x_0 y_0 = K = (x_0 + \delta_x) (y_0 - \delta_y)$

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

So we see that we can compute the amount of tokens to receive only using the initial reserves and the input amount.

Users can also deposit liquidity. This should not affect the current price of liquidity, and therefore should preserve the proportion of asset A and B.

## Implementation

### Design

In Solana, it's good practice to split each object into independent accounts. In our case, we have want to have several AMM for different markets (e.g. one for SOL/USDC, one for USDC/USDT, etc...) but they might share some common parameters. For each AMM, we will have deposit accounts storing the reserve of each token, as well as user deposit accounts that will store each user's liquidity provisionning state.

Using this knowledge, we will have the following accounts:

- `Amm` will store global config such as fees or the admin authority
- `Pool` will store the current reserve of each token
- `Deposit` will record a user deposit and represents a claim on the pool's liquidity.

### Steps

The first step will be to setup to instructions to create all our required accounts. The we need to initialize pools by depositing and removing liquidity from them. Finally, we need to allow trades to occur on pools and ensure they respect the invariant.

#### Accounts creation

As a good practice, it is better to have an instruction for the actual account creation and another for updating or using the account, instead of trying to combine these instructions.

**1. AMM**

In order to have incentives for liquidity providers (LP) to deposit capital, we introduce a fee on trades. We could choose to store the fee in the pool but we will prefer to store it in the AMM account instead for the following reasons:

- Saving on account size. Only storing the value once is cheaper, as only the admin pays the rent once and then users can create pools for cheaper.
- Unified liquidity. Having a different fee for each fee will create many pools for the same market. It can also make finding the right pool more difficult.

**2. Pool**

When creating the pool account, we want to make sure to create any account that will be useful later on. This will prevent bad surprises for traders having to pay for the rent of the pool.

We wrap some accounts using the `Box` to prevent loading the account on the stack and only keep them in the heap. This will prevent us from running certain checks on these accounts but will also prevent `stack access violation error`.
