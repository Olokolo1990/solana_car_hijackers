// Anchor `Program<VehicleHistory>` factory.
//
// Two flavours:
//   - getReadOnlyProgram(): for public reads (server-rendered detail pages,
//     authority directory). Uses a throwaway dummy wallet — any attempt to
//     send a transaction throws.
//   - getProgram(anchorWallet): for wallet-connected pages (writer, admin).
//     Pass the `AnchorWallet` from `useAnchorWallet()`.

import {
  AnchorProvider,
  Program,
  type Idl,
  type Wallet,
} from "@coral-xyz/anchor";
import {
  Keypair,
  type Transaction,
  type VersionedTransaction,
} from "@solana/web3.js";
import idlJson from "@/lib/idl.json";
import type { VehicleHistory } from "@/lib/program-types";
import { connection } from "@/lib/solana";

class ReadOnlyWallet implements Wallet {
  payer = Keypair.generate();
  publicKey = this.payer.publicKey;
  async signTransaction<T extends Transaction | VersionedTransaction>(
    _tx: T
  ): Promise<T> {
    throw new Error("Read-only wallet cannot sign transactions");
  }
  async signAllTransactions<T extends Transaction | VersionedTransaction>(
    _txs: T[]
  ): Promise<T[]> {
    throw new Error("Read-only wallet cannot sign transactions");
  }
}

let cachedReadOnly: Program<VehicleHistory> | null = null;

export function getReadOnlyProgram(): Program<VehicleHistory> {
  if (cachedReadOnly) return cachedReadOnly;
  const provider = new AnchorProvider(connection, new ReadOnlyWallet(), {
    commitment: "confirmed",
  });
  cachedReadOnly = new Program<VehicleHistory>(
    idlJson as unknown as Idl,
    provider
  ) as Program<VehicleHistory>;
  return cachedReadOnly;
}

export function getProgram(wallet: Wallet): Program<VehicleHistory> {
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  return new Program<VehicleHistory>(
    idlJson as unknown as Idl,
    provider
  ) as Program<VehicleHistory>;
}
