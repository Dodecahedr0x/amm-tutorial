import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import { AmmTutorial } from "../target/types/amm_tutorial";
import { expect } from "chai";
import { expectRevert } from "./utils";

describe("amm-tutorial", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.AmmTutorial as Program<AmmTutorial>;

  describe("Create an AMM instance", () => {
    let id: PublicKey;
    let fee: number;
    let admin: Keypair;

    beforeEach(() => {
      id = Keypair.generate().publicKey;
      fee = 500;
      admin = Keypair.generate();
    });

    it("Creation", async () => {
      const ammKey = PublicKey.findProgramAddressSync(
        [id.toBuffer()],
        program.programId
      )[0];
      await program.methods
        .createAmm(id, fee)
        .accounts({ amm: ammKey, admin: admin.publicKey })
        .rpc();

      const ammAccount = await program.account.amm.fetch(ammKey);
      expect(ammAccount.id.toString()).to.equal(id.toString());
      expect(ammAccount.admin.toString()).to.equal(admin.publicKey.toString());
      expect(ammAccount.fee.toString()).to.equal(fee.toString());
    });

    it("Invalid fee", async () => {
      fee = 10000;
      const ammKey = PublicKey.findProgramAddressSync(
        [id.toBuffer()],
        program.programId
      )[0];
      await expectRevert(
        program.methods
          .createAmm(id, fee)
          .accounts({ amm: ammKey, admin: admin.publicKey })
          .rpc()
      );
    });
  });
});
