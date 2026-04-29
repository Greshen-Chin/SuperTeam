"use client";

import { useMemo, useState } from "react";
import { registerProofOnChain } from "@/lib/blockchain-adapter";
import { apiClient } from "@/lib/api-client";
import type { Fingerprint, Proof } from "@/shared/schemas";

type RegisterState =
  | "idle"
  | "file_selected"
  | "fingerprinting"
  | "ready_to_sign"
  | "waiting_for_signature"
  | "creating_certificate"
  | "success"
  | "error";

const demoCreatorWallet = "VcHn9E2NmF3uP8KoLq21xProofCreatorWalletSolana";

export function useRegisterVideoFlow() {
  const [state, setState] = useState<RegisterState>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [creatorHandle, setCreatorHandle] = useState("");
  const [fingerprint, setFingerprint] = useState<Fingerprint | null>(null);
  const [proof, setProof] = useState<Proof | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canCreateProof = useMemo(() => Boolean(file && title.trim()), [file, title]);

  function selectFile(nextFile: File) {
    setFile(nextFile);
    setFingerprint(null);
    setProof(null);
    setError(null);
    setState("file_selected");
  }

  async function createProof() {
    if (!file || !title.trim()) return;

    try {
      setError(null);
      setState("fingerprinting");
      const nextFingerprint = await apiClient.createFingerprint(file);
      setFingerprint(nextFingerprint);

      setState("waiting_for_signature");
      const proofId = `proof_${Date.now()}`;
      const onChainResult = await registerProofOnChain({
        proofId,
        creatorWallet: demoCreatorWallet,
        sha256: nextFingerprint.sha256,
        fingerprintRoot: nextFingerprint.fingerprintRoot,
        metadataUri: `ipfs://metadata/${proofId}`
      });

      setState("creating_certificate");
      const nextProof = await apiClient.registerProof({
        title: title.trim(),
        creatorHandle: creatorHandle.trim() || undefined,
        creatorWallet: demoCreatorWallet,
        fingerprint: nextFingerprint,
        solanaSignature: onChainResult.signature
      });

      setProof(nextProof);
      setState("success");
    } catch {
      setError("Could not create proof. Please try again with another video.");
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
    selectFile,
    setTitle,
    setCreatorHandle,
    createProof
  };
}

