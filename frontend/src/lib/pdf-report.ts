import type { Proof } from "@/shared/schemas";
import { formatWallet } from "@/lib/utils";

export type PdfReportOptions = {
  proof: Proof;
  channelName: string;
  platformUrl?: string;
  originalVideoUrl?: string;
};

function isMockSig(sig: string) {
  return sig.startsWith("demo_") || sig.startsWith("mock_");
}

export async function downloadProofReport(opts: PdfReportOptions): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const { proof, channelName, platformUrl, originalVideoUrl } = opts;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const W = 210;
  const ML = 18;
  const MR = 18;
  const CW = W - ML - MR; // 174 mm

  let y = 0;

  // ── Helpers ──────────────────────────────────────────────

  function newPageIfNeeded(needed: number) {
    if (y + needed > 272) {
      doc.addPage();
      y = 22;
    }
  }

  function sectionHeader(title: string) {
    newPageIfNeeded(14);
    doc.setFillColor(248, 250, 252);
    doc.rect(ML, y, CW, 7, "F");
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.25);
    doc.rect(ML, y, CW, 7, "S");

    // purple left accent bar
    doc.setFillColor(153, 69, 255);
    doc.rect(ML, y, 2.5, 7, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(109, 40, 217);
    doc.text(title, ML + 6, y + 4.7);
    y += 10;
  }

  function row(label: string, value: string, isLast = false) {
    if (!value) return;
    newPageIfNeeded(10);
    const LABEL_W = 46;
    const VAL_W = CW - LABEL_W - 4;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text(label, ML + 2, y + 4.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    const lines = doc.splitTextToSize(value, VAL_W);
    doc.text(lines, ML + LABEL_W, y + 4.5);

    const rowH = Math.max(8.5, (lines as string[]).length * 4.6 + 2);

    if (!isLast) {
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.2);
      doc.line(ML, y + rowH, ML + CW, y + rowH);
    }
    y += rowH;
  }

  // ── HEADER ───────────────────────────────────────────────

  doc.setFillColor(10, 12, 24);
  doc.rect(0, 0, W, 42, "F");

  // Purple left stripe
  doc.setFillColor(153, 69, 255);
  doc.rect(0, 0, 4, 42, "F");

  // VidChain name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(153, 69, 255);
  doc.text("VidChain", ML, 14);

  // Tagline
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text("Blockchain-Certified Content Ownership Platform", ML, 20.5);

  // Right: document type
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text("DIGITAL CONTENT OWNERSHIP CERTIFICATE", W - MR, 12, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  const certNo = `No. VC-${proof.id.slice(-8).toUpperCase()}`;
  const issueDate = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  doc.text(`${certNo}   •   Issued ${issueDate}`, W - MR, 18.5, { align: "right" });

  // Divider
  doc.setDrawColor(153, 69, 255, 0.4);
  doc.setLineWidth(0.35);
  doc.line(ML, 28, W - MR, 28);

  // Verified badge text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(20, 241, 149);
  doc.text(
    "✓  BLOCKCHAIN VERIFIED   •   SOLANA NETWORK   •   CRYPTOGRAPHICALLY SECURED   •   TAMPER-PROOF",
    ML, 35
  );

  y = 50;

  // ── Green verified notice ──────────────────────────────

  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(134, 239, 172);
  doc.setLineWidth(0.35);
  doc.roundedRect(ML, y, CW, 9, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(21, 128, 61);
  doc.text(
    "✓   This certificate is anchored on the Solana blockchain. The on-chain record cannot be altered or backdated.",
    ML + 4, y + 5.8
  );
  y += 14;

  // ── Section 1: Content Owner ──────────────────────────

  sectionHeader("1.  CONTENT OWNER");
  row("CHANNEL NAME", channelName || "—");
  row("WALLET ADDRESS", proof.creatorWallet);
  row("CREATOR HANDLE", proof.creatorHandle || formatWallet(proof.creatorWallet));
  row("PLATFORM / CHANNEL", platformUrl || "—", true);
  y += 3;

  // ── Section 2: Original Content ───────────────────────

  sectionHeader("2.  ORIGINAL CONTENT DETAILS");
  row("TITLE", proof.title);
  row("CONTENT TYPE", "Video");
  row("REGISTRATION DATE", new Date(proof.registeredAt).toLocaleString("en-GB", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", timeZoneName: "short"
  }));
  row("CONTENT STATUS", proof.status.charAt(0).toUpperCase() + proof.status.slice(1));
  row("ORIGINAL VIDEO URL", originalVideoUrl || "Not provided");
  if (proof.description) row("DESCRIPTION", proof.description, true);
  else row("DESCRIPTION", "—", true);
  y += 3;

  // ── Section 3: Blockchain Proof ───────────────────────

  sectionHeader("3.  BLOCKCHAIN PROOF (SOLANA)");
  row("BLOCKCHAIN", "Solana");
  row("NETWORK", isMockSig(proof.solanaSignature) ? "Solana Devnet (Demo Mode)" : "Solana Devnet");
  row("TRANSACTION SIGNATURE", proof.solanaSignature);
  row("SOLANA EXPLORER URL",
    isMockSig(proof.solanaSignature)
      ? "Demo transaction — no on-chain record"
      : `https://explorer.solana.com/tx/${proof.solanaSignature}?cluster=devnet`
  );
  row("PROOF ID", proof.id, true);
  y += 3;

  // ── Section 4: Cryptographic Fingerprint ──────────────

  sectionHeader("4.  CRYPTOGRAPHIC FINGERPRINT EVIDENCE");
  row("SHA-256 HASH", proof.sha256);
  row("FINGERPRINT ROOT", proof.fingerprintRoot, true);
  y += 3;

  // ── Section 5: Verification Steps ─────────────────────

  sectionHeader("5.  HOW TO VERIFY INDEPENDENTLY");

  const steps = [
    `1.  Open the Solana Explorer URL listed in Section 3 in any browser.`,
    `2.  Confirm the transaction timestamp matches the registration date in Section 2.`,
    `3.  Re-hash the original video file using any SHA-256 tool (e.g. sha256sum on Linux/Mac, CertUtil on Windows) and compare against the hash in Section 4.`,
    `4.  The SHA-256 hash is a unique digital fingerprint — even one byte difference produces a completely different hash, confirming file authenticity.`,
    `5.  The on-chain record is permanent and publicly visible. No authority controls or can alter it.`,
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);

  for (const step of steps) {
    newPageIfNeeded(10);
    const lines = doc.splitTextToSize(step, CW - 8) as string[];
    doc.text(lines, ML + 4, y + 4.5);
    y += lines.length * 4.3 + 2.5;
  }

  y += 4;

  // ── Section 6: Declaration ────────────────────────────

  sectionHeader("6.  GOOD FAITH DECLARATION");

  const creator = channelName || proof.creatorHandle || formatWallet(proof.creatorWallet);
  const regDate = new Date(proof.registeredAt).toLocaleDateString("en-GB", { dateStyle: "long" });
  const today = new Date().toLocaleDateString("en-GB", { dateStyle: "long" });

  const declaration =
    `I, ${creator}, hereby declare in good faith that I am the original creator of the content titled "${proof.title}". ` +
    `The cryptographic proof in this certificate — anchored on the Solana blockchain on ${regDate} — constitutes ` +
    `verifiable, timestamped evidence of my ownership, established prior to any claimed infringement. ` +
    `The SHA-256 hash uniquely identifies the original file. ` +
    `This document is generated by VidChain (vidchain.app) and the blockchain record is publicly auditable on Solana Explorer. ` +
    `I make this declaration on ${today} and confirm the information above is accurate to the best of my knowledge.`;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  const decLines = doc.splitTextToSize(declaration, CW - 6) as string[];
  newPageIfNeeded(decLines.length * 4.3 + 28);
  doc.text(decLines, ML + 3, y + 4.5);
  y += decLines.length * 4.3 + 10;

  // Signature lines
  const sigY = y;
  doc.setDrawColor(153, 69, 255);
  doc.setLineWidth(0.5);
  doc.line(ML, sigY, ML + 74, sigY);
  doc.line(W - MR - 54, sigY, W - MR, sigY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Creator / Channel Name", ML, sigY + 4.5);
  doc.text("Date of Report", W - MR - 54, sigY + 4.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text(creator, ML, sigY + 9);
  doc.text(today, W - MR - 54, sigY + 9);

  // ── FOOTER ────────────────────────────────────────────

  const FOOTER_Y = 289;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.25);
  doc.line(ML, FOOTER_Y - 5, W - MR, FOOTER_Y - 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text("Generated by VidChain  •  vidchain.app  •  Powered by Solana Blockchain", ML, FOOTER_Y);
  doc.text(
    "This certificate is evidence of blockchain registration, not a legal copyright guarantee.",
    W - MR, FOOTER_Y, { align: "right" }
  );

  // ── SAVE ──────────────────────────────────────────────

  const filename = `VidChain-Certificate-${proof.title.replace(/[^a-z0-9]/gi, "_").slice(0, 30)}-${proof.id.slice(0, 8)}.pdf`;
  doc.save(filename);
}
