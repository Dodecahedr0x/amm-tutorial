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

  it("Creation", async () => {
    await program.methods
      .createAmm(values.id, values.fee)
      .accounts({ amm: values.ammKey, admin: values.admin.publicKey })
      .rpc();

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
        .rpc()
    );
  });
});
