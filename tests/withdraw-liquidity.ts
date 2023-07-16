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
        poolAccountA: getAssociatedTokenAddressSync(
          values.mintAKeypair.publicKey,
          values.poolAuthority,
          true
        ),
        poolAccountB: getAssociatedTokenAddressSync(
          values.mintBKeypair.publicKey,
          values.poolAuthority,
          true
        ),
      })
      .signers([values.mintLiquidityKeypair])
      .rpc();

    await program.methods
      .createDeposit()
      .accounts({
        amm: values.ammKey,
        pool: values.poolKey,
        deposit: values.depositKey,
        depositor: values.admin.publicKey,
      })
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
        poolAccountA: getAssociatedTokenAddressSync(
          values.mintAKeypair.publicKey,
          values.poolAuthority,
          true
        ),
        poolAccountB: getAssociatedTokenAddressSync(
          values.mintBKeypair.publicKey,
          values.poolAuthority,
          true
        ),
        depositorAccountLiquidity: getAssociatedTokenAddressSync(
          values.mintLiquidityKeypair.publicKey,
          values.admin.publicKey,
          true
        ),
        depositorAccountA: getAssociatedTokenAddressSync(
          values.mintAKeypair.publicKey,
          values.admin.publicKey,
          true
        ),
        depositorAccountB: getAssociatedTokenAddressSync(
          values.mintBKeypair.publicKey,
          values.admin.publicKey,
          true
        ),
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
        deposit: values.depositKey,
        depositor: values.admin.publicKey,
        mintLiquidity: values.mintLiquidityKeypair.publicKey,
        mintA: values.mintAKeypair.publicKey,
        mintB: values.mintBKeypair.publicKey,
        poolAccountA: getAssociatedTokenAddressSync(
          values.mintAKeypair.publicKey,
          values.poolAuthority,
          true
        ),
        poolAccountB: getAssociatedTokenAddressSync(
          values.mintBKeypair.publicKey,
          values.poolAuthority,
          true
        ),
        depositorAccountLiquidity: getAssociatedTokenAddressSync(
          values.mintLiquidityKeypair.publicKey,
          values.admin.publicKey,
          true
        ),
        depositorAccountA: getAssociatedTokenAddressSync(
          values.mintAKeypair.publicKey,
          values.admin.publicKey,
          true
        ),
        depositorAccountB: getAssociatedTokenAddressSync(
          values.mintBKeypair.publicKey,
          values.admin.publicKey,
          true
        ),
      })
      .signers([values.admin])
      .rpc({ skipPreflight: true });

    const liquidityTokenAccount = await connection.getTokenAccountBalance(
      getAssociatedTokenAddressSync(
        values.mintLiquidityKeypair.publicKey,
        values.admin.publicKey,
        true
      )
    );
    const depositTokenAccountA = await connection.getTokenAccountBalance(
      getAssociatedTokenAddressSync(
        values.mintAKeypair.publicKey,
        values.admin.publicKey,
        true
      )
    );
    const depositTokenAccountB = await connection.getTokenAccountBalance(
      getAssociatedTokenAddressSync(
        values.mintBKeypair.publicKey,
        values.admin.publicKey,
        true
      )
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
