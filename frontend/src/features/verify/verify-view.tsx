"use client";

import Link from "next/link";
import { SearchCheck } from "lucide-react";
import { ConfidenceMeter } from "@/components/proof/confidence-meter";
import { ProofStatusBadge } from "@/components/proof/proof-status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VideoDropzone } from "@/components/upload/video-dropzone";
import { VideoPreview } from "@/components/upload/video-preview";
import { useVerifyVideoFlow } from "./use-verify-video-flow";

export function VerifyView() {
  const flow = useVerifyVideoFlow();
  const isBusy = flow.state === "fingerprinting" || flow.state === "checking";

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="space-y-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">Check original</p>
          <h1 className="mt-2 text-3xl font-bold text-ink md:text-4xl">Find the registered origin of a repost.</h1>
          <p className="mt-3 max-w-2xl text-muted">
            Upload a suspected repost or compressed copy. VidChain will compare its fingerprint against registered proofs.
          </p>
        </div>

        <Card className="space-y-5">
          <VideoDropzone disabled={isBusy} file={flow.file} onFileSelected={flow.selectFile} />
          <VideoPreview file={flow.file} />

          {flow.error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-proof-red">{flow.error}</p> : null}

          <Button disabled={!flow.file || isBusy} onClick={flow.verify}>
            <SearchCheck size={18} />
            Check Original
          </Button>
        </Card>
      </section>

      <aside>
        <Card>
          <h2 className="font-semibold text-ink">Verification result</h2>
          <p className="mt-1 text-sm text-muted">
            Results are phrased as evidence, not legal judgment. VidChain shows likely origin matches.
          </p>

          {isBusy ? (
            <div className="mt-5 rounded-lg bg-surface p-4 text-sm text-muted">Generating fingerprint and checking candidates...</div>
          ) : null}

          {flow.result ? (
            <div className="mt-5 space-y-4">
              <ProofStatusBadge matchType={flow.result.matchType} />
              <ConfidenceMeter value={flow.result.confidence} />
              {flow.result.certificateUrl ? (
                <Link className="inline-flex text-sm font-semibold text-brand-700" href={flow.result.certificateUrl}>
                  Open original certificate
                </Link>
              ) : (
                <p className="rounded-lg bg-surface p-4 text-sm text-muted">
                  No registered origin was found in this demo dataset.
                </p>
              )}
            </div>
          ) : null}
        </Card>
      </aside>
    </div>
  );
}

