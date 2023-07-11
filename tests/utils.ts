import * as anchor from "@project-serum/anchor";
import { Keypair } from "@solana/web3.js";

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
