import { LicenseCertificateView } from "@/features/market/license-certificate-view";

export const metadata = { title: "License Certificate — VidChain" };

export default function LicensePage({ params }: { params: { id: string } }) {
  return <LicenseCertificateView id={params.id} />;
}
