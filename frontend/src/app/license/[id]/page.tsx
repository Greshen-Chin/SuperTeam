import { LicenseCertificateView } from "@/features/market/license-certificate-view";

export const metadata = { title: "License Certificate — VidChain" };

export default async function LicensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LicenseCertificateView id={id} />;
}
