/**
 * Solana On-Chain Proof
 *
 * Writes a Memo transaction to Solana devnet as verifiable
 * proof that an inference query was executed by this agent.
 *
 * The memo contains: SolRouter|{queryId}|{note}|{timestamp}
 * Visible on Solana Explorer under the wallet address.
 */

import {
  Connection,
  Keypair,
  Transaction,
  TransactionInstruction,
  PublicKey,
  sendAndConfirmTransaction,
  clusterApiUrl,
} from "@solana/web3.js";
import bs58 from "bs58";

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

export async function writeProofOnChain(
  privateKeyBase58: string,
  queryId: string,
  note: string = "SolRouter encrypted inference"
): Promise<string> {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  let keypair: Keypair;
  try {
    const secretKey = bs58.decode(privateKeyBase58);
    keypair = Keypair.fromSecretKey(secretKey);
  } catch {
    throw new Error("Invalid private key. Must be base58 format.");
  }

  const memoText = `SolRouter|${queryId}|${note}|${Date.now()}`;

  const instruction = new TransactionInstruction({
    keys: [{ pubkey: keypair.publicKey, isSigner: true, isWritable: false }],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(memoText, "utf-8"),
  });

  const tx = new Transaction().add(instruction);
  return await sendAndConfirmTransaction(connection, tx, [keypair]);
}
