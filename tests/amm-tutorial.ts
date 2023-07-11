import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { AmmTutorial } from "../target/types/amm_tutorial";

describe("amm-tutorial", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.AmmTutorial as Program<AmmTutorial>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});
