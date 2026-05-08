"use client";

import { useMemo, useState } from "react";
import { registerProofOnChain } from "@/lib/blockchain-adapter";
import { apiClient } from "@/lib/api-client";
import { extractThumbnail } from "@/lib/extract-thumbnail";
import { useAuth } from "@/context/AuthContext";
import type { Fingerprint, Proof } from "@/shared/schemas";

export type RegisterState =
  | "idle"
  | "file_selected"
  | "fingerprinting"
  | "uploading"
  | "waiting_for_signature"
  | "creating_certificate"
  | "success"
  | "error";

export function useRegisterVideoFlow() {
  const { publicAddress } = useAuth();
  const [state, setState] = useState<RegisterState>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [creatorHandle, setCreatorHandle] = useState("");
  const [fingerprint, setFingerprint] = useState<Fingerprint | null>(null);
  const [proof, setProof] = useState<Proof | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canCreateProof = useMemo(
    () => Boolean(file && title.trim() && publicAddress),
    [file, title, publicAddress]
  );

  function selectFile(nextFile: File) {
    setFile(nextFile);
    setFingerprint(null);
    setProof(null);
    setError(null);
    setState("file_selected");
  }

  function reset() {
    setFile(null);
    setTitle("");
    setCreatorHandle("");
    setFingerprint(null);
    setProof(null);
    setError(null);
    setState("idle");
  }

  async function createProof() {
    if (!file || !title.trim() || !publicAddress) return;

    try {
      setError(null);

      setState("fingerprinting");
      const nextFingerprint = await apiClient.createFingerprint(file);
      setFingerprint(nextFingerprint);

      setState("uploading");
      let ipfsVideoUri: string | undefined;
      let ipfsThumbnailUri: string | undefined;
      try {
        const [videoUpload, thumbnailFile] = await Promise.all([
          apiClient.uploadFile(file),
          extractThumbnail(file).catch(() => null)
        ]);
        ipfsVideoUri = videoUpload.ipfsUrl;
        if (thumbnailFile) {
          const thumbUpload = await apiClient.uploadFile(thumbnailFile).catch(() => null);
          if (thumbUpload) ipfsThumbnailUri = thumbUpload.ipfsUrl;
        }
      } catch {
        // Non-fatal — proceed without IPFS URIs
      }

      setState("waiting_for_signature");
      const proofId = `proof_${Date.now()}`;
      const onChainResult = await registerProofOnChain({
        proofId,
        creatorWallet: publicAddress,
        sha256: nextFingerprint.sha256,
        fingerprintRoot: nextFingerprint.fingerprintRoot,
        metadataUri: `ipfs://metadata/${proofId}`
      });

      setState("creating_certificate");
      const nextProof = await apiClient.registerProof({
        title: title.trim(),
        creatorHandle: creatorHandle.trim() || undefined,
        creatorWallet: publicAddress,
        fingerprint: nextFingerprint,
        solanaSignature: onChainResult.signature,
        ipfsVideoUri,
        ipfsThumbnailUri
      });

      setProof(nextProof);
      setState("success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not create proof. Please try again.";
      setError(msg);
      setState("error");
    }
  }

  return {
    state,
    file,
    title,
    creatorHandle,
    fingerprint,
    proof,
    error,
    canCreateProof,
    publicAddress,
    selectFile,
    setTitle,
    setCreatorHandle,
    createProof,
    reset
  };
}
