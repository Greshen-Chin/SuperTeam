"use client";

import { useState } from "react";
import { apiClient } from "@/lib/api-client";
import type { VerificationResult } from "@/shared/schemas";

type VerifyState = "idle" | "file_selected" | "fingerprinting" | "checking" | "match_found" | "no_match" | "error";

export function useVerifyVideoFlow() {
  const [state, setState] = useState<VerifyState>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function selectFile(nextFile: File) {
    setFile(nextFile);
    setResult(null);
    setError(null);
    setState("file_selected");
  }

  async function verify() {
    if (!file) return;

    try {
      setError(null);
      setState("fingerprinting");
      setState("checking");
      const nextResult = await apiClient.verifyVideo(file);
      setResult(nextResult);
      setState(nextResult.matchType === "none" ? "no_match" : "match_found");
    } catch {
      setError("Could not verify this video. Please try again.");
      setState("error");
    }
  }

  return {
    state,
    file,
    result,
    error,
    selectFile,
    verify
  };
}

