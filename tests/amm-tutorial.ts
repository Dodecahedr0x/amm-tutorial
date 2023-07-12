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
import { expectRevert } from "./utils";
import { BN } from "bn.js";

describe("amm-tutorial", () => {
  const provider = anchor.AnchorProvider.env();
  const connection = provider.connection;
  anchor.setProvider(provider);

  const program = anchor.workspace.AmmTutorial as Program<AmmTutorial>;

  let id: PublicKey;
  let fee: number;
  let admin: Keypair;
  let mintAKeypair: Keypair;
  let mintBKeypair: Keypair;
  const defaultSupply = new BN(100 * 10 ** 6);
  let ammKey: PublicKey;
  let poolKey: PublicKey;
  let poolAuthority: PublicKey;
  let mintLiquidityKeypair: Keypair;
  let depositKey: PublicKey;
  let depositAmountA: anchor.BN;
  let depositAmountB: anchor.BN;

  const mintingTokens = async (
    mintedAmount: number = 100,
    decimals: number = 6
  ) => {
    // Mint tokens
    await connection.confirmTransaction(
      await connection.requestAirdrop(admin.publicKey, 10 ** 10)
    );
    await createMint(
      connection,
      admin,
      admin.publicKey,
      admin.publicKey,
      decimals,
      mintAKeypair
    );
    await createMint(
      connection,
      admin,
      admin.publicKey,
      admin.publicKey,
      decimals,
      mintBKeypair
    );
    await getOrCreateAssociatedTokenAccount(
      connection,
      admin,
      mintAKeypair.publicKey,
      admin.publicKey,
      true
    );
    await getOrCreateAssociatedTokenAccount(
      connection,
      admin,
      mintBKeypair.publicKey,
      admin.publicKey,
      true
    );
    await mintTo(
      connection,
      admin,
      mintAKeypair.publicKey,
      getAssociatedTokenAddressSync(
        mintAKeypair.publicKey,
        admin.publicKey,
        true
      ),
      admin.publicKey,
      mintedAmount * 10 ** decimals
    );
    await mintTo(
      connection,
      admin,
      mintBKeypair.publicKey,
      getAssociatedTokenAddressSync(
        mintBKeypair.publicKey,
        admin.publicKey,
        true
      ),
      admin.publicKey,
      mintedAmount * 10 ** decimals
    );
  };

  const setKeypairs = () => {
    id = Keypair.generate().publicKey;
    fee = 500;
    admin = Keypair.generate();
    ammKey = PublicKey.findProgramAddressSync(
      [id.toBuffer()],
      program.programId
    )[0];
    mintAKeypair = Keypair.generate();
    mintBKeypair = Keypair.generate();
    mintLiquidityKeypair = Keypair.generate();
    poolKey = PublicKey.findProgramAddressSync(
      [
        id.toBuffer(),
        mintAKeypair.publicKey.toBuffer(),
        mintBKeypair.publicKey.toBuffer(),
      ],
      program.programId
    )[0];
    poolAuthority = PublicKey.findProgramAddressSync(
      [
        id.toBuffer(),
        mintAKeypair.publicKey.toBuffer(),
        mintBKeypair.publicKey.toBuffer(),
        Buffer.from("authority"),
      ],
      program.programId
    )[0];
    depositKey = PublicKey.findProgramAddressSync(
      [poolKey.toBuffer(), admin.publicKey.toBuffer()],
      program.programId
    )[0];

    depositAmountA = new BN(50 * 10 ** 6);
    depositAmountB = new BN(50 * 10 ** 6);
  };

  describe("Create an AMM instance", () => {
    beforeEach(() => {
      setKeypairs();
    });

    it("Creation", async () => {
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

      await expectRevert(
        program.methods
          .createAmm(id, fee)
          .accounts({ amm: ammKey, admin: admin.publicKey })
          .rpc()
      );
    });
  });

  describe("Create an AMM pool", () => {
    beforeEach(async () => {
      setKeypairs();

      await program.methods
        .createAmm(id, fee)
        .accounts({ amm: ammKey, admin: admin.publicKey })
        .rpc();

      await mintingTokens();
    });

    it("Creation", async () => {
      await program.methods
        .createPool()
        .accounts({
          amm: ammKey,
          pool: poolKey,
          poolAuthority,
          mintLiquidity: mintLiquidityKeypair.publicKey,
          mintA: mintAKeypair.publicKey,
          mintB: mintBKeypair.publicKey,
          poolAccountA: getAssociatedTokenAddressSync(
            mintAKeypair.publicKey,
            poolAuthority,
            true
          ),
          poolAccountB: getAssociatedTokenAddressSync(
            mintBKeypair.publicKey,
            poolAuthority,
            true
          ),
        })
        .signers([mintLiquidityKeypair])
        .rpc({ skipPreflight: true });
    });

    it("Invalid mints", async () => {
      mintBKeypair = mintAKeypair;
      poolKey = PublicKey.findProgramAddressSync(
        [
          id.toBuffer(),
          mintAKeypair.publicKey.toBuffer(),
          mintBKeypair.publicKey.toBuffer(),
        ],
        program.programId
      )[0];
      poolAuthority = PublicKey.findProgramAddressSync(
        [
          id.toBuffer(),
          mintAKeypair.publicKey.toBuffer(),
          mintBKeypair.publicKey.toBuffer(),
          Buffer.from("authority"),
        ],
        program.programId
      )[0];

      await expectRevert(
        program.methods
          .createPool()
          .accounts({
            amm: ammKey,
            pool: poolKey,
            poolAuthority,
            mintLiquidity: mintLiquidityKeypair.publicKey,
            mintA: mintAKeypair.publicKey,
            mintB: mintBKeypair.publicKey,
            poolAccountA: getAssociatedTokenAddressSync(
              mintAKeypair.publicKey,
              poolAuthority,
              true
            ),
            poolAccountB: getAssociatedTokenAddressSync(
              mintBKeypair.publicKey,
              poolAuthority,
              true
            ),
          })
          .signers([mintLiquidityKeypair])
          .rpc()
      );
    });
  });

  describe("Create an AMM deposit account", () => {
    beforeEach(async () => {
      setKeypairs();

      await program.methods
        .createAmm(id, fee)
        .accounts({ amm: ammKey, admin: admin.publicKey })
        .rpc();

      await mintingTokens();

      await program.methods
        .createPool()
        .accounts({
          amm: ammKey,
          pool: poolKey,
          poolAuthority,
          mintLiquidity: mintLiquidityKeypair.publicKey,
          mintA: mintAKeypair.publicKey,
          mintB: mintBKeypair.publicKey,
          poolAccountA: getAssociatedTokenAddressSync(
            mintAKeypair.publicKey,
            poolAuthority,
            true
          ),
          poolAccountB: getAssociatedTokenAddressSync(
            mintBKeypair.publicKey,
            poolAuthority,
            true
          ),
        })
        .signers([mintLiquidityKeypair])
        .rpc();
    });

    it("Creation", async () => {
      await program.methods
        .createDeposit()
        .accounts({
          amm: ammKey,
          pool: poolKey,
          deposit: depositKey,
          depositor: admin.publicKey,
        })
        .rpc();
    });

    it("Can't create twice", async () => {
      await program.methods
        .createDeposit()
        .accounts({
          amm: ammKey,
          pool: poolKey,
          deposit: depositKey,
          depositor: admin.publicKey,
        })
        .rpc();

      await expectRevert(
        program.methods
          .createDeposit()
          .accounts({
            amm: ammKey,
            pool: poolKey,
            deposit: depositKey,
            depositor: admin.publicKey,
          })
          .rpc()
      );
    });
  });

  describe("Depositing liquidity", () => {
    beforeEach(async () => {
      setKeypairs();

      await program.methods
        .createAmm(id, fee)
        .accounts({ amm: ammKey, admin: admin.publicKey })
        .rpc();

      await mintingTokens();

      await program.methods
        .createPool()
        .accounts({
          amm: ammKey,
          pool: poolKey,
          poolAuthority,
          mintLiquidity: mintLiquidityKeypair.publicKey,
          mintA: mintAKeypair.publicKey,
          mintB: mintBKeypair.publicKey,
          poolAccountA: getAssociatedTokenAddressSync(
            mintAKeypair.publicKey,
            poolAuthority,
            true
          ),
          poolAccountB: getAssociatedTokenAddressSync(
            mintBKeypair.publicKey,
            poolAuthority,
            true
          ),
        })
        .signers([mintLiquidityKeypair])
        .rpc();

      await program.methods
        .createDeposit()
        .accounts({
          amm: ammKey,
          pool: poolKey,
          deposit: depositKey,
          depositor: admin.publicKey,
        })
        .rpc();
    });

    it("Deposit", async () => {
      await program.methods
        .depositLiquidity(depositAmountA, depositAmountB)
        .accounts({
          amm: ammKey,
          pool: poolKey,
          poolAuthority,
          deposit: depositKey,
          depositor: admin.publicKey,
          mintLiquidity: mintLiquidityKeypair.publicKey,
          mintA: mintAKeypair.publicKey,
          mintB: mintBKeypair.publicKey,
          poolAccountA: getAssociatedTokenAddressSync(
            mintAKeypair.publicKey,
            poolAuthority,
            true
          ),
          poolAccountB: getAssociatedTokenAddressSync(
            mintBKeypair.publicKey,
            poolAuthority,
            true
          ),
          depositorAccountLiquidity: getAssociatedTokenAddressSync(
            mintLiquidityKeypair.publicKey,
            admin.publicKey,
            true
          ),
          depositorAccountA: getAssociatedTokenAddressSync(
            mintAKeypair.publicKey,
            admin.publicKey,
            true
          ),
          depositorAccountB: getAssociatedTokenAddressSync(
            mintBKeypair.publicKey,
            admin.publicKey,
            true
          ),
        })
        .signers([admin])
        .rpc({ skipPreflight: true });

      const depositAccount = await program.account.deposit.fetch(depositKey);
      expect(depositAccount.liquidity.toString()).to.equal(
        depositAmountA.toString()
      );
      const depositTokenAccountLiquditiy =
        await connection.getTokenAccountBalance(
          getAssociatedTokenAddressSync(
            mintLiquidityKeypair.publicKey,
            admin.publicKey,
            true
          )
        );
      expect(depositTokenAccountLiquditiy.value.amount).to.equal(
        depositAmountA.toString()
      );
      const depositTokenAccountA = await connection.getTokenAccountBalance(
        getAssociatedTokenAddressSync(
          mintAKeypair.publicKey,
          admin.publicKey,
          true
        )
      );
      expect(depositTokenAccountA.value.amount).to.equal(
        defaultSupply.sub(depositAmountA).toString()
      );
      const depositTokenAccountB = await connection.getTokenAccountBalance(
        getAssociatedTokenAddressSync(
          mintBKeypair.publicKey,
          admin.publicKey,
          true
        )
      );
      expect(depositTokenAccountB.value.amount).to.equal(
        defaultSupply.sub(depositAmountB).toString()
      );
    });
  });

  describe("Swap tokens", () => {
    beforeEach(async () => {
      setKeypairs();

      await program.methods
        .createAmm(id, fee)
        .accounts({ amm: ammKey, admin: admin.publicKey })
        .rpc();

      await mintingTokens();

      await program.methods
        .createPool()
        .accounts({
          amm: ammKey,
          pool: poolKey,
          poolAuthority,
          mintLiquidity: mintLiquidityKeypair.publicKey,
          mintA: mintAKeypair.publicKey,
          mintB: mintBKeypair.publicKey,
          poolAccountA: getAssociatedTokenAddressSync(
            mintAKeypair.publicKey,
            poolAuthority,
            true
          ),
          poolAccountB: getAssociatedTokenAddressSync(
            mintBKeypair.publicKey,
            poolAuthority,
            true
          ),
        })
        .signers([mintLiquidityKeypair])
        .rpc();

      await program.methods
        .createDeposit()
        .accounts({
          amm: ammKey,
          pool: poolKey,
          deposit: depositKey,
          depositor: admin.publicKey,
        })
        .rpc();

      await program.methods
        .depositLiquidity(depositAmountA, depositAmountB)
        .accounts({
          amm: ammKey,
          pool: poolKey,
          poolAuthority,
          deposit: depositKey,
          depositor: admin.publicKey,
          mintLiquidity: mintLiquidityKeypair.publicKey,
          mintA: mintAKeypair.publicKey,
          mintB: mintBKeypair.publicKey,
          poolAccountA: getAssociatedTokenAddressSync(
            mintAKeypair.publicKey,
            poolAuthority,
            true
          ),
          poolAccountB: getAssociatedTokenAddressSync(
            mintBKeypair.publicKey,
            poolAuthority,
            true
          ),
          depositorAccountLiquidity: getAssociatedTokenAddressSync(
            mintLiquidityKeypair.publicKey,
            admin.publicKey,
            true
          ),
          depositorAccountA: getAssociatedTokenAddressSync(
            mintAKeypair.publicKey,
            admin.publicKey,
            true
          ),
          depositorAccountB: getAssociatedTokenAddressSync(
            mintBKeypair.publicKey,
            admin.publicKey,
            true
          ),
        })
        .signers([admin])
        .rpc({ skipPreflight: true });
    });

    it("Swap from A to B", async () => {
      const input = new BN(10 ** 6);
      await program.methods
        .swapExactTokensForTokens(true, input, new BN(100))
        .accounts({
          amm: ammKey,
          pool: poolKey,
          poolAuthority,
          trader: admin.publicKey,
          mintA: mintAKeypair.publicKey,
          mintB: mintBKeypair.publicKey,
          poolAccountA: getAssociatedTokenAddressSync(
            mintAKeypair.publicKey,
            poolAuthority,
            true
          ),
          poolAccountB: getAssociatedTokenAddressSync(
            mintBKeypair.publicKey,
            poolAuthority,
            true
          ),
          traderAccountA: getAssociatedTokenAddressSync(
            mintAKeypair.publicKey,
            admin.publicKey,
            true
          ),
          traderAccountB: getAssociatedTokenAddressSync(
            mintBKeypair.publicKey,
            admin.publicKey,
            true
          ),
        })
        .signers([admin])
        .rpc({ skipPreflight: true });

      const traderTokenAccountA = await connection.getTokenAccountBalance(
        getAssociatedTokenAddressSync(
          mintAKeypair.publicKey,
          admin.publicKey,
          true
        )
      );
      const traderTokenAccountB = await connection.getTokenAccountBalance(
        getAssociatedTokenAddressSync(
          mintBKeypair.publicKey,
          admin.publicKey,
          true
        )
      );
      expect(traderTokenAccountA.value.amount).to.equal(
        defaultSupply.sub(depositAmountA).sub(input).toString()
      );
      expect(Number(traderTokenAccountB.value.amount)).to.be.greaterThan(
        defaultSupply.sub(depositAmountB).toNumber()
      );
      expect(Number(traderTokenAccountB.value.amount)).to.be.lessThan(
        defaultSupply.sub(depositAmountB).add(input).toNumber()
      );
    });
  });
});
