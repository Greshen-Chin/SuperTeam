"use client";

import Link from "next/link";
import { CheckCircle2, Fingerprint, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";
import { VideoDropzone } from "@/components/upload/video-dropzone";
import { VideoPreview } from "@/components/upload/video-preview";
import { routes } from "@/lib/routes";
import { useRegisterVideoFlow } from "./use-register-video-flow";

const progressLabel: Record<string, string> = {
  idle: "Upload original video to start.",
  file_selected: "Video selected. Add details and create proof.",
  fingerprinting: "Generating video fingerprint.",
  ready_to_sign: "Ready to sign.",
  waiting_for_signature: "Confirming proof on Solana Devnet.",
  creating_certificate: "Creating public certificate.",
  success: "Proof certificate created.",
  error: "Something went wrong."
};

export function RegisterView() {
  const flow = useRegisterVideoFlow();

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="space-y-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">Register original</p>
          <h1 className="mt-2 text-3xl font-bold text-ink md:text-4xl">Create proof before your video travels.</h1>
          <p className="mt-3 max-w-2xl text-muted">
            Upload an original short video, generate a fingerprint, and create a public certificate anchored to Solana.
          </p>
        </div>

        <Card className="space-y-5">
          <VideoDropzone disabled={flow.state === "fingerprinting"} file={flow.file} onFileSelected={flow.selectFile} />
          <VideoPreview file={flow.file} />

          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              label="Video title"
              name="title"
              placeholder="Original dance trend"
              value={flow.title}
              onChange={(event) => flow.setTitle(event.target.value)}
            />
            <TextField
              helper="Optional for demo; wallet remains the proof signer."
              label="Creator handle"
              name="creatorHandle"
              placeholder="@creator"
              value={flow.creatorHandle}
              onChange={(event) => flow.setCreatorHandle(event.target.value)}
            />
          </div>

          {flow.error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-proof-red">{flow.error}</p> : null}

          <Button disabled={!flow.canCreateProof || ["fingerprinting", "waiting_for_signature", "creating_certificate"].includes(flow.state)} onClick={flow.createProof}>
            <ShieldCheck size={18} />
            Create Proof Certificate
          </Button>
        </Card>
      </section>

      <aside className="space-y-5">
        <Card>
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-700">
              <Fingerprint size={20} />
            </span>
            <div>
              <h2 className="font-semibold text-ink">Proof status</h2>
              <p className="mt-1 text-sm text-muted">{progressLabel[flow.state]}</p>
            </div>
          </div>

          {flow.fingerprint ? (
            <div className="mt-5 space-y-3 rounded-lg bg-surface p-4 text-sm">
              <div>
                <p className="font-semibold text-ink">Video Fingerprint</p>
                <p className="mt-1 break-all text-muted">{flow.fingerprint.fingerprintRoot}</p>
              </div>
              <div>
                <p className="font-semibold text-ink">SHA-256</p>
                <p className="mt-1 break-all text-muted">{flow.fingerprint.sha256}</p>
              </div>
            </div>
          ) : null}
        </Card>

        {flow.proof ? (
          <Card className="border-teal-200 bg-teal-50">
            <CheckCircle2 className="text-proof-green" />
            <h2 className="mt-3 font-semibold text-ink">Certificate ready</h2>
            <p className="mt-1 text-sm text-muted">
              Your proof can now be shared with platforms, brands, agencies, and communities.
            </p>
            <Link className="mt-4 inline-flex text-sm font-semibold text-brand-700" href={routes.certificate(flow.proof.id)}>
              Open certificate
            </Link>
          </Card>
        ) : null}
      </aside>
    </div>
  );
}

