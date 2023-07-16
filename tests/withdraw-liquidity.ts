import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import {
  createMint,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { AmmTutorial } from "../target/types/amm_tutorial";
import { expect } from "chai";
import { TestValues, createValues, expectRevert, mintingTokens } from "./utils";
import { BN } from "bn.js";

describe("Withdraw liquidity", () => {
  const provider = anchor.AnchorProvider.env();
  const connection = provider.connection;
  anchor.setProvider(provider);

  const program = anchor.workspace.AmmTutorial as Program<AmmTutorial>;

  let values: TestValues;

  beforeEach(async () => {
    values = createValues();

    await program.methods
      .createAmm(values.id, values.fee)
      .accounts({ amm: values.ammKey, admin: values.admin.publicKey })
      .rpc();

    await mintingTokens({
      connection,
      creator: values.admin,
      mintAKeypair: values.mintAKeypair,
      mintBKeypair: values.mintBKeypair,
    });

    await program.methods
      .createPool()
      .accounts({
        amm: values.ammKey,
        pool: values.poolKey,
        poolAuthority: values.poolAuthority,
        mintLiquidity: values.mintLiquidityKeypair.publicKey,
        mintA: values.mintAKeypair.publicKey,
        mintB: values.mintBKeypair.publicKey,
        poolAccountA: values.poolAccountA,
        poolAccountB: values.poolAccountB,
      })
      .signers([values.mintLiquidityKeypair])
      .rpc();

    await program.methods
      .depositLiquidity(values.depositAmountA, values.depositAmountB)
      .accounts({
        amm: values.ammKey,
        pool: values.poolKey,
        poolAuthority: values.poolAuthority,
        depositor: values.admin.publicKey,
        mintLiquidity: values.mintLiquidityKeypair.publicKey,
        mintA: values.mintAKeypair.publicKey,
        mintB: values.mintBKeypair.publicKey,
        poolAccountA: values.poolAccountA,
        poolAccountB: values.poolAccountB,
        depositorAccountLiquidity: values.liquidityAccount,
        depositorAccountA: values.holderAccountA,
        depositorAccountB: values.holderAccountB,
      })
      .signers([values.admin])
      .rpc({ skipPreflight: true });
  });

  it("Withdraw everything", async () => {
    await program.methods
      .withdrawLiquidity(values.depositAmountA.sub(values.minimumLiquidity))
      .accounts({
        amm: values.ammKey,
        pool: values.poolKey,
        poolAuthority: values.poolAuthority,
        depositor: values.admin.publicKey,
        mintLiquidity: values.mintLiquidityKeypair.publicKey,
        mintA: values.mintAKeypair.publicKey,
        mintB: values.mintBKeypair.publicKey,
        poolAccountA: values.poolAccountA,
        poolAccountB: values.poolAccountB,
        depositorAccountLiquidity: values.liquidityAccount,
        depositorAccountA: values.holderAccountA,
        depositorAccountB: values.holderAccountB,
      })
      .signers([values.admin])
      .rpc({ skipPreflight: true });

    const liquidityTokenAccount = await connection.getTokenAccountBalance(
      values.liquidityAccount
    );
    const depositTokenAccountA = await connection.getTokenAccountBalance(
      values.holderAccountA
    );
    const depositTokenAccountB = await connection.getTokenAccountBalance(
      values.holderAccountB
    );
    expect(liquidityTokenAccount.value.amount).to.equal("0");
    expect(Number(depositTokenAccountA.value.amount)).to.be.lessThan(
      values.defaultSupply.toNumber()
    );
    expect(Number(depositTokenAccountA.value.amount)).to.be.greaterThan(
      values.defaultSupply.sub(values.depositAmountA).toNumber()
    );
    expect(Number(depositTokenAccountB.value.amount)).to.be.lessThan(
      values.defaultSupply.toNumber()
    );
    expect(Number(depositTokenAccountB.value.amount)).to.be.greaterThan(
      values.defaultSupply.sub(values.depositAmountB).toNumber()
    );
  });
});
