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

describe("Create deposit", () => {
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
  });

  it("Creation", async () => {
    await program.methods
      .createDeposit()
      .accounts({
        amm: values.ammKey,
        pool: values.poolKey,
        deposit: values.depositKey,
        depositor: values.admin.publicKey,
      })
      .rpc();
  });

  it("Can't create twice", async () => {
    await program.methods
      .createDeposit()
      .accounts({
        amm: values.ammKey,
        pool: values.poolKey,
        deposit: values.depositKey,
        depositor: values.admin.publicKey,
      })
      .rpc();

    await expectRevert(
      program.methods
        .createDeposit()
        .accounts({
          amm: values.ammKey,
          pool: values.poolKey,
          deposit: values.depositKey,
          depositor: values.admin.publicKey,
        })
        .rpc()
    );
  });
});
