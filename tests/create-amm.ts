import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { AmmTutorial } from "../target/types/amm_tutorial";
import { expect } from "chai";
import { TestValues, createValues, expectRevert } from "./utils";

describe("Create AMM", () => {
  const provider = anchor.AnchorProvider.env();
  const connection = provider.connection;
  anchor.setProvider(provider);

  const program = anchor.workspace.AmmTutorial as Program<AmmTutorial>;

  let values: TestValues;

  beforeEach(() => {
    values = createValues();
  });

 //Airdrop tokens to both accounts
 it("Airdrop tokens to auth and payer", async () => {
  const tx_maker = await provider.connection.requestAirdrop(
    values.admin.publicKey,
    anchor.web3.LAMPORTS_PER_SOL*10
  );
  await provider.connection.confirmTransaction(tx_maker);
  const tx_taker = await provider.connection.requestAirdrop(
    values.ammKey,
    anchor.web3.LAMPORTS_PER_SOL*10
  );
  await provider.connection.confirmTransaction(tx_taker);
  console.log(`Maker airdrop tx: ${tx_maker}`);
  console.log(`Maker airdrop tx: ${tx_taker}`);
});

  it("Creation", async () => {
    await program.methods
      .createAmm(values.id, values.fee)
      .accounts({ amm: values.ammKey, admin: values.admin.publicKey })
      .rpc({skipPreflight: true});

    const ammAccount = await program.account.amm.fetch(values.ammKey);
    expect(ammAccount.id.toString()).to.equal(values.id.toString());
    expect(ammAccount.admin.toString()).to.equal(
      values.admin.publicKey.toString()
    );
    expect(ammAccount.fee.toString()).to.equal(values.fee.toString());
  });

  it("Invalid fee", async () => {
    values.fee = 10000;

    await expectRevert(
      program.methods
        .createAmm(values.id, values.fee)
        .accounts({ amm: values.ammKey, admin: values.admin.publicKey })
        .rpc({skipPreflight: true})
    );
  });
});
