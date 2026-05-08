import type { Proof } from "@/shared/schemas";
import { formatWallet } from "@/lib/utils";

export type PdfReportOptions = {
  proof: Proof;
  channelName: string;
  platformUrl?: string;
  originalVideoUrl?: string;
};

function short(value: string, front = 18, back = 10) {
  return value.length > front + back ? `${value.slice(0, front)}...${value.slice(-back)}` : value;
}

function isMockSig(sig: string) {
  return sig.startsWith("demo_") || sig.startsWith("mock_");
}

export async function downloadProofReport(opts: PdfReportOptions): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const { proof, channelName, platformUrl, originalVideoUrl } = opts;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const width = 210;
  const margin = 18;
  const content = width - margin * 2;
  const explorer = isMockSig(proof.solanaSignature)
    ? "Demo transaction - no on-chain record"
    : `https://explorer.solana.com/tx/${proof.solanaSignature}?cluster=devnet`;
  const verificationUrl = `https://vidchain.app/certificate/${proof.id}`;
  const creator = channelName || proof.creatorHandle || formatWallet(proof.creatorWallet);
  const issuedAt = new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
  const registeredAt = new Date(proof.registeredAt).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" });

  doc.setFillColor(7, 10, 18);
  doc.rect(0, 0, width, 297, "F");
  doc.setFillColor(20, 241, 149);
  doc.rect(0, 0, 4, 297, "F");
  doc.setFillColor(124, 58, 237);
  doc.rect(4, 0, 1.5, 297, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(240, 240, 245);
  doc.text("VidChain", margin, 24);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(135, 150, 165);
  doc.text("Solana-registered creator attribution certificate", margin, 30);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(20, 241, 149);
  doc.text("REGISTERED ON SOLANA", width - margin, 23, { align: "right" });
  doc.setTextColor(171, 159, 242);
  doc.text("PROTECTED", width - margin, 30, { align: "right" });

  doc.setDrawColor(20, 241, 149);
  doc.setLineWidth(0.35);
  doc.roundedRect(margin, 44, content, 178, 6, 6, "S");
  doc.setFillColor(13, 17, 28);
  doc.roundedRect(margin + 2, 46, content - 4, 174, 5, 5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.text("Proof Certificate", margin + 12, 66);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(150, 160, 178);
  doc.text(`Certificate ID: VC-${proof.id.slice(-10).toUpperCase()}`, margin + 12, 73);
  doc.text(`Issued: ${issuedAt}`, margin + 12, 79);

  doc.setFillColor(20, 241, 149);
  doc.roundedRect(width - margin - 44, 58, 30, 30, 3, 3, "F");
  doc.setFillColor(7, 10, 18);
  doc.rect(width - margin - 39, 63, 4, 4, "F");
  doc.rect(width - margin - 24, 63, 4, 4, "F");
  doc.rect(width - margin - 39, 78, 4, 4, "F");
  doc.rect(width - margin - 31, 70, 3, 3, "F");
  doc.rect(width - margin - 22, 76, 3, 3, "F");

  const rows = [
    ["Creator", creator],
    ["Proof ID", proof.id],
    ["Registered Date", registeredAt],
    ["Creator Wallet", proof.creatorWallet],
    ["SHA-256 Hash", proof.sha256],
    ["Fingerprint Root", proof.fingerprintRoot],
    ["Transaction", short(proof.solanaSignature, 26, 14)],
    ["Verification URL", verificationUrl],
    ["Original URL", originalVideoUrl || "Not provided"],
    ["Platform", platformUrl || "Not provided"],
  ];

  let y = 102;
  rows.forEach(([label, value], index) => {
    const left = index % 2 === 0;
    const x = left ? margin + 12 : margin + 91;
    if (left && index > 0) y += 22;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(103, 232, 249);
    doc.text(label.toUpperCase(), x, y);
    doc.setFont("courier", "normal");
    doc.setFontSize(value.length > 44 ? 7 : 8);
    doc.setTextColor(232, 236, 244);
    const lines = doc.splitTextToSize(value, 70) as string[];
    doc.text(lines.slice(0, 2), x, y + 6);
  });

  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.15);
  doc.line(margin + 12, 197, width - margin - 12, 197);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(150, 160, 178);
  doc.text("This document is timestamped evidence of blockchain registration. It is not a legal copyright guarantee.", margin + 12, 207);
  doc.text(`Explorer: ${explorer}`, margin + 12, 214);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(20, 241, 149);
  doc.text("Verification footer", margin, 246);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(135, 150, 165);
  doc.text(`Generated ${issuedAt} by VidChain. Verify at ${verificationUrl}`, margin, 254);
  doc.text("All hashes are displayed exactly as stored in the VidChain proof record.", margin, 260);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(44);
  doc.setTextColor(20, 241, 149);
  doc.text("VERIFIED", width / 2, 283, { align: "center" });

  const filename = `VidChain-Certificate-${proof.title.replace(/[^a-z0-9]/gi, "_").slice(0, 30)}-${proof.id.slice(0, 8)}.pdf`;
  doc.save(filename);
}
