import * as anchor from "@project-serum/anchor";
import {
  createMint,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { Keypair, PublicKey, Connection, Signer } from "@solana/web3.js";
import { BN } from "bn.js";

export async function sleep(seconds: number) {
  new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

export const generateSeededKeypair = (seed: string) => {
  return Keypair.fromSeed(
    anchor.utils.bytes.utf8.encode(anchor.utils.sha256.hash(seed)).slice(0, 32)
  );
};

export const expectRevert = async (promise: Promise<any>) => {
  try {
    await promise;
    throw new Error("Expected a revert");
  } catch {
    return;
  }
};

export interface TestValues {
  id: PublicKey;
  fee: number;
  admin: Keypair;
  mintAKeypair: Keypair;
  mintBKeypair: Keypair;
  defaultSupply: anchor.BN;
  ammKey: PublicKey;
  minimumLiquidity: anchor.BN;
  poolKey: PublicKey;
  poolAuthority: PublicKey;
  mintLiquidityKeypair: Keypair;
  depositKey: PublicKey;
  depositAmountA: anchor.BN;
  depositAmountB: anchor.BN;
}

type TestValuesDefaults = {
  [K in keyof TestValues]+?: TestValues[K];
};
export function createValues(defaults?: TestValuesDefaults): TestValues {
  const id = defaults?.id || Keypair.generate().publicKey;
  const admin = Keypair.generate();
  const mintAKeypair = Keypair.generate();
  let mintBKeypair = Keypair.generate();
  while (
    new BN(mintBKeypair.publicKey.toBytes()).lt(
      new BN(mintAKeypair.publicKey.toBytes())
    )
  ) {
    mintBKeypair = Keypair.generate();
  }
  const poolKey = PublicKey.findProgramAddressSync(
    [
      id.toBuffer(),
      mintAKeypair.publicKey.toBuffer(),
      mintBKeypair.publicKey.toBuffer(),
    ],
    anchor.workspace.AmmTutorial.programId
  )[0];
  return {
    id,
    fee: 500,
    admin,
    ammKey: PublicKey.findProgramAddressSync(
      [id.toBuffer()],
      anchor.workspace.AmmTutorial.programId
    )[0],
    mintAKeypair,
    mintBKeypair,
    mintLiquidityKeypair: Keypair.generate(),
    poolKey,
    poolAuthority: PublicKey.findProgramAddressSync(
      [
        id.toBuffer(),
        mintAKeypair.publicKey.toBuffer(),
        mintBKeypair.publicKey.toBuffer(),
        Buffer.from("authority"),
      ],
      anchor.workspace.AmmTutorial.programId
    )[0],
    depositKey: PublicKey.findProgramAddressSync(
      [poolKey.toBuffer(), admin.publicKey.toBuffer()],
      anchor.workspace.AmmTutorial.programId
    )[0],

    depositAmountA: new BN(50 * 10 ** 6),
    depositAmountB: new BN(50 * 10 ** 6),
    minimumLiquidity: new BN(100),
    defaultSupply: new BN(100 * 10 ** 6),
  };
}

export const mintingTokens = async ({
  connection,
  creator,
  holder = creator,
  mintAKeypair,
  mintBKeypair,
  mintedAmount = 100,
  decimals = 6,
}: {
  connection: Connection;
  creator: Signer;
  holder?: Signer;
  mintAKeypair: Keypair;
  mintBKeypair: Keypair;
  mintedAmount?: number;
  decimals?: number;
}) => {
  // Mint tokens
  await connection.confirmTransaction(
    await connection.requestAirdrop(creator.publicKey, 10 ** 10)
  );
  await createMint(
    connection,
    creator,
    creator.publicKey,
    creator.publicKey,
    decimals,
    mintAKeypair
  );
  await createMint(
    connection,
    creator,
    creator.publicKey,
    creator.publicKey,
    decimals,
    mintBKeypair
  );
  await getOrCreateAssociatedTokenAccount(
    connection,
    holder,
    mintAKeypair.publicKey,
    holder.publicKey,
    true
  );
  await getOrCreateAssociatedTokenAccount(
    connection,
    holder,
    mintBKeypair.publicKey,
    holder.publicKey,
    true
  );
  await mintTo(
    connection,
    creator,
    mintAKeypair.publicKey,
    getAssociatedTokenAddressSync(
      mintAKeypair.publicKey,
      holder.publicKey,
      true
    ),
    creator.publicKey,
    mintedAmount * 10 ** decimals
  );
  await mintTo(
    connection,
    creator,
    mintBKeypair.publicKey,
    getAssociatedTokenAddressSync(
      mintBKeypair.publicKey,
      holder.publicKey,
      true
    ),
    creator.publicKey,
    mintedAmount * 10 ** decimals
  );
};
