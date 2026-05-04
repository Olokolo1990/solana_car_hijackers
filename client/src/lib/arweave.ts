// Arweave upload via Irys SDK. Used for photos and full event JSON payloads
// where only the hash + Arweave tx ID is anchored on-chain.

import { sha256 } from "@noble/hashes/sha256";

export interface UploadResult {
  arweaveId: string;          // 43-char base64url
  arweaveIdBytes: Uint8Array; // 32 bytes (decoded) — what goes on-chain
  contentHash: Uint8Array;    // sha256 of the file/payload — also on-chain
}

export async function uploadPhoto(_file: File): Promise<UploadResult> {
  // TODO: integrate Irys SDK with a server-side payer (devnet free tier first).
  //   const irys = new Irys({ network: "devnet", token: "solana", key: ... });
  //   const receipt = await irys.upload(file, { tags: [...] });
  // For now, return a deterministic stub so the rest of the flow can be wired.
  const content = new Uint8Array([1, 2, 3]); // placeholder
  const contentHash = sha256(content);
  return {
    arweaveId: "stub_arweave_id_replace_with_real_upload__43chars__",
    arweaveIdBytes: contentHash, // wrong but fixed-size; replace post-Irys wiring
    contentHash,
  };
}

export async function uploadJsonPayload(
  _payload: Record<string, unknown>
): Promise<UploadResult> {
  // TODO: stringify, upload to Arweave, return real ids.
  const contentHash = sha256(new TextEncoder().encode("{}"));
  return {
    arweaveId: "stub_payload_id__replace_with_real_upload__43chars__",
    arweaveIdBytes: contentHash,
    contentHash,
  };
}
